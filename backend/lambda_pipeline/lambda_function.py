"""
AXIS — Lambda #2: Bedrock Pipeline (Updated v2)
Deploy to: axis-pipeline
Runtime: Python 3.12
Timeout: 300 seconds (5 minutes) ← CRITICAL, must set this
Role: axis-lambda-role
Memory: 512 MB recommended
"""

import json
import boto3
import uuid
import time

# AWS clients
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# ⚠️ CHANGE THIS to your actual bucket name
BUCKET_NAME = 'axis-interviews-YOURTEAMNAME'

# Model ID — do not change
MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
BACKUP_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0'

# ============================================================
# PASTE ALL 6 PROMPTS HERE FROM prompts/all_prompts.py
# ============================================================
SYNTHESIS_PROMPT = """[PASTE SYNTHESIS_PROMPT HERE]"""
TEXAS_PROMPT = """[PASTE TEXAS_PROMPT HERE]"""
QUESTIONS_PROMPT = """[PASTE QUESTIONS_PROMPT HERE]"""
GAPS_PROMPT = """[PASTE GAPS_PROMPT HERE]"""
ASSEMBLY_PROMPT = """[PASTE ASSEMBLY_PROMPT HERE]"""
SCHEMA_PROMPT = """[PASTE SCHEMA_PROMPT HERE]"""


def call_bedrock(prompt, temperature=0.3, max_tokens=4000):
    """Call Bedrock with fallback to backup model"""
    for model_id in [MODEL_ID, BACKUP_MODEL_ID]:
        try:
            response = bedrock.invoke_model(
                modelId=model_id,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": [{"role": "user", "content": prompt}]
                })
            )
            result = json.loads(response['body'].read())
            return result['content'][0]['text']
        except Exception as e:
            print(f"Bedrock error with {model_id}: {str(e)}")
            if model_id == BACKUP_MODEL_ID:
                return f"Error calling Bedrock: {str(e)}"
            continue


def fill_prompt(template, replacements):
    """Replace {{PLACEHOLDER}} tokens in prompt templates"""
    result = template
    for key, value in replacements.items():
        result = result.replace(f"{{{{{key}}}}}", str(value))
    return result


def get_institutional_memory(sector="general"):
    """Pull relevant past interview insights from DynamoDB"""
    try:
        table = dynamodb.Table('axis-institutional-memory')
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('sector').eq(sector),
            Limit=3
        )
        if response.get('Items'):
            return json.dumps(response['Items'], default=str)
    except Exception as e:
        print(f"Institutional memory error: {str(e)}")
    return "No past interviews in this sector yet. This is a fresh start."


def extract_facts_for_interviewee(brief_text, n=5):
    """Extract the 5 key facts from the brief for the interviewee microsite"""
    try:
        # Parse from the interviewee packet section
        if "===INTERVIEWEE_PACKET===" in brief_text:
            packet = brief_text.split("===INTERVIEWEE_PACKET===")[1]
            # Find bullet points
            lines = packet.split('\n')
            facts = [l.strip().lstrip('- •*').strip() 
                    for l in lines 
                    if l.strip().startswith(('-', '•', '*')) and len(l.strip()) > 20]
            return facts[:n]
    except:
        pass
    return []


def extract_interviewee_questions(questions_json):
    """Extract the 5 interviewee questions from questions JSON"""
    try:
        data = json.loads(questions_json)
        return [q.get('text', q) if isinstance(q, dict) else q 
                for q in data.get('interviewee_questions', [])][:5]
    except:
        return []


def save_to_s3(interview_id, content, filename):
    """Save content to S3"""
    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=f'{interview_id}/{filename}',
            Body=content,
            ContentType='text/plain'
        )
        return True
    except Exception as e:
        print(f"S3 save error: {str(e)}")
        return False


def save_to_dynamodb(item):
    """Save interview metadata to DynamoDB"""
    try:
        table = dynamodb.Table('axis-interviews')
        table.put_item(Item=item)
        return True
    except Exception as e:
        print(f"DynamoDB save error: {str(e)}")
        return False


def lambda_handler(event, context):
    # Parse input from API Gateway or direct invocation
    if 'body' in event:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
    else:
        body = event

    company_name = body.get('company_name', '').strip()
    scraped_content = body.get('scraped_content', '')
    tamu_notes = body.get('tamu_notes', 'No proprietary notes provided.')

    if not company_name:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'company_name is required'})
        }

    interview_id = str(uuid.uuid4())[:8].upper()
    start_time = time.time()

    print(f"[{interview_id}] Starting AXIS pipeline for: {company_name}")

    # ── CALL 1: Research Synthesis ──────────────────────────
    print(f"[{interview_id}] Call 1: Synthesis...")
    profile = call_bedrock(
        fill_prompt(SYNTHESIS_PROMPT, {
            "SCRAPED_CONTENT": scraped_content,
            "TAMU_UPLOADED_NOTES": tamu_notes
        }),
        temperature=0.2,
        max_tokens=3000
    )

    # Detect sector from profile for institutional memory lookup
    sector = "general"
    for s in ["energy", "agriculture", "agtech", "defense", "aerospace",
              "healthcare", "financial", "technology", "manufacturing",
              "retail", "logistics", "real estate"]:
        if s in profile.lower():
            sector = s
            break

    # ── CALL 2: Texas Context ────────────────────────────────
    print(f"[{interview_id}] Call 2: Texas Context (sector: {sector})...")
    memory = get_institutional_memory(sector)
    texas = call_bedrock(
        fill_prompt(TEXAS_PROMPT, {
            "OUTPUT_FROM_CALL_1": profile,
            "INSTITUTIONAL_MEMORY": memory
        }),
        temperature=0.2,
        max_tokens=2000
    )

    # ── CALL 3: Questions ────────────────────────────────────
    print(f"[{interview_id}] Call 3: Questions...")
    questions = call_bedrock(
        fill_prompt(QUESTIONS_PROMPT, {
            "OUTPUT_FROM_CALL_1": profile,
            "OUTPUT_FROM_CALL_2": texas
        }),
        temperature=0.7,
        max_tokens=4000
    )

    # ── CALL 4: Knowledge Gaps ───────────────────────────────
    print(f"[{interview_id}] Call 4: Knowledge Gaps...")
    gaps = call_bedrock(
        fill_prompt(GAPS_PROMPT, {
            "OUTPUT_FROM_CALL_1": profile,
            "OUTPUT_FROM_CALL_2": texas
        }),
        temperature=0.2,
        max_tokens=2000
    )

    # ── CALL 5: Final Assembly ───────────────────────────────
    print(f"[{interview_id}] Call 5: Assembly...")
    final_brief = call_bedrock(
        fill_prompt(ASSEMBLY_PROMPT, {
            "OUTPUT_FROM_CALL_1": profile,
            "OUTPUT_FROM_CALL_2": texas,
            "OUTPUT_FROM_CALL_3": questions,
            "OUTPUT_FROM_CALL_4": gaps
        }),
        temperature=0.4,
        max_tokens=6000
    )

    # ── CALL 6: Texas Insights Schema (Document 4) ──────────
    print(f"[{interview_id}] Call 6: Intelligence Schema...")
    schema_raw = call_bedrock(
        fill_prompt(SCHEMA_PROMPT, {
            "OUTPUT_FROM_CALL_1": profile,
            "OUTPUT_FROM_CALL_2": texas,
            "OUTPUT_FROM_CALL_4": gaps
        }),
        temperature=0.2,
        max_tokens=2000
    )
    try:
        import re as _re
        schema_text = schema_raw
        json_match = _re.search(r'\{.*\}', schema_raw, _re.DOTALL)
        schema = json.loads(json_match.group()) if json_match else {}
    except:
        schema = {}

    # ── Split brief and interviewee email ───────────────────
    interviewer_brief = final_brief
    interviewee_email = ""
    if "===INTERVIEWEE_EMAIL===" in final_brief:
        parts = final_brief.split("===INTERVIEWEE_EMAIL===")
        interviewer_brief = parts[0].strip()
        interviewee_email = parts[1].strip()
    elif "===INTERVIEWEE_PACKET===" in final_brief:
        parts = final_brief.split("===INTERVIEWEE_PACKET===")
        interviewer_brief = parts[0].strip()
        interviewee_email = parts[1].strip()

    # ── Save to S3 ───────────────────────────────────────────
    save_to_s3(interview_id, interviewer_brief, 'interviewer_brief.txt')
    save_to_s3(interview_id, interviewee_email, 'interviewee_email.txt')
    save_to_s3(interview_id, profile, 'raw_profile.json')
    save_to_s3(interview_id, questions, 'questions.json')
    save_to_s3(interview_id, gaps, 'gaps.json')
    save_to_s3(interview_id, json.dumps(schema, indent=2), 'schema.json')

    # ── Save to DynamoDB ─────────────────────────────────────
    elapsed = round(time.time() - start_time, 1)
    save_to_dynamodb({
        'interview_id': interview_id,
        'company_name': company_name,
        'sector': sector,
        'created_at': str(int(time.time())),
        'elapsed_seconds': str(elapsed),
        'status': 'brief_ready',
        'brief_s3_key': f'{interview_id}/interviewer_brief.txt',
        'email_s3_key': f'{interview_id}/interviewee_email.txt',
        'schema_s3_key': f'{interview_id}/schema.json',
        'questions_s3_key': f'{interview_id}/questions.json',
        'schema_preview': schema,
        'post_interview_debrief': {},
        'debrief_completed': False
    })

    print(f"[{interview_id}] Pipeline complete in {elapsed}s")

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'interview_id': interview_id,
            'company_name': company_name,
            'sector': sector,
            'brief': interviewer_brief,
            'interviewee_email': interviewee_email,
            'schema': schema,
            'elapsed_seconds': elapsed
        })
    }

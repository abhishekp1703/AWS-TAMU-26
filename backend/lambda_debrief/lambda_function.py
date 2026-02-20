"""
AXIS — Lambda: Get Brief + Post-Interview Debrief (Updated v2)
Handles:
  GET  /brief/{id}    → returns full interview data for dashboard
  POST /debrief/{id}  → saves post-interview debrief + feeds institutional memory

Deploy to: axis-get-brief
Runtime: Python 3.12
Timeout: 30 seconds
Role: axis-lambda-role
"""

import json
import boto3
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')

# ⚠️ CHANGE THIS to your actual bucket name
BUCKET_NAME = 'axis-interviews-YOURTEAMNAME'


def get_s3_content(key):
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        return response['Body'].read().decode('utf-8')
    except Exception as e:
        return f"Could not load: {str(e)}"


def handle_get(interview_id):
    """Return full interview data for the interviewer dashboard"""
    try:
        table = dynamodb.Table('axis-interviews')
        response = table.get_item(Key={'interview_id': interview_id})
        item = response.get('Item', {})

        if not item:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Interview not found'})
            }

        brief = get_s3_content(item['brief_s3_key']) if item.get('brief_s3_key') else ''
        interviewee_email = get_s3_content(item['email_s3_key']) if item.get('email_s3_key') else ''

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'interview_id': interview_id,
                'company_name': item.get('company_name', ''),
                'sector': item.get('sector', ''),
                'status': item.get('status', ''),
                'created_at': item.get('created_at', ''),
                'elapsed_seconds': item.get('elapsed_seconds', ''),
                'brief': brief,
                'interviewee_email': interviewee_email,
                'schema': item.get('schema_preview', {}),
                'debrief_completed': item.get('debrief_completed', False),
                'post_interview_debrief': item.get('post_interview_debrief', {})
            }, default=str)
        }

    except Exception as e:
        print(f"GET error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }


def handle_post_debrief(interview_id, body):
    """
    Save post-interview debrief and feed institutional memory.
    Interviewer fills this in 3 minutes after the call.
    Feeds the Texas A&M knowledge graph for future interviewers.
    """
    try:
        completed_schema = body.get('completed_schema', {})
        what_ai_got_wrong = body.get('what_ai_got_wrong', '')
        key_insights = body.get('key_insights', '')
        questions_that_worked = body.get('questions_that_worked', [])
        surprises = body.get('surprises', '')
        sector = body.get('sector', 'general')
        company_name = body.get('company_name', '')

        # Update interview record
        table = dynamodb.Table('axis-interviews')
        table.update_item(
            Key={'interview_id': interview_id},
            UpdateExpression="""
                SET #status = :status,
                    post_interview_debrief = :debrief,
                    debrief_completed = :completed,
                    debriefed_at = :timestamp
            """,
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'interview_completed',
                ':debrief': {
                    'completed_schema': completed_schema,
                    'what_ai_got_wrong': what_ai_got_wrong,
                    'key_insights': key_insights,
                    'questions_that_worked': questions_that_worked,
                    'surprises': surprises
                },
                ':completed': True,
                ':timestamp': str(int(time.time()))
            }
        )

        # Save to institutional memory for future interviews in same sector
        if sector and key_insights:
            memory_table = dynamodb.Table('axis-institutional-memory')
            memory_table.put_item(Item={
                'sector': sector,
                'interview_id': interview_id,
                'company_name': company_name,
                'key_insights': key_insights,
                'what_ai_got_wrong': what_ai_got_wrong,
                'questions_that_worked': questions_that_worked,
                'surprises': surprises,
                'created_at': str(int(time.time()))
            })
            print(f"Institutional memory saved for sector: {sector}")

        # Save completed schema to S3
        try:
            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=f'{interview_id}/completed_schema.json',
                Body=json.dumps(completed_schema, indent=2).encode('utf-8'),
                ContentType='application/json'
            )
        except Exception as e:
            print(f"Schema S3 save error: {str(e)}")

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'message': 'Debrief saved. Insights added to Texas A&M knowledge graph.',
                'interview_id': interview_id
            })
        }

    except Exception as e:
        print(f"POST debrief error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }


def lambda_handler(event, context):
    interview_id = None
    if 'pathParameters' in event and event['pathParameters']:
        interview_id = event['pathParameters'].get('id')

    if not interview_id:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'interview_id is required'})
        }

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        return handle_get(interview_id)
    elif method == 'POST':
        body = {}
        if event.get('body'):
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        return handle_post_debrief(interview_id, body)

    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }

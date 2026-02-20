"""
AXIS — Lambda #4: Get Brief + Status
Deploy to: axis-get-brief
Runtime: Python 3.12
Timeout: 30 seconds
Role: axis-lambda-role

This handles GET /brief/{id} — used by both the interviewer dashboard
and the interviewee microsite to load their data.
"""

import json
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')

# ⚠️ CHANGE THIS
BUCKET_NAME = 'axis-interviews-YOURTEAMNAME'


def get_s3_content(key):
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        return response['Body'].read().decode('utf-8')
    except Exception as e:
        return f"Could not load: {str(e)}"


def lambda_handler(event, context):
    # Get interview_id from path
    interview_id = None
    if 'pathParameters' in event and event['pathParameters']:
        interview_id = event['pathParameters'].get('id')

    if not interview_id:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'interview_id is required'})
        }

    print(f"Loading brief for interview: {interview_id}")

    try:
        # Get metadata from DynamoDB
        table = dynamodb.Table('axis-interviews')
        response = table.get_item(Key={'interview_id': interview_id})
        item = response.get('Item', {})

        if not item:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Interview not found'})
            }

        # Load brief from S3
        brief = ""
        if item.get('brief_s3_key'):
            brief = get_s3_content(item['brief_s3_key'])

        # Build response
        result = {
            'interview_id': interview_id,
            'company_name': item.get('company_name', ''),
            'status': item.get('status', 'pending'),
            'created_at': item.get('created_at', ''),
            'brief': brief,
            # Interviewee microsite data
            'facts': item.get('interviewee_facts', []),
            'interviewee_questions': item.get('interviewee_questions', []),
            # Interviewee response data (shown to interviewer after response)
            'interviewee_corrections': item.get('interviewee_corrections', []),
            'interviewee_selected_questions': item.get('interviewee_selected_questions', []),
            'interviewee_wildcard': item.get('interviewee_wildcard', ''),
            'responded_at': item.get('responded_at', '')
        }

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result, default=str)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

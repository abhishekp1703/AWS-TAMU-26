"""
AXIS — Lambda #3: Interviewee Response Handler
Deploy to: axis-interviewee
Runtime: Python 3.12
Timeout: 30 seconds
Role: axis-lambda-role
"""

import json
import boto3
import time
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')


def lambda_handler(event, context):
    # Parse input
    if 'body' in event:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
    else:
        body = event

    # Get interview_id from path parameters
    interview_id = None
    if 'pathParameters' in event and event['pathParameters']:
        interview_id = event['pathParameters'].get('id')
    if not interview_id:
        interview_id = body.get('interview_id')

    if not interview_id:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'interview_id is required'})
        }

    corrections = body.get('corrections', [])
    selected_questions = body.get('selected_questions', [])
    wildcard = body.get('wildcard', '')

    print(f"Saving interviewee response for interview: {interview_id}")

    try:
        table = dynamodb.Table('axis-interviews')
        table.update_item(
            Key={'interview_id': interview_id},
            UpdateExpression="""
                SET #status = :status,
                    interviewee_corrections = :corrections,
                    interviewee_selected_questions = :questions,
                    interviewee_wildcard = :wildcard,
                    responded_at = :timestamp
            """,
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'interviewee_responded',
                ':corrections': corrections,
                ':questions': selected_questions,
                ':wildcard': wildcard,
                ':timestamp': str(int(time.time()))
            }
        )

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': True,
                'interview_id': interview_id,
                'message': 'Response saved. The interviewer has been notified.'
            })
        }

    except Exception as e:
        print(f"Error saving response: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

"""
Configuration management for AXIS Lambda functions.
Uses environment variables with sensible defaults.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
AWS_ACCOUNT_ID = os.getenv('AWS_ACCOUNT_ID', '')

# S3 Configuration
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'axis-interviews-YOURTEAMNAME')
S3_BUCKET_REGION = os.getenv('S3_BUCKET_REGION', AWS_REGION)

# DynamoDB Tables
DYNAMODB_INTERVIEWS_TABLE = os.getenv('DYNAMODB_INTERVIEWS_TABLE', 'axis-interviews')
DYNAMODB_MEMORY_TABLE = os.getenv('DYNAMODB_MEMORY_TABLE', 'axis-institutional-memory')

# Bedrock Configuration
BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
BEDROCK_BACKUP_MODEL_ID = os.getenv('BEDROCK_BACKUP_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
BEDROCK_REGION = os.getenv('BEDROCK_REGION', AWS_REGION)

# Application Configuration
APP_ENV = os.getenv('APP_ENV', 'production')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
ENABLE_XRAY = os.getenv('ENABLE_XRAY', 'true').lower() == 'true'

# CORS Configuration
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')

# Lambda Configuration
LAMBDA_TIMEOUT_PIPELINE = int(os.getenv('LAMBDA_TIMEOUT_PIPELINE', '300'))
LAMBDA_TIMEOUT_SCRAPER = int(os.getenv('LAMBDA_TIMEOUT_SCRAPER', '30'))
LAMBDA_TIMEOUT_DEBRIEF = int(os.getenv('LAMBDA_TIMEOUT_DEBRIEF', '30'))
LAMBDA_MEMORY_PIPELINE = int(os.getenv('LAMBDA_MEMORY_PIPELINE', '512'))

# Bedrock Configuration
BEDROCK_MAX_TOKENS_SYNTHESIS = int(os.getenv('BEDROCK_MAX_TOKENS_SYNTHESIS', '3000'))
BEDROCK_MAX_TOKENS_QUESTIONS = int(os.getenv('BEDROCK_MAX_TOKENS_QUESTIONS', '4000'))
BEDROCK_MAX_TOKENS_ASSEMBLY = int(os.getenv('BEDROCK_MAX_TOKENS_ASSEMBLY', '6000'))
BEDROCK_MAX_TOKENS_DEFAULT = int(os.getenv('BEDROCK_MAX_TOKENS_DEFAULT', '2000'))

# Scraper Configuration
SCRAPER_MAX_CHARS = int(os.getenv('SCRAPER_MAX_CHARS', '3000'))
SCRAPER_TIMEOUT = int(os.getenv('SCRAPER_TIMEOUT', '10'))


def get_cors_headers(origin: Optional[str] = None) -> dict:
    """Get CORS headers based on allowed origins."""
    if origin and origin in ALLOWED_ORIGINS:
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Max-Age': '3600'
        }
    elif '*' in ALLOWED_ORIGINS:
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Max-Age': '3600'
        }
    else:
        return {
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Max-Age': '3600'
        }


def validate_config() -> bool:
    """Validate that required configuration is present."""
    errors = []
    
    if not S3_BUCKET_NAME or 'YOURTEAMNAME' in S3_BUCKET_NAME:
        errors.append("S3_BUCKET_NAME must be set to a valid bucket name")
    
    if not AWS_ACCOUNT_ID:
        logger.warning("AWS_ACCOUNT_ID not set - some features may not work")
    
    if errors:
        for error in errors:
            logger.error(f"Configuration error: {error}")
        return False
    
    return True

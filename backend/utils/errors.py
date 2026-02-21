"""
Custom exception classes and error handling utilities for AXIS.
"""
from typing import Dict, Any, Optional
import json
try:
    from config import get_cors_headers
except ImportError:
    # Fallback for when running as standalone
    def get_cors_headers(origin: Optional[str] = None) -> dict:
        return {
            'Access-Control-Allow-Origin': origin or '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Max-Age': '3600'
        }


class AXISError(Exception):
    """Base exception for AXIS errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = 'INTERNAL_ERROR'):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(AXISError):
    """Raised when input validation fails."""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message, status_code=400, error_code='VALIDATION_ERROR')
        self.field = field


class NotFoundError(AXISError):
    """Raised when a resource is not found."""
    def __init__(self, message: str = 'Resource not found'):
        super().__init__(message, status_code=404, error_code='NOT_FOUND')


class BedrockError(AXISError):
    """Raised when Bedrock API calls fail."""
    def __init__(self, message: str):
        super().__init__(message, status_code=503, error_code='BEDROCK_ERROR')


class S3Error(AXISError):
    """Raised when S3 operations fail."""
    def __init__(self, message: str):
        super().__init__(message, status_code=503, error_code='S3_ERROR')


class DynamoDBError(AXISError):
    """Raised when DynamoDB operations fail."""
    def __init__(self, message: str):
        super().__init__(message, status_code=503, error_code='DYNAMODB_ERROR')


def create_error_response(
    error: Exception,
    origin: Optional[str] = None,
    interview_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a standardized error response."""
    if isinstance(error, AXISError):
        status_code = error.status_code
        error_code = error.error_code
        message = error.message
    else:
        status_code = 500
        error_code = 'INTERNAL_ERROR'
        message = 'An internal error occurred'
    
    headers = get_cors_headers(origin)
    headers['Content-Type'] = 'application/json'
    
    response_body = {
        'error': {
            'code': error_code,
            'message': message,
            'type': type(error).__name__
        }
    }
    
    if interview_id:
        response_body['error']['interview_id'] = interview_id
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(response_body)
    }


def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """Validate that required fields are present in data."""
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            field=missing_fields[0] if len(missing_fields) == 1 else None
        )


def sanitize_input(text: str, max_length: int = 10000) -> str:
    """Sanitize user input to prevent injection attacks."""
    if not isinstance(text, str):
        raise ValidationError("Input must be a string")
    
    if len(text) > max_length:
        raise ValidationError(f"Input exceeds maximum length of {max_length} characters")
    
    # Remove null bytes and control characters (except newlines and tabs)
    sanitized = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
    
    return sanitized.strip()

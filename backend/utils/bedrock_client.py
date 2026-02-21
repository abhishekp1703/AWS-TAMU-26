"""
Bedrock client wrapper with retry logic and error handling.
"""
import json
import time
import boto3
from typing import Optional, Dict, Any
from botocore.exceptions import ClientError

try:
    from config import BEDROCK_MODEL_ID, BEDROCK_BACKUP_MODEL_ID, BEDROCK_REGION
    from utils.logger import StructuredLogger
    from utils.errors import BedrockError
except ImportError:
    # Fallback for when running as standalone
    import os
    BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
    BEDROCK_BACKUP_MODEL_ID = os.getenv('BEDROCK_BACKUP_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
    BEDROCK_REGION = os.getenv('BEDROCK_REGION', 'us-east-1')
    from utils.logger import StructuredLogger
    from utils.errors import BedrockError


class BedrockClient:
    """Wrapper for Bedrock API calls with retry logic."""
    
    def __init__(self, region: str = BEDROCK_REGION):
        self.client = boto3.client('bedrock-runtime', region_name=region)
        self.primary_model = BEDROCK_MODEL_ID
        self.backup_model = BEDROCK_BACKUP_MODEL_ID
    
    def invoke_model(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 4000,
        interview_id: Optional[str] = None,
        call_name: Optional[str] = None
    ) -> str:
        """
        Invoke Bedrock model with automatic fallback.
        
        Args:
            prompt: The prompt to send to the model
            temperature: Temperature setting (0.0-1.0)
            max_tokens: Maximum tokens to generate
            interview_id: Optional interview ID for logging
            call_name: Optional name of the call (e.g., "Call 1: Synthesis")
        
        Returns:
            Generated text from the model
        
        Raises:
            BedrockError: If all model invocations fail
        """
        models = [self.primary_model, self.backup_model]
        last_error = None
        
        for model_id in models:
            try:
                StructuredLogger.info(
                    f"Invoking Bedrock model: {model_id}",
                    interview_id=interview_id,
                    extra={'call_name': call_name, 'model_id': model_id}
                )
                
                start_time = time.time()
                response = self.client.invoke_model(
                    modelId=model_id,
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "messages": [{"role": "user", "content": prompt}]
                    })
                )
                
                result = json.loads(response['body'].read())
                text = result['content'][0]['text']
                duration = time.time() - start_time
                
                StructuredLogger.info(
                    f"Bedrock call successful",
                    interview_id=interview_id,
                    extra={
                        'call_name': call_name,
                        'model_id': model_id,
                        'duration_seconds': duration,
                        'output_length': len(text)
                    }
                )
                
                return text
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                last_error = e
                
                StructuredLogger.warning(
                    f"Bedrock call failed with {model_id}",
                    interview_id=interview_id,
                    extra={
                        'call_name': call_name,
                        'model_id': model_id,
                        'error_code': error_code,
                        'error_message': error_message
                    }
                )
                
                # If this was the backup model, we're out of options
                if model_id == self.backup_model:
                    break
                
                # Wait a bit before trying backup
                time.sleep(1)
                continue
                
            except Exception as e:
                last_error = e
                StructuredLogger.error(
                    f"Unexpected error calling Bedrock",
                    error=e,
                    interview_id=interview_id,
                    extra={'call_name': call_name, 'model_id': model_id}
                )
                
                if model_id == self.backup_model:
                    break
                time.sleep(1)
                continue
        
        # All models failed
        error_msg = f"All Bedrock models failed. Last error: {str(last_error)}"
        StructuredLogger.error(
            error_msg,
            error=last_error if isinstance(last_error, Exception) else None,
            interview_id=interview_id,
            extra={'call_name': call_name}
        )
        raise BedrockError(error_msg)


# Global instance
bedrock_client = BedrockClient()

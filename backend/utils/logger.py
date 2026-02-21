"""
Centralized logging utility for AXIS Lambda functions.
"""
import json
import logging
import traceback
from typing import Any, Dict, Optional
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class StructuredLogger:
    """Structured logger for better CloudWatch Logs Insights queries."""
    
    @staticmethod
    def _format_log(
        level: str,
        message: str,
        interview_id: Optional[str] = None,
        company_name: Optional[str] = None,
        error: Optional[Exception] = None,
        extra: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Format log entry as structured JSON."""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            'service': 'axis'
        }
        
        if interview_id:
            log_entry['interview_id'] = interview_id
        if company_name:
            log_entry['company_name'] = company_name
        if error:
            log_entry['error'] = {
                'type': type(error).__name__,
                'message': str(error),
                'traceback': traceback.format_exc()
            }
        if extra:
            log_entry.update(extra)
        
        return log_entry
    
    @staticmethod
    def info(
        message: str,
        interview_id: Optional[str] = None,
        company_name: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        """Log info message."""
        log_entry = StructuredLogger._format_log('INFO', message, interview_id, company_name, extra=extra)
        logger.info(json.dumps(log_entry))
    
    @staticmethod
    def warning(
        message: str,
        interview_id: Optional[str] = None,
        company_name: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        """Log warning message."""
        log_entry = StructuredLogger._format_log('WARNING', message, interview_id, company_name, extra=extra)
        logger.warning(json.dumps(log_entry))
    
    @staticmethod
    def error(
        message: str,
        error: Optional[Exception] = None,
        interview_id: Optional[str] = None,
        company_name: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        """Log error message."""
        log_entry = StructuredLogger._format_log('ERROR', message, interview_id, company_name, error, extra)
        logger.error(json.dumps(log_entry))
    
    @staticmethod
    def debug(
        message: str,
        interview_id: Optional[str] = None,
        company_name: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        """Log debug message."""
        log_entry = StructuredLogger._format_log('DEBUG', message, interview_id, company_name, extra=extra)
        logger.debug(json.dumps(log_entry))


def log_lambda_start(function_name: str, event: Dict[str, Any]) -> None:
    """Log Lambda function invocation start."""
    StructuredLogger.info(
        f"Lambda {function_name} invoked",
        extra={
            'function_name': function_name,
            'event_keys': list(event.keys()) if isinstance(event, dict) else []
        }
    )


def log_lambda_end(function_name: str, duration: float, status: str = 'success') -> None:
    """Log Lambda function invocation end."""
    StructuredLogger.info(
        f"Lambda {function_name} completed",
        extra={
            'function_name': function_name,
            'duration_seconds': duration,
            'status': status
        }
    )

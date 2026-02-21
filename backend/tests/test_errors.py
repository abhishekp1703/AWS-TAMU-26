"""
Unit tests for error handling utilities.
"""
import pytest
from backend.utils.errors import (
    ValidationError,
    NotFoundError,
    BedrockError,
    validate_required_fields,
    sanitize_input,
    create_error_response
)


def test_validation_error():
    """Test ValidationError exception."""
    error = ValidationError("Test error", field="test_field")
    assert error.status_code == 400
    assert error.error_code == 'VALIDATION_ERROR'
    assert error.field == "test_field"


def test_not_found_error():
    """Test NotFoundError exception."""
    error = NotFoundError("Resource not found")
    assert error.status_code == 404
    assert error.error_code == 'NOT_FOUND'


def test_bedrock_error():
    """Test BedrockError exception."""
    error = BedrockError("Bedrock failed")
    assert error.status_code == 503
    assert error.error_code == 'BEDROCK_ERROR'


def test_validate_required_fields_success():
    """Test successful field validation."""
    data = {"field1": "value1", "field2": "value2"}
    validate_required_fields(data, ["field1", "field2"])


def test_validate_required_fields_missing():
    """Test validation with missing fields."""
    data = {"field1": "value1"}
    with pytest.raises(ValidationError) as exc_info:
        validate_required_fields(data, ["field1", "field2"])
    assert "field2" in exc_info.value.message


def test_sanitize_input():
    """Test input sanitization."""
    text = "  Test input  \n\t"
    result = sanitize_input(text)
    assert result == "Test input"


def test_sanitize_input_too_long():
    """Test input sanitization with max length."""
    text = "a" * 10001
    with pytest.raises(ValidationError) as exc_info:
        sanitize_input(text, max_length=10000)
    assert "maximum length" in exc_info.value.message.lower()


def test_create_error_response():
    """Test error response creation."""
    error = ValidationError("Test error")
    response = create_error_response(error)
    
    assert response['statusCode'] == 400
    assert 'error' in response['body']
    assert 'Access-Control-Allow-Origin' in response['headers']

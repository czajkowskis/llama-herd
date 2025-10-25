"""
Centralized error handling for the application.
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

from .exceptions import (
    ValidationError, 
    NotFoundError, 
    ExperimentError, 
    ConversationError, 
    StorageError,
    AgentError
)
from ..utils.logging import get_logger

logger = get_logger(__name__)


def create_error_response(
    status_code: int,
    message: str,
    details: dict = None,
    error_type: str = None
) -> JSONResponse:
    """Create a standardized error response."""
    error_data = {
        "error": {
            "message": message,
            "type": error_type or "UnknownError"
        }
    }
    
    if details:
        error_data["error"]["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=error_data
    )


async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle FastAPI validation errors."""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return create_error_response(
        status_code=422,
        message="Request validation failed",
        details={"validation_errors": exc.errors()},
        error_type="ValidationError"
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP exception on {request.url}: {exc.detail}")
    return create_error_response(
        status_code=exc.status_code,
        message=exc.detail,
        error_type="HTTPException"
    )


async def validation_error_handler_custom(request: Request, exc: ValidationError):
    """Handle custom validation errors."""
    logger.warning(f"Custom validation error on {request.url}: {exc.message}")
    return create_error_response(
        status_code=400,
        message=exc.message,
        error_type="ValidationError"
    )


async def not_found_error_handler(request: Request, exc: NotFoundError):
    """Handle not found errors."""
    logger.info(f"Resource not found on {request.url}: {exc.message}")
    return create_error_response(
        status_code=404,
        message=exc.message,
        details={
            "resource_type": exc.resource_type,
            "resource_id": exc.resource_id
        },
        error_type="NotFoundError"
    )


async def experiment_error_handler(request: Request, exc: ExperimentError):
    """Handle experiment errors."""
    logger.error(f"Experiment error on {request.url}: {exc.message}")
    return create_error_response(
        status_code=500,
        message=exc.message,
        details={"experiment_id": getattr(exc, 'experiment_id', None)},
        error_type="ExperimentError"
    )


async def conversation_error_handler(request: Request, exc: ConversationError):
    """Handle conversation errors."""
    logger.error(f"Conversation error on {request.url}: {exc.message}")
    return create_error_response(
        status_code=500,
        message=exc.message,
        details={"conversation_id": getattr(exc, 'conversation_id', None)},
        error_type="ConversationError"
    )


async def storage_error_handler(request: Request, exc: StorageError):
    """Handle storage errors."""
    logger.error(f"Storage error on {request.url}: {exc.message}")
    return create_error_response(
        status_code=500,
        message=exc.message,
        details={
            "operation": exc.operation,
            "resource_id": getattr(exc, 'resource_id', None)
        },
        error_type="StorageError"
    )


async def agent_error_handler(request: Request, exc: AgentError):
    """Handle agent errors."""
    logger.error(f"Agent error on {request.url}: {exc.message}")
    return create_error_response(
        status_code=400,
        message=exc.message,
        error_type="AgentError"
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unexpected error on {request.url}: {str(exc)}")
    return create_error_response(
        status_code=500,
        message="An unexpected error occurred",
        error_type="InternalServerError"
    )


def register_error_handlers(app):
    """Register all error handlers with the FastAPI app."""
    # FastAPI built-in exceptions
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # Custom application exceptions
    app.add_exception_handler(ValidationError, validation_error_handler_custom)
    app.add_exception_handler(NotFoundError, not_found_error_handler)
    app.add_exception_handler(ExperimentError, experiment_error_handler)
    app.add_exception_handler(ConversationError, conversation_error_handler)
    app.add_exception_handler(StorageError, storage_error_handler)
    app.add_exception_handler(AgentError, agent_error_handler)
    
    # Generic exception handler (should be last)
    app.add_exception_handler(Exception, generic_exception_handler)

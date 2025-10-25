"""
Error handling utilities and decorators.
"""
import functools
from typing import Callable, Any
from fastapi import HTTPException
from ..core.exceptions import ExperimentError, ConversationError, StorageError
from ..utils.logging import get_logger

logger = get_logger(__name__)


def handle_common_errors(
    default_message: str = "An error occurred",
    log_errors: bool = True
):
    """
    Decorator to handle common error patterns in route handlers.
    
    Args:
        default_message: Default error message if no specific message is provided
        log_errors: Whether to log errors before re-raising
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                # Re-raise HTTPExceptions (they're already properly formatted)
                raise
            except (ExperimentError, ConversationError, StorageError) as e:
                # Re-raise custom exceptions (they'll be handled by global handlers)
                if log_errors:
                    logger.error(f"Error in {func.__name__}: {str(e)}")
                raise
            except Exception as e:
                # Handle unexpected errors
                if log_errors:
                    logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
                raise HTTPException(status_code=500, detail=default_message)
        return wrapper
    return decorator


def handle_ollama_errors(func: Callable) -> Callable:
    """
    Decorator specifically for handling Ollama-related errors.
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ollama error in {func.__name__}: {str(e)}")
            # Provide more specific error messages for common Ollama issues
            error_msg = str(e).lower()
            if "connection" in error_msg or "timeout" in error_msg:
                raise HTTPException(status_code=503, detail="Failed to connect to Ollama service")
            elif "not found" in error_msg:
                raise HTTPException(status_code=404, detail="Model not found")
            else:
                raise HTTPException(status_code=500, detail="Internal server error")
    return wrapper

"""
Structured logging utilities for LLaMa-Herd.
"""
import logging
import json
import sys
from datetime import datetime, UTC
from typing import Any, Dict, Optional
from contextvars import ContextVar

# Context variable to store experiment_id across async contexts
experiment_id_ctx: ContextVar[Optional[str]] = ContextVar('experiment_id', default=None)


class StructuredFormatter(logging.Formatter):
    """JSON structured log formatter."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data: Dict[str, Any] = {
            'timestamp': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
            'level': record.levelname,
            'module': record.module,
            'message': record.getMessage(),
        }
        
        # Add experiment_id if available in context
        experiment_id = experiment_id_ctx.get()
        if experiment_id:
            log_data['experiment_id'] = experiment_id
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add any extra fields passed to the logger
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)


class KeyValueFormatter(logging.Formatter):
    """Key=value structured log formatter for easier human reading."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as key=value pairs."""
        parts = [
            f"timestamp={datetime.now(UTC).isoformat().replace('+00:00', 'Z')}",
            f"level={record.levelname}",
            f"module={record.module}",
        ]
        
        # Add experiment_id if available in context
        experiment_id = experiment_id_ctx.get()
        if experiment_id:
            parts.append(f"experiment_id={experiment_id}")
        
        # Add message
        parts.append(f"message=\"{record.getMessage()}\"")
        
        # Add any extra fields
        if hasattr(record, 'extra_fields'):
            for key, value in record.extra_fields.items():
                parts.append(f"{key}={json.dumps(value)}")
        
        # Add exception info if present
        if record.exc_info:
            exc_text = self.formatException(record.exc_info).replace('\n', '\\n')
            parts.append(f"exception=\"{exc_text}\"")
        
        return ' '.join(parts)


def setup_logging(log_format: str = "json", level: str = "INFO") -> logging.Logger:
    """
    Set up structured logging.
    
    Args:
        log_format: Format type - 'json' or 'keyvalue'
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    
    # Set formatter based on format type
    if log_format.lower() == "json":
        formatter = StructuredFormatter()
    else:
        formatter = KeyValueFormatter()
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    return root_logger


def get_logger(name: str = __name__) -> logging.Logger:
    """
    Get a logger instance.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


def set_experiment_context(experiment_id: Optional[str]) -> None:
    """
    Set experiment_id in the current async context for logging.
    
    Args:
        experiment_id: Experiment ID to add to logs
    """
    experiment_id_ctx.set(experiment_id)


def log_with_context(logger_instance: logging.Logger, level: str, message: str, **extra_fields: Any) -> None:
    """
    Log with additional context fields.
    
    Args:
        logger_instance: Logger to use
        level: Log level (debug, info, warning, error, critical)
        message: Log message
        **extra_fields: Additional fields to include in the log
    """
    log_method = getattr(logger_instance, level.lower())
    
    # Create a log record with extra fields
    extra = {'extra_fields': extra_fields} if extra_fields else {}
    log_method(message, extra=extra)


# Initialize default logger
# Use keyvalue format by default for better readability in development
# Can be switched to JSON in production via environment variable
import os
log_format = os.getenv('LOG_FORMAT', 'keyvalue')
log_level = os.getenv('LOG_LEVEL', 'INFO')

setup_logging(log_format=log_format, level=log_level)
logger = get_logger(__name__)

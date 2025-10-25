"""
Configuration validation utilities.
"""
import os
from pathlib import Path
from typing import Union, List
from pydantic import field_validator


def validate_port(value: int) -> int:
    """Validate port number."""
    if not (1 <= value <= 65535):
        raise ValueError("Port must be between 1 and 65535")
    return value


def validate_timeout(value: int) -> int:
    """Validate timeout value."""
    if value <= 0:
        raise ValueError("Timeout must be positive")
    return value


def validate_temperature(value: float) -> float:
    """Validate temperature value."""
    if not (0.0 <= value <= 2.0):
        raise ValueError("Temperature must be between 0.0 and 2.0")
    return value


def validate_directory_path(value: str) -> str:
    """Validate and expand directory path."""
    expanded_path = os.path.expanduser(value)
    path = Path(expanded_path)
    
    # Create directory if it doesn't exist
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise ValueError(f"Cannot create directory {expanded_path}: {e}")
    
    return expanded_path


def validate_url(value: str) -> str:
    """Validate URL format."""
    if not value.startswith(('http://', 'https://')):
        raise ValueError("URL must start with http:// or https://")
    return value


def validate_comma_separated_list(value: Union[str, List[str]]) -> List[str]:
    """Parse comma-separated string into list."""
    if isinstance(value, str):
        return [x.strip() for x in value.split(',') if x.strip()]
    return value


def validate_positive_int(value: int) -> int:
    """Validate positive integer."""
    if value <= 0:
        raise ValueError("Value must be positive")
    return value


def validate_non_negative_int(value: int) -> int:
    """Validate non-negative integer."""
    if value < 0:
        raise ValueError("Value must be non-negative")
    return value


def validate_positive_float(value: float) -> float:
    """Validate positive float."""
    if value <= 0.0:
        raise ValueError("Value must be positive")
    return value


def validate_percentage(value: float) -> float:
    """Validate percentage value (0-100)."""
    if not (0.0 <= value <= 100.0):
        raise ValueError("Percentage must be between 0.0 and 100.0")
    return value


def validate_retention_time(value: int) -> int:
    """Validate retention time in seconds."""
    if value < 0:
        raise ValueError("Retention time must be non-negative")
    return value

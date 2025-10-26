"""
Configuration validation utilities.
"""
import os
from pathlib import Path
from typing import Union, List
from pydantic import field_validator


def validate_port(value: Union[int, str]) -> int:
    """Validate port number."""
    if isinstance(value, str):
        try:
            value = int(value)
        except ValueError:
            raise ValueError(f"Port must be a valid integer, got: {value}")
    
    if not (1 <= value <= 65535):
        raise ValueError("Port must be between 1 and 65535")
    return value


def validate_timeout(value: Union[int, str]) -> int:
    """Validate timeout value."""
    if isinstance(value, str):
        try:
            value = int(value)
        except ValueError:
            raise ValueError(f"Timeout must be a valid integer, got: {value}")
    
    if value <= 0:
        raise ValueError("Timeout must be positive")
    return value


def validate_temperature(value: Union[float, str]) -> float:
    """Validate temperature value."""
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            raise ValueError(f"Temperature must be a valid float, got: {value}")
    
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


def validate_positive_int(value: Union[int, str]) -> int:
    """Validate positive integer."""
    if isinstance(value, str):
        try:
            value = int(value)
        except ValueError:
            raise ValueError(f"Value must be a valid integer, got: {value}")
    
    if value <= 0:
        raise ValueError("Value must be positive")
    return value






def validate_percentage(value: Union[float, str]) -> float:
    """Validate percentage value (0-100)."""
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            raise ValueError(f"Percentage must be a valid float, got: {value}")
    
    if not (0.0 <= value <= 100.0):
        raise ValueError("Percentage must be between 0.0 and 100.0")
    return value



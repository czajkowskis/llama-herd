"""
Validation utilities for common data validation operations.
"""
import re
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


def validate_required(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
    """
    Validate that required fields are present and not None/empty.
    
    Args:
        data: Dictionary to validate
        required_fields: List of required field names
        
    Returns:
        List of missing or invalid fields
    """
    missing_fields = []
    for field in required_fields:
        if field not in data:
            missing_fields.append(f"{field} is required")
        elif data[field] is None:
            missing_fields.append(f"{field} cannot be None")
        elif isinstance(data[field], str) and not data[field].strip():
            missing_fields.append(f"{field} cannot be empty")
        elif isinstance(data[field], list) and len(data[field]) == 0:
            missing_fields.append(f"{field} cannot be empty list")
    return missing_fields


def validate_string_length(value: str, min_length: int = 0, max_length: Optional[int] = None) -> bool:
    """
    Validate string length.
    
    Args:
        value: String to validate
        min_length: Minimum length
        max_length: Maximum length
        
    Returns:
        True if valid
    """
    if not isinstance(value, str):
        return False
    
    if len(value) < min_length:
        return False
    
    if max_length is not None and len(value) > max_length:
        return False
    
    return True


def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid email format
    """
    if not isinstance(email, str):
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL to validate
        
    Returns:
        True if valid URL format
    """
    if not isinstance(url, str):
        return False
    
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))


def validate_uuid(uuid_string: str) -> bool:
    """
    Validate UUID format.
    
    Args:
        uuid_string: UUID string to validate
        
    Returns:
        True if valid UUID format
    """
    if not isinstance(uuid_string, str):
        return False
    
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_string, re.IGNORECASE))


def validate_positive_number(value: Union[int, float]) -> bool:
    """
    Validate that number is positive.
    
    Args:
        value: Number to validate
        
    Returns:
        True if positive
    """
    return isinstance(value, (int, float)) and value > 0


def validate_non_negative_number(value: Union[int, float]) -> bool:
    """
    Validate that number is non-negative.
    
    Args:
        value: Number to validate
        
    Returns:
        True if non-negative
    """
    return isinstance(value, (int, float)) and value >= 0


def validate_range(value: Union[int, float], min_value: Union[int, float], 
                  max_value: Union[int, float]) -> bool:
    """
    Validate that number is within range.
    
    Args:
        value: Number to validate
        min_value: Minimum value
        max_value: Maximum value
        
    Returns:
        True if within range
    """
    return isinstance(value, (int, float)) and min_value <= value <= max_value


def validate_temperature(value: float) -> bool:
    """
    Validate temperature value (0.0 to 2.0).
    
    Args:
        value: Temperature to validate
        
    Returns:
        True if valid temperature
    """
    return validate_range(value, 0.0, 2.0)


def validate_port(port: int) -> bool:
    """
    Validate port number (1-65535).
    
    Args:
        port: Port number to validate
        
    Returns:
        True if valid port
    """
    return isinstance(port, int) and 1 <= port <= 65535


def validate_datetime_string(dt_string: str) -> bool:
    """
    Validate ISO datetime string format.
    
    Args:
        dt_string: Datetime string to validate
        
    Returns:
        True if valid datetime string
    """
    if not isinstance(dt_string, str):
        return False
    
    try:
        datetime.fromisoformat(dt_string)
        return True
    except (ValueError, TypeError):
        return False


def validate_list_not_empty(value: List[Any]) -> bool:
    """
    Validate that list is not empty.
    
    Args:
        value: List to validate
        
    Returns:
        True if list is not empty
    """
    return isinstance(value, list) and len(value) > 0


def validate_list_length(value: List[Any], min_length: int = 0, 
                        max_length: Optional[int] = None) -> bool:
    """
    Validate list length.
    
    Args:
        value: List to validate
        min_length: Minimum length
        max_length: Maximum length
        
    Returns:
        True if valid length
    """
    if not isinstance(value, list):
        return False
    
    if len(value) < min_length:
        return False
    
    if max_length is not None and len(value) > max_length:
        return False
    
    return True


def validate_dict_structure(data: Dict[str, Any], required_keys: List[str]) -> bool:
    """
    Validate that dictionary has required keys.
    
    Args:
        data: Dictionary to validate
        required_keys: List of required keys
        
    Returns:
        True if all required keys are present
    """
    if not isinstance(data, dict):
        return False
    
    return all(key in data for key in required_keys)


def validate_enum_value(value: Any, valid_values: List[Any]) -> bool:
    """
    Validate that value is one of the valid enum values.
    
    Args:
        value: Value to validate
        valid_values: List of valid values
        
    Returns:
        True if value is valid
    """
    return value in valid_values


def validate_regex_pattern(value: str, pattern: str) -> bool:
    """
    Validate string against regex pattern.
    
    Args:
        value: String to validate
        pattern: Regex pattern
        
    Returns:
        True if string matches pattern
    """
    if not isinstance(value, str):
        return False
    
    try:
        return bool(re.match(pattern, value))
    except re.error:
        return False


def validate_alphanumeric(value: str) -> bool:
    """
    Validate that string contains only alphanumeric characters.
    
    Args:
        value: String to validate
        
    Returns:
        True if alphanumeric
    """
    if not isinstance(value, str):
        return False
    
    return value.isalnum()


def validate_alpha(value: str) -> bool:
    """
    Validate that string contains only alphabetic characters.
    
    Args:
        value: String to validate
        
    Returns:
        True if alphabetic
    """
    if not isinstance(value, str):
        return False
    
    return value.isalpha()


def validate_numeric(value: str) -> bool:
    """
    Validate that string contains only numeric characters.
    
    Args:
        value: String to validate
        
    Returns:
        True if numeric
    """
    if not isinstance(value, str):
        return False
    
    return value.isdigit()


def validate_hex_color(color: str) -> bool:
    """
    Validate hex color format (#RRGGBB or #RGB).
    
    Args:
        color: Color string to validate
        
    Returns:
        True if valid hex color
    """
    if not isinstance(color, str):
        return False
    
    pattern = r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    return bool(re.match(pattern, color))


def validate_json_string(json_string: str) -> bool:
    """
    Validate JSON string format.
    
    Args:
        json_string: JSON string to validate
        
    Returns:
        True if valid JSON
    """
    if not isinstance(json_string, str):
        return False
    
    try:
        import json
        json.loads(json_string)
        return True
    except (json.JSONDecodeError, TypeError):
        return False


def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """
    Validate file extension.
    
    Args:
        filename: Filename to validate
        allowed_extensions: List of allowed extensions (with or without dot)
        
    Returns:
        True if extension is allowed
    """
    if not isinstance(filename, str):
        return False
    
    # Normalize extensions (remove dots if present)
    normalized_extensions = [ext.lstrip('.') for ext in allowed_extensions]
    
    # Get file extension
    if '.' not in filename:
        return False
    
    file_extension = filename.split('.')[-1].lower()
    return file_extension in normalized_extensions


def validate_path_safe(filename: str) -> bool:
    """
    Validate that filename is safe for file system paths.
    
    Args:
        filename: Filename to validate
        
    Returns:
        True if path safe
    """
    if not isinstance(filename, str):
        return False
    
    # Check for dangerous characters
    dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
    if any(char in filename for char in dangerous_chars):
        return False
    
    # Check for reserved names (Windows)
    reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                     'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                     'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    
    name_without_ext = filename.split('.')[0].upper()
    if name_without_ext in reserved_names:
        return False
    
    return True

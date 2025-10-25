"""
Common utility functions used throughout the application.
"""
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Union, Optional
from pathlib import Path


def generate_id() -> str:
    """Generate a unique ID."""
    return str(uuid.uuid4())


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to the specified maximum length.
    
    Args:
        text: Text to truncate
        max_length: Maximum length of the result
        suffix: Suffix to add if text is truncated
        
    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def parse_comma_separated_list(value: Union[str, List[str]]) -> List[str]:
    """
    Parse comma-separated string into list.
    
    Args:
        value: Comma-separated string or list
        
    Returns:
        List of strings
    """
    if isinstance(value, str):
        return [x.strip() for x in value.split(',') if x.strip()]
    return value


def parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """
    Parse ISO datetime string to datetime object.
    
    Args:
        value: ISO datetime string or None
        
    Returns:
        datetime object or None
    """
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """
    Format datetime object to ISO string.
    
    Args:
        dt: datetime object or None
        
    Returns:
        ISO datetime string or None
    """
    if not dt:
        return None
    return dt.isoformat()


def safe_get_nested(data: Dict[str, Any], *keys, default: Any = None) -> Any:
    """
    Safely get nested dictionary values.
    
    Args:
        data: Dictionary to search
        keys: Keys to traverse
        default: Default value if key not found
        
    Returns:
        Value at nested key or default
    """
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current


def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge multiple dictionaries, with later dictionaries taking precedence.
    
    Args:
        dicts: Dictionaries to merge
        
    Returns:
        Merged dictionary
    """
    result = {}
    for d in dicts:
        if d:
            result.update(d)
    return result


def deep_merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries.
    
    Args:
        dict1: First dictionary
        dict2: Second dictionary (takes precedence)
        
    Returns:
        Deeply merged dictionary
    """
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename by removing/replacing invalid characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove leading/trailing spaces and dots
    sanitized = sanitized.strip(' .')
    # Ensure it's not empty
    if not sanitized:
        sanitized = 'unnamed'
    return sanitized


def ensure_directory(path: Union[str, Path]) -> Path:
    """
    Ensure directory exists, creating it if necessary.
    
    Args:
        path: Directory path
        
    Returns:
        Path object
    """
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_file_size_mb(file_path: Union[str, Path]) -> float:
    """
    Get file size in megabytes.
    
    Args:
        file_path: Path to file
        
    Returns:
        File size in MB
    """
    try:
        return Path(file_path).stat().st_size / (1024 * 1024)
    except (OSError, FileNotFoundError):
        return 0.0


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted size string
    """
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    size = float(size_bytes)
    
    while size >= 1024.0 and i < len(size_names) - 1:
        size /= 1024.0
        i += 1
    
    return f"{size:.1f} {size_names[i]}"


def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid email format
    """
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
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))


def extract_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL.
    
    Args:
        url: URL to extract domain from
        
    Returns:
        Domain name or None
    """
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc
    except Exception:
        return None


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split list into chunks of specified size.
    
    Args:
        lst: List to chunk
        chunk_size: Size of each chunk
        
    Returns:
        List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def remove_duplicates(lst: List[Any]) -> List[Any]:
    """
    Remove duplicates from list while preserving order.
    
    Args:
        lst: List to deduplicate
        
    Returns:
        List without duplicates
    """
    seen = set()
    result = []
    for item in lst:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """
    Flatten nested dictionary.
    
    Args:
        d: Dictionary to flatten
        parent_key: Parent key prefix
        sep: Separator for nested keys
        
    Returns:
        Flattened dictionary
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def unflatten_dict(d: Dict[str, Any], sep: str = '.') -> Dict[str, Any]:
    """
    Unflatten dictionary with nested keys.
    
    Args:
        d: Flattened dictionary
        sep: Separator for nested keys
        
    Returns:
        Nested dictionary
    """
    result = {}
    for key, value in d.items():
        keys = key.split(sep)
        current = result
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        current[keys[-1]] = value
    return result


def retry_with_backoff(func, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 60.0):
    """
    Retry function with exponential backoff.
    
    Args:
        func: Function to retry
        max_retries: Maximum number of retries
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        
    Returns:
        Function result
        
    Raises:
        Last exception if all retries fail
    """
    import time
    import random
    
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return func()
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
                time.sleep(delay)
    
    raise last_exception


def format_duration(seconds: float) -> str:
    """
    Format duration in human-readable format.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        Formatted duration string
    """
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}h"


def parse_duration(duration_str: str) -> float:
    """
    Parse duration string to seconds.
    
    Args:
        duration_str: Duration string (e.g., "1h30m", "45s", "2.5m")
        
    Returns:
        Duration in seconds
    """
    import re
    
    total_seconds = 0.0
    
    # Parse hours
    hours_match = re.search(r'(\d+(?:\.\d+)?)h', duration_str)
    if hours_match:
        total_seconds += float(hours_match.group(1)) * 3600
    
    # Parse minutes
    minutes_match = re.search(r'(\d+(?:\.\d+)?)m', duration_str)
    if minutes_match:
        total_seconds += float(minutes_match.group(1)) * 60
    
    # Parse seconds
    seconds_match = re.search(r'(\d+(?:\.\d+)?)s', duration_str)
    if seconds_match:
        total_seconds += float(seconds_match.group(1))
    
    return total_seconds

"""
Data transformation utilities for common operations.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel


def serialize_pydantic_model(model: BaseModel) -> Dict[str, Any]:
    """
    Serialize a Pydantic model to dictionary.
    
    Args:
        model: Pydantic model instance
        
    Returns:
        Dictionary representation
    """
    if hasattr(model, 'model_dump'):
        return model.model_dump()
    elif hasattr(model, 'dict'):
        return model.dict()
    else:
        return model.__dict__


def serialize_pydantic_models(models: List[BaseModel]) -> List[Dict[str, Any]]:
    """
    Serialize a list of Pydantic models to dictionaries.
    
    Args:
        models: List of Pydantic model instances
        
    Returns:
        List of dictionary representations
    """
    return [serialize_pydantic_model(model) for model in models]


def convert_datetime_fields(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    """
    Convert datetime fields to ISO strings.
    
    Args:
        data: Dictionary with datetime fields
        fields: List of field names to convert
        
    Returns:
        Dictionary with converted datetime fields
    """
    result = data.copy()
    for field in fields:
        if field in result and isinstance(result[field], datetime):
            result[field] = result[field].isoformat()
    return result


def convert_iso_strings_to_datetime(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    """
    Convert ISO string fields to datetime objects.
    
    Args:
        data: Dictionary with ISO string fields
        fields: List of field names to convert
        
    Returns:
        Dictionary with converted datetime fields
    """
    result = data.copy()
    for field in fields:
        if field in result and isinstance(result[field], str):
            try:
                result[field] = datetime.fromisoformat(result[field])
            except (ValueError, TypeError):
                pass  # Keep original value if conversion fails
    return result


def extract_nested_field(data: Dict[str, Any], field_path: str, default: Any = None) -> Any:
    """
    Extract nested field from dictionary using dot notation.
    
    Args:
        data: Dictionary to extract from
        field_path: Dot-separated field path (e.g., "user.profile.name")
        default: Default value if field not found
        
    Returns:
        Field value or default
    """
    keys = field_path.split('.')
    current = data
    
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    
    return current


def set_nested_field(data: Dict[str, Any], field_path: str, value: Any) -> Dict[str, Any]:
    """
    Set nested field in dictionary using dot notation.
    
    Args:
        data: Dictionary to modify
        field_path: Dot-separated field path (e.g., "user.profile.name")
        value: Value to set
        
    Returns:
        Modified dictionary
    """
    keys = field_path.split('.')
    current = data
    
    for key in keys[:-1]:
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value
    return data


def filter_dict(data: Dict[str, Any], include_keys: Optional[List[str]] = None, 
                exclude_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Filter dictionary by including or excluding keys.
    
    Args:
        data: Dictionary to filter
        include_keys: Keys to include (if None, include all)
        exclude_keys: Keys to exclude
        
    Returns:
        Filtered dictionary
    """
    if include_keys is not None:
        result = {k: v for k, v in data.items() if k in include_keys}
    else:
        result = data.copy()
    
    if exclude_keys is not None:
        result = {k: v for k, v in result.items() if k not in exclude_keys}
    
    return result


def transform_dict_keys(data: Dict[str, Any], key_mapping: Dict[str, str]) -> Dict[str, Any]:
    """
    Transform dictionary keys using a mapping.
    
    Args:
        data: Dictionary to transform
        key_mapping: Mapping from old keys to new keys
        
    Returns:
        Dictionary with transformed keys
    """
    result = {}
    for old_key, value in data.items():
        new_key = key_mapping.get(old_key, old_key)
        result[new_key] = value
    return result


def merge_list_of_dicts(dicts: List[Dict[str, Any]], merge_key: str) -> List[Dict[str, Any]]:
    """
    Merge list of dictionaries by a common key.
    
    Args:
        dicts: List of dictionaries to merge
        merge_key: Key to use for merging
        
    Returns:
        List of merged dictionaries
    """
    merged = {}
    for d in dicts:
        key_value = d.get(merge_key)
        if key_value in merged:
            merged[key_value].update(d)
        else:
            merged[key_value] = d.copy()
    
    return list(merged.values())


def group_by_key(items: List[Dict[str, Any]], key: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group list of dictionaries by a key.
    
    Args:
        items: List of dictionaries to group
        key: Key to group by
        
    Returns:
        Dictionary with grouped items
    """
    grouped = {}
    for item in items:
        group_key = item.get(key)
        if group_key not in grouped:
            grouped[group_key] = []
        grouped[group_key].append(item)
    
    return grouped


def sort_by_key(items: List[Dict[str, Any]], key: str, reverse: bool = False) -> List[Dict[str, Any]]:
    """
    Sort list of dictionaries by a key.
    
    Args:
        items: List of dictionaries to sort
        key: Key to sort by
        reverse: Sort in reverse order
        
    Returns:
        Sorted list
    """
    return sorted(items, key=lambda x: x.get(key, ''), reverse=reverse)


def paginate_list(items: List[Any], page: int = 1, page_size: int = 10) -> Dict[str, Any]:
    """
    Paginate a list of items.
    
    Args:
        items: List to paginate
        page: Page number (1-based)
        page_size: Number of items per page
        
    Returns:
        Dictionary with paginated data and metadata
    """
    total_items = len(items)
    total_pages = (total_items + page_size - 1) // page_size
    
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    
    paginated_items = items[start_index:end_index]
    
    return {
        'items': paginated_items,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    }


def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
    """
    Validate that required fields are present in data.
    
    Args:
        data: Dictionary to validate
        required_fields: List of required field names
        
    Returns:
        List of missing fields
    """
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    return missing_fields


def clean_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove None values from dictionary.
    
    Args:
        data: Dictionary to clean
        
    Returns:
        Dictionary without None values
    """
    return {k: v for k, v in data.items() if v is not None}


def deep_clean_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively remove None values from nested dictionary.
    
    Args:
        data: Dictionary to clean
        
    Returns:
        Dictionary without None values
    """
    if isinstance(data, dict):
        return {k: deep_clean_none_values(v) for k, v in data.items() if v is not None}
    elif isinstance(data, list):
        return [deep_clean_none_values(item) for item in data if item is not None]
    else:
        return data

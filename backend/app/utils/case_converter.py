"""
Utility for converting between camelCase and snake_case.
This module provides bidirectional conversion to handle the mismatch between
frontend (camelCase) and backend (snake_case) naming conventions.
"""
import re
from typing import Any, Dict, List, Union


def camel_to_snake(name: str) -> str:
    """
    Convert camelCase to snake_case.
    
    Examples:
        experimentId -> experiment_id
        createdAt -> created_at
        currentIteration -> current_iteration
    """
    # Insert underscore before uppercase letters (except at start)
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    # Insert underscore before uppercase letters preceded by lowercase
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def snake_to_camel(name: str) -> str:
    """
    Convert snake_case to camelCase.
    
    Examples:
        experiment_id -> experimentId
        created_at -> createdAt
        current_iteration -> currentIteration
    """
    components = name.split('_')
    # Keep first component as is, capitalize the rest
    return components[0] + ''.join(x.title() for x in components[1:])


def normalize_dict_to_snake(data: Union[Dict[str, Any], List, Any], deep: bool = True) -> Union[Dict[str, Any], List, Any]:
    """
    Recursively convert all dictionary keys from camelCase to snake_case.
    Also accepts both forms, preferring the snake_case version if both exist.
    
    Args:
        data: Dictionary, list, or primitive value to normalize
        deep: If True, recursively process nested structures
        
    Returns:
        Data structure with all keys converted to snake_case
    """
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Convert key to snake_case
            snake_key = camel_to_snake(key)
            
            # Recursively process value if deep=True
            if deep and isinstance(value, (dict, list)):
                result[snake_key] = normalize_dict_to_snake(value, deep=True)
            else:
                result[snake_key] = value
        
        return result
    
    elif isinstance(data, list):
        if deep:
            return [normalize_dict_to_snake(item, deep=True) for item in data]
        return data
    
    else:
        # Primitive type, return as-is
        return data


def normalize_dict_to_camel(data: Union[Dict[str, Any], List, Any], deep: bool = True) -> Union[Dict[str, Any], List, Any]:
    """
    Recursively convert all dictionary keys from snake_case to camelCase.
    
    Args:
        data: Dictionary, list, or primitive value to normalize
        deep: If True, recursively process nested structures
        
    Returns:
        Data structure with all keys converted to camelCase
    """
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Convert key to camelCase
            camel_key = snake_to_camel(key)
            
            # Recursively process value if deep=True
            if deep and isinstance(value, (dict, list)):
                result[camel_key] = normalize_dict_to_camel(value, deep=True)
            else:
                result[camel_key] = value
        
        return result
    
    elif isinstance(data, list):
        if deep:
            return [normalize_dict_to_camel(item, deep=True) for item in data]
        return data
    
    else:
        # Primitive type, return as-is
        return data


def accept_both_forms(data: Dict[str, Any], keys_to_check: List[str]) -> Dict[str, Any]:
    """
    Accept both camelCase and snake_case for specific keys.
    If both forms exist, snake_case takes precedence.
    
    Args:
        data: Dictionary to process
        keys_to_check: List of keys in snake_case to check for both forms
        
    Returns:
        Dictionary with both forms accepted (snake_case preferred)
        
    Example:
        data = {"experimentId": "123", "name": "test"}
        result = accept_both_forms(data, ["experiment_id"])
        # result = {"experiment_id": "123", "name": "test"}
    """
    result = data.copy()
    
    for snake_key in keys_to_check:
        camel_key = snake_to_camel(snake_key)
        
        # If snake_case exists, keep it
        if snake_key in result:
            continue
        
        # If camelCase exists but not snake_case, convert it
        if camel_key in result:
            result[snake_key] = result[camel_key]
            # Optionally remove the camelCase version
            # del result[camel_key]
    
    return result

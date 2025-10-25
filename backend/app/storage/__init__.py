"""
Storage module for persistent data management.
"""
from .unified_storage import UnifiedStorage
from .base import BaseStorage

def get_storage() -> BaseStorage:
    """Factory function to get the current storage backend."""
    # Use the unified storage
    return UnifiedStorage()

__all__ = ["UnifiedStorage", "BaseStorage"]
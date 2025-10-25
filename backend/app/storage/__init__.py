"""
Storage module for persistent data management.
"""
from .file_storage import FileStorage
from .unified_storage import UnifiedStorage
from .base import BaseStorage

def get_storage() -> BaseStorage:
    """Factory function to get the current storage backend."""
    # Use the new unified storage by default
    return UnifiedStorage()

__all__ = ["FileStorage", "UnifiedStorage", "BaseStorage"]
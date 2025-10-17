"""
Storage module for persistent data management.
"""
from .file_storage import FileStorage
from .base import BaseStorage

def get_storage() -> BaseStorage:
    """Factory function to get the current storage backend."""
    return FileStorage()

__all__ = ["FileStorage"]
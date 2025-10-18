from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import os
import json
import tempfile
from pathlib import Path


class BaseStorage(ABC):
    """Abstract base class for storage implementations."""

    @staticmethod
    def atomic_write_json(file_path: Path, data: Dict[str, Any], validate_model=None) -> bool:
        """
        Atomically write JSON data to a file using temp file + fsync + os.replace.
        
        Args:
            file_path: Target file path
            data: Data to write
            validate_model: Optional Pydantic model to validate data before writing
            
        Returns:
            True if successful
            
        Raises:
            ValueError: If validation fails
            IOError: If write operation fails
        """
        # Validate with Pydantic model if provided
        if validate_model is not None:
            try:
                validate_model(**data)
            except Exception as e:
                raise ValueError(f"Data validation failed: {e}")
        
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to temporary file in same directory (ensures same filesystem for atomic replace)
        temp_fd, temp_path = tempfile.mkstemp(
            dir=file_path.parent,
            prefix=f".{file_path.name}.",
            suffix='.tmp'
        )
        
        try:
            # Write JSON data to temp file
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
                f.flush()
                # Ensure data is written to disk
                os.fsync(f.fileno())
            
            # Atomically replace target file with temp file
            os.replace(temp_path, file_path)
            return True
            
        except Exception as e:
            # Clean up temp file on error
            try:
                os.unlink(temp_path)
            except (OSError, FileNotFoundError):
                pass
            raise IOError(f"Error writing {file_path}: {e}")

    @abstractmethod
    def save_experiment(self, experiment: Dict[str, Any]) -> bool:
        """Save an experiment."""
        pass

    @abstractmethod
    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        pass

    @abstractmethod
    def get_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments."""
        pass

    @abstractmethod
    def update_experiment(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing experiment."""
        pass

    @abstractmethod
    def delete_experiment(self, experiment_id: str) -> bool:
        """Delete an experiment."""
        pass

    @abstractmethod
    def save_experiment_conversation(self, experiment_id: str, iteration: int, title: str, conversation: Dict[str, Any], experiment_title: str = None) -> bool:
        """Save an experiment conversation."""
        pass

    @abstractmethod
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment."""
        pass

    @abstractmethod
    def delete_experiment_conversation(self, experiment_id: str, iteration: int, title: str) -> bool:
        """Delete a specific experiment conversation."""
        pass

    @abstractmethod
    def save_conversation(self, conversation: Dict[str, Any]) -> bool:
        """Save an imported conversation."""
        pass

    @abstractmethod
    def get_conversations(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get imported conversations."""
        pass

    @abstractmethod
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID."""
        pass

    @abstractmethod
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete an imported conversation."""
        pass

    @abstractmethod
    def clear_all(self) -> bool:
        """Clear all stored data."""
        pass

    @abstractmethod
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored data."""
        pass

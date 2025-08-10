"""
File-based storage implementation.
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid

from ..core.config import settings
from ..core.exceptions import StorageError


class FileStorage:
    """File-based storage for experiments and conversations."""
    
    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir or settings.data_directory)
        self.experiments_dir = self.data_dir / settings.experiments_directory
        self.conversations_dir = self.data_dir / settings.conversations_directory
        
        # Create directories if they don't exist
        self.experiments_dir.mkdir(parents=True, exist_ok=True)
        self.conversations_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_experiment_path(self, experiment_id: str) -> Path:
        return self.experiments_dir / f"{experiment_id}.json"
    
    def _get_conversation_path(self, conversation_id: str) -> Path:
        return self.conversations_dir / f"{conversation_id}.json"
    
    def _read_json_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Read a JSON file and return its contents, or None if file doesn't exist."""
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            raise StorageError(f"Error reading {file_path}: {e}")
        return None
    
    def _write_json_file(self, file_path: Path, data: Dict[str, Any]) -> bool:
        """Write data to a JSON file. Returns True if successful."""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
            return True
        except IOError as e:
            raise StorageError(f"Error writing {file_path}: {e}")
    
    # Experiment storage methods
    def save_experiment(self, experiment: Dict[str, Any]) -> bool:
        """Save an experiment to a JSON file."""
        experiment_id = experiment.get('id')
        if not experiment_id:
            experiment_id = str(uuid.uuid4())
            experiment['id'] = experiment_id
        
        # Ensure created_at is set
        if 'created_at' not in experiment:
            experiment['created_at'] = datetime.utcnow().isoformat()
        
        file_path = self._get_experiment_path(experiment_id)
        return self._write_json_file(file_path, experiment)
    
    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        file_path = self._get_experiment_path(experiment_id)
        return self._read_json_file(file_path)
    
    def get_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments."""
        experiments = []
        for file_path in self.experiments_dir.glob("*.json"):
            experiment = self._read_json_file(file_path)
            if experiment:
                experiments.append(experiment)
        
        # Sort by created_at (newest first)
        experiments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return experiments
    
    def update_experiment(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing experiment with new data."""
        experiment = self.get_experiment(experiment_id)
        if not experiment:
            return False
        
        experiment.update(updates)
        return self.save_experiment(experiment)
    
    def delete_experiment(self, experiment_id: str) -> bool:
        """Delete an experiment and its file."""
        file_path = self._get_experiment_path(experiment_id)
        try:
            if file_path.exists():
                file_path.unlink()
                return True
        except IOError as e:
            raise StorageError(f"Error deleting {file_path}: {e}")
        return False
    
    # Conversation storage methods
    def save_conversation(self, conversation: Dict[str, Any]) -> bool:
        """Save a conversation to a JSON file."""
        conversation_id = conversation.get('id')
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation['id'] = conversation_id
        
        # Ensure imported_at is set
        if 'imported_at' not in conversation:
            conversation['imported_at'] = datetime.utcnow().isoformat()
        
        file_path = self._get_conversation_path(conversation_id)
        return self._write_json_file(file_path, conversation)
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID."""
        file_path = self._get_conversation_path(conversation_id)
        return self._read_json_file(file_path)
    
    def get_conversations(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all conversations, optionally filtered by source."""
        conversations = []
        for file_path in self.conversations_dir.glob("*.json"):
            conversation = self._read_json_file(file_path)
            if conversation:
                if source is None or conversation.get('source') == source:
                    conversations.append(conversation)
        
        # Sort by imported_at (newest first)
        conversations.sort(key=lambda x: x.get('imported_at', ''), reverse=True)
        return conversations
    
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment."""
        conversations = []
        for file_path in self.conversations_dir.glob("*.json"):
            conversation = self._read_json_file(file_path)
            if conversation and conversation.get('experiment_id') == experiment_id:
                conversations.append(conversation)
        
        # Sort by created_at (newest first)
        conversations.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return conversations
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and its file."""
        file_path = self._get_conversation_path(conversation_id)
        try:
            if file_path.exists():
                file_path.unlink()
                return True
        except IOError as e:
            raise StorageError(f"Error deleting {file_path}: {e}")
        return False
    
    # Utility methods
    def clear_all(self) -> bool:
        """Clear all stored data (for testing/debugging)."""
        try:
            for file_path in self.experiments_dir.glob("*.json"):
                file_path.unlink()
            for file_path in self.conversations_dir.glob("*.json"):
                file_path.unlink()
            return True
        except IOError as e:
            raise StorageError(f"Error clearing data: {e}")
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored data."""
        experiment_count = len(list(self.experiments_dir.glob("*.json")))
        conversation_count = len(list(self.conversations_dir.glob("*.json")))
        
        return {
            "experiment_count": experiment_count,
            "conversation_count": conversation_count,
            "data_directory": str(self.data_dir.absolute())
        }


# Global storage instance
storage = FileStorage() 
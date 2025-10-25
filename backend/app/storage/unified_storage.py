"""
Unified storage implementation using specialized storage services.
"""
from pathlib import Path
from typing import Dict, Any, List, Optional

from ..core.config import settings
from ..core.exceptions import StorageError
from .base import BaseStorage
from .experiment_storage import ExperimentStorage
from .conversation_storage import ConversationStorage
from ..utils.logging import get_logger

logger = get_logger(__name__)


class UnifiedStorage(BaseStorage):
    """Unified storage implementation using specialized storage services."""
    
    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir or settings.data_directory)
        
        # Initialize specialized storage services
        self.experiment_storage = ExperimentStorage(self.data_dir)
        self.conversation_storage = ConversationStorage(self.data_dir)
    
    # Experiment storage methods - delegate to ExperimentStorage
    def save_experiment(self, experiment: Dict[str, Any]) -> bool:
        """Save an experiment to storage."""
        return self.experiment_storage.save_experiment(experiment)
    
    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        return self.experiment_storage.get_experiment(experiment_id)
    
    def get_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments from storage."""
        return self.experiment_storage.get_experiments()
    
    def update_experiment(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing experiment with new data."""
        return self.experiment_storage.update_experiment(experiment_id, updates)
    
    def delete_experiment(self, experiment_id: str) -> bool:
        """Delete an experiment and its associated data."""
        return self.experiment_storage.delete_experiment(experiment_id)
    
    # Conversation storage methods - delegate to ConversationStorage
    def save_conversation(self, conversation: Dict[str, Any]) -> bool:
        """Save an imported conversation to storage."""
        return self.conversation_storage.save_conversation(conversation)
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a single conversation by its ID."""
        return self.conversation_storage.get_conversation(conversation_id)
    
    def get_conversations(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get conversations, optionally filtered by source."""
        return self.conversation_storage.get_conversations(source)
    
    def update_conversation(self, conversation_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing conversation with new data."""
        return self.conversation_storage.update_conversation(conversation_id, updates)
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        return self.conversation_storage.delete_conversation(conversation_id)
    
    # Experiment conversation methods - delegate to ConversationStorage
    def save_experiment_conversation(
        self, 
        experiment_id: str, 
        iteration: int, 
        title: str, 
        conversation: Dict[str, Any], 
        experiment_title: str = None
    ) -> bool:
        """Save an experiment conversation."""
        return self.conversation_storage.save_experiment_conversation(
            experiment_id, iteration, title, conversation, experiment_title
        )
    
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment."""
        return self.conversation_storage.get_experiment_conversations(experiment_id)
    
    def delete_experiment_conversation(self, experiment_id: str, iteration: int, title: str) -> bool:
        """Delete a specific experiment conversation."""
        return self.conversation_storage.delete_experiment_conversation(experiment_id, iteration, title)
    
    # Utility methods
    def clear_all(self) -> bool:
        """Clear all stored data (for testing/debugging)."""
        try:
            experiment_success = self.experiment_storage.clear_all()
            conversation_success = self.conversation_storage.clear_all()
            return experiment_success and conversation_success
        except Exception as e:
            raise StorageError(f"Error clearing data: {e}")
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored data."""
        experiment_info = self.experiment_storage.get_storage_info()
        conversation_info = self.conversation_storage.get_storage_info()
        
        return {
            **experiment_info,
            **conversation_info,
            "total_conversation_count": (
                experiment_info.get("conversation_count", 0) + 
                conversation_info.get("imported_conversation_count", 0)
            )
        }

"""
Conversation-specific storage operations.
"""
import uuid
from datetime import datetime, UTC
from pathlib import Path
from typing import Dict, Any, Optional, List

from ..core.config import settings
from ..core.exceptions import StorageError
from ..utils.file_utilities import FileLockManager, AtomicFileWriter
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ConversationStorage:
    """Handles conversation-specific storage operations."""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.experiments_dir = data_dir / settings.experiments_directory
        self.imported_dir = data_dir / "imported_conversations"
        self.lock_manager = FileLockManager()
        self.file_writer = AtomicFileWriter()
        
        # Create directories if they don't exist
        self.imported_dir.mkdir(exist_ok=True)
    
    def _get_experiment_conversations_dir(self, experiment_id: str) -> Path:
        """Get the conversations directory for a specific experiment."""
        return self.experiments_dir / experiment_id / "conversations"
    
    def _get_conversation_path(self, experiment_id: str, iteration: int) -> Path:
        """Get the path for a conversation file."""
        conversations_dir = self._get_experiment_conversations_dir(experiment_id)
        return conversations_dir / f"{iteration}.json"
    
    def _get_experiment_lock_path(self, experiment_id: str) -> Path:
        """Get the lock file path for a specific experiment."""
        return self.lock_manager.get_experiment_lock_path(self.data_dir, experiment_id)
    
    def save_experiment_conversation(
        self, 
        experiment_id: str, 
        iteration: int, 
        title: str, 
        conversation: Dict[str, Any], 
        experiment_title: str = None
    ) -> bool:
        """Save an experiment conversation using the new folder structure with validation."""
        file_path = self._get_conversation_path(experiment_id, iteration)
        
        # Ensure the conversations directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Add metadata with deterministic ID
        conversation['id'] = f"{experiment_id}_{iteration}"
        conversation['experiment_id'] = experiment_id
        conversation['iteration'] = iteration
        conversation['title'] = title
        conversation['created_at'] = datetime.now(UTC).isoformat()
        
        # Use per-experiment lock for conversation writes too
        lock_path = self._get_experiment_lock_path(experiment_id)
        lock = self.lock_manager.get_lock(lock_path)
        
        try:
            with lock:
                return self.file_writer.write_json_atomic(file_path, conversation)
        except Exception as e:
            raise StorageError(f"Error saving conversation: {e}")
    
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment from the new folder structure."""
        conversations_dir = self._get_experiment_conversations_dir(experiment_id)
        if not conversations_dir.exists():
            return []

        conversations = []
        for file_path in sorted(conversations_dir.glob("*.json")):
            conversation = self.file_writer.read_json_safe(file_path)
            if conversation:
                conversations.append(conversation)
        
        return conversations
    
    def delete_experiment_conversation(self, experiment_id: str, iteration: int, title: str) -> bool:
        """Delete a specific experiment conversation."""
        file_path = self._get_conversation_path(experiment_id, iteration)
        if not file_path.exists():
            return False
        
        try:
            file_path.unlink()
            return True
        except Exception as e:
            raise StorageError(f"Error deleting conversation {file_path}: {e}")
    
    def save_conversation(self, conversation: Dict[str, Any]) -> bool:
        """Save an imported conversation (legacy method) with validation.
        
        When an id is provided, saves to {id}.json for deterministic lookups.
        When no id is provided, generates a new id and saves to {id}.json.
        This enables atomic updates by id.
        """
        # Only allow imported conversations, not experiment conversations
        if conversation.get('source') == 'experiment':
            raise StorageError("Experiment conversations should use save_experiment_conversation")
        
        conversation_id = conversation.get('id')
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation['id'] = conversation_id
        
        # Ensure imported_at is set
        if 'imported_at' not in conversation:
            conversation['imported_at'] = datetime.now(UTC).isoformat()
        
        # Use deterministic filename based on id for atomic updates
        filename = f"{conversation_id}.json"
        file_path = self.imported_dir / filename
        
        return self.file_writer.write_json_atomic(file_path, conversation)
    
    def get_conversations(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get imported conversations only (legacy method)."""
        if source == 'experiment':
            return []  # Experiment conversations are now stored differently
        
        if not self.imported_dir.exists():
            return []
        
        conversations = []
        for file_path in self.imported_dir.glob("*.json"):
            conversation = self.file_writer.read_json_safe(file_path)
            if conversation:
                if source is None or conversation.get('source') == source:
                    conversations.append(conversation)
        
        # Sort by imported_at (newest first)
        conversations.sort(key=lambda x: x.get('imported_at', ''), reverse=True)
        return conversations
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a single conversation by its ID from any storage location."""
        # Check imported conversations first
        imported_conv_path = self.imported_dir / f"{conversation_id}.json"
        if imported_conv_path.exists():
            return self.file_writer.read_json_safe(imported_conv_path)

        # Try to parse conversation_id as experiment conversation: {experiment_id}_{iteration}
        # This allows direct file lookup instead of scanning all directories
        if '_' in conversation_id:
            parts = conversation_id.rsplit('_', 1)  # Split from the right in case experiment_id contains underscores
            if len(parts) == 2:
                experiment_id, iteration_str = parts
                try:
                    iteration = int(iteration_str)
                    file_path = self._get_conversation_path(experiment_id, iteration)
                    if file_path.exists():
                        return self.file_writer.read_json_safe(file_path)
                except (ValueError, TypeError):
                    pass  # Not a valid iteration number, continue with fallback
        
        # Fallback: Search through all experiment directories (for legacy data)
        for experiment_dir in self.experiments_dir.iterdir():
            if experiment_dir.is_dir():
                conversations_dir = experiment_dir / "conversations"
                if conversations_dir.exists():
                    for file_path in conversations_dir.glob("*.json"):
                        conversation = self.file_writer.read_json_safe(file_path)
                        if conversation and conversation.get('id') == conversation_id:
                            return conversation
        
        # Fallback: Search through imported conversations with legacy timestamped filenames
        if self.imported_dir.exists():
            for file_path in self.imported_dir.glob("*.json"):
                if file_path.name == f"{conversation_id}.json":
                    continue  # Already checked above
                conversation = self.file_writer.read_json_safe(file_path)
                if conversation and conversation.get('id') == conversation_id:
                    return conversation
        
        return None
    
    def update_conversation(self, conversation_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing imported conversation with new data.
        
        Args:
            conversation_id: The ID of the conversation to update
            updates: Dictionary of fields to update
            
        Returns:
            True if successful, False if conversation not found
        """
        # Get existing conversation
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return False
        
        # Only allow updating imported conversations
        if conversation.get('source') == 'experiment':
            raise StorageError("Experiment conversations should use save_experiment_conversation")
        
        # Update fields
        conversation.update(updates)
        
        # Save back using deterministic filename
        return self.save_conversation(conversation)

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete an imported conversation (legacy method).
        
        Handles both deterministic {id}.json filenames and legacy timestamped filenames.
        """
        if not self.imported_dir.exists():
            return False
        
        # Try deterministic filename first
        deterministic_path = self.imported_dir / f"{conversation_id}.json"
        if deterministic_path.exists():
            try:
                deterministic_path.unlink()
                return True
            except Exception as e:
                raise StorageError(f"Error deleting conversation {deterministic_path}: {e}")
        
        # Fallback: Search through all files to find conversation with matching ID
        for file_path in self.imported_dir.glob("*.json"):
            conversation = self.file_writer.read_json_safe(file_path)
            if conversation and conversation.get('id') == conversation_id:
                try:
                    file_path.unlink()
                    return True
                except Exception as e:
                    raise StorageError(f"Error deleting conversation {file_path}: {e}")
        
        return False
    
    def clear_all(self) -> bool:
        """Clear all conversation data (for testing/debugging)."""
        try:
            # Clear legacy imported conversations
            if self.imported_dir.exists():
                import shutil
                shutil.rmtree(self.imported_dir)
                self.imported_dir.mkdir(exist_ok=True)
            
            return True
        except Exception as e:
            raise StorageError(f"Error clearing conversation data: {e}")
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored conversation data."""
        # Count legacy imported conversations
        imported_count = 0
        if self.imported_dir.exists():
            imported_count = len(list(self.imported_dir.glob("*.json")))
        
        return {
            "imported_conversation_count": imported_count,
            "imported_directory": str(self.imported_dir.absolute())
        }

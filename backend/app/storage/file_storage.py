"""
File-based storage implementation.
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid
import re
from filelock import FileLock

from ..core.config import settings
from ..core.exceptions import StorageError
from .base import BaseStorage


class FileStorage(BaseStorage):
    """File-based storage for experiments and conversations."""
    
    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir or settings.data_directory)
        self.experiments_dir = self.data_dir / settings.experiments_directory
        self.index_file = self.data_dir / 'experiments_index.json'
        self.index_lock_file = self.data_dir / 'experiments_index.lock'
        
        # Create directories if they don't exist
        self.experiments_dir.mkdir(parents=True, exist_ok=True)

        if not self.index_file.exists():
            self._rebuild_index()

    def _read_index(self) -> List[Dict[str, Any]]:
        """Reads the experiment index file with locking."""
        lock = FileLock(self.index_lock_file)
        with lock:
            if not self.index_file.exists():
                return []
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []

    def _write_index(self, experiments_list: List[Dict[str, Any]]):
        """Writes to the experiment index file with locking."""
        lock = FileLock(self.index_lock_file)
        with lock:
            try:
                with open(self.index_file, 'w', encoding='utf-8') as f:
                    json.dump(experiments_list, f, indent=2, ensure_ascii=False, default=str)
            except IOError as e:
                raise StorageError(f"Error writing index file: {e}")

    def _rebuild_index(self):
        """Rebuilds the experiment index from scratch."""
        experiments = []
        if self.experiments_dir.exists():
            for experiment_dir in self.experiments_dir.iterdir():
                if experiment_dir.is_dir():
                    experiment_file = experiment_dir / "experiment.json"
                    if experiment_file.exists():
                        experiment_data = self._read_json_file(experiment_file)
                        if experiment_data:
                            experiments.append({
                                'id': experiment_data.get('id'),
                                'title': experiment_data.get('title'),
                                'created_at': experiment_data.get('created_at'),
                                'status': experiment_data.get('status'),
                            })
        
        experiments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        self._write_index(experiments)
    
    def _get_experiment_path(self, experiment_id: str) -> Path:
        """Get the path to an experiment's metadata file."""
        return self.experiments_dir / experiment_id / "experiment.json"

    def _get_experiment_conversations_dir(self, experiment_id: str) -> Path:
        """Get the conversations directory for a specific experiment."""
        return self.experiments_dir / experiment_id / "conversations"

    def _get_conversation_path(self, experiment_id: str, iteration: int) -> Path:
        """Get the path for a conversation file."""
        conversations_dir = self._get_experiment_conversations_dir(experiment_id)
        return conversations_dir / f"{iteration}.json"
    
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
            # Ensure parent directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
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

        if 'created_at' not in experiment:
            experiment['created_at'] = datetime.utcnow().isoformat()

        file_path = self._get_experiment_path(experiment_id)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        if self._write_json_file(file_path, experiment):
            index = self._read_index()
            
            # Create a slim version of the experiment for the index
            experiment_metadata = {
                'id': experiment.get('id'),
                'title': experiment.get('title'),
                'created_at': experiment.get('created_at'),
                'status': experiment.get('status'),
            }

            # Find if experiment already exists in index
            found = False
            for i, exp in enumerate(index):
                if exp['id'] == experiment_id:
                    index[i] = experiment_metadata
                    found = True
                    break
            
            if not found:
                index.append(experiment_metadata)
            
            index.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            self._write_index(index)
            return True
        return False

    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        file_path = self._get_experiment_path(experiment_id)
        return self._read_json_file(file_path)

    def get_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments from the index."""
        if not self.index_file.exists():
            self._rebuild_index()
        
        experiments = self._read_index()
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
        """Delete an experiment and its conversations folder."""
        try:
            experiment_dir = self.experiments_dir / experiment_id
            if experiment_dir.exists() and experiment_dir.is_dir():
                import shutil
                shutil.rmtree(experiment_dir)

                index = self._read_index()
                index = [exp for exp in index if exp['id'] != experiment_id]
                self._write_index(index)

                return True
            return False
        except IOError as e:
            raise StorageError(f"Error deleting experiment {experiment_id}: {e}")
    
    # Conversation storage methods - NEW APPROACH
    def save_experiment_conversation(self, experiment_id: str, iteration: int, title: str, conversation: Dict[str, Any], experiment_title: str = None) -> bool:
        """Save an experiment conversation using the new folder structure."""
        file_path = self._get_conversation_path(experiment_id, iteration)
        
        # Ensure the conversations directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Add metadata
        conversation['experiment_id'] = experiment_id
        conversation['iteration'] = iteration
        conversation['title'] = title
        conversation['created_at'] = datetime.utcnow().isoformat()
        
        return self._write_json_file(file_path, conversation)
    
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment from the new folder structure."""
        conversations_dir = self._get_experiment_conversations_dir(experiment_id)
        if not conversations_dir.exists():
            return []

        conversations = []
        for file_path in sorted(conversations_dir.glob("*.json")):
            conversation = self._read_json_file(file_path)
            if conversation:
                conversations.append(conversation)
        
        return conversations
    
    def delete_experiment_conversation(self, experiment_id: str, iteration: int, title: str) -> bool:
        """Delete a specific experiment conversation."""
        file_path = self._get_conversation_path(experiment_id, iteration, title)
        if not file_path or not file_path.exists():
            return False
        
        try:
            file_path.unlink()
            return True
        except IOError as e:
            raise StorageError(f"Error deleting conversation {file_path}: {e}")
    
    # Legacy conversation methods - for imported conversations only
    def save_conversation(self, conversation: Dict[str, Any]) -> bool:
        """Save an imported conversation (legacy method)."""
        # Only allow imported conversations, not experiment conversations
        if conversation.get('source') == 'experiment':
            raise StorageError("Experiment conversations should use save_experiment_conversation")
        
        conversation_id = conversation.get('id')
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation['id'] = conversation_id
        
        # Ensure imported_at is set
        if 'imported_at' not in conversation:
            conversation['imported_at'] = datetime.utcnow().isoformat()
        
        # Save to a legacy conversations folder
        legacy_dir = self.data_dir / "imported_conversations"
        legacy_dir.mkdir(exist_ok=True)
        
        # Create filename with current date/time and conversation title
        current_time = datetime.utcnow()
        date_time_str = current_time.strftime("%Y-%m-%d_%H-%M-%S")
        
        # Get conversation title and clean it for filename
        title = conversation.get('title', 'untitled')
        safe_title = re.sub(r'[^\w\s-]', '', title).strip()
        safe_title = re.sub(r'[-\s]+', '_', safe_title)
        safe_title = safe_title[:50]  # Limit length
        
        filename = f"{date_time_str}_{safe_title}.json"
        file_path = legacy_dir / filename
        
        return self._write_json_file(file_path, conversation)
    
    def get_conversations(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get imported conversations only (legacy method)."""
        if source == 'experiment':
            return []  # Experiment conversations are now stored differently
        
        legacy_dir = self.data_dir / "imported_conversations"
        if not legacy_dir.exists():
            return []
        
        conversations = []
        for file_path in legacy_dir.glob("*.json"):
            conversation = self._read_json_file(file_path)
            if conversation:
                if source is None or conversation.get('source') == source:
                    conversations.append(conversation)
        
        # Sort by imported_at (newest first)
        conversations.sort(key=lambda x: x.get('imported_at', ''), reverse=True)
        return conversations
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a single conversation by its ID from any storage location."""
        # Check imported conversations first
        imported_conversations_dir = self.data_dir / "imported_conversations"
        imported_conv_path = imported_conversations_dir / f"{conversation_id}.json"
        if imported_conv_path.exists():
            return self._read_json_file(imported_conv_path)

        # Check experiment conversations
        for experiment_dir in self.experiments_dir.iterdir():
            if experiment_dir.is_dir():
                conversations_dir = experiment_dir / "conversations"
                if conversations_dir.exists():
                    for file_path in conversations_dir.glob("*.json"):
                        # The conversation_id for experiment conversations is <experiment_id>_<iteration>
                        try:
                            experiment_id = experiment_dir.name
                            iteration = file_path.stem
                            if f"{experiment_id}_{iteration}" == conversation_id:
                                return self._read_json_file(file_path)
                        except:
                            continue
        return None

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete an imported conversation (legacy method)."""
        legacy_dir = self.data_dir / "imported_conversations"
        if not legacy_dir.exists():
            return False
        
        # Search through all files to find conversation with matching ID
        for file_path in legacy_dir.glob("*.json"):
            conversation = self._read_json_file(file_path)
            if conversation and conversation.get('id') == conversation_id:
                try:
                    file_path.unlink()
                    return True
                except IOError as e:
                    raise StorageError(f"Error deleting conversation {file_path}: {e}")
        
        return False
    
    # Utility methods
    def clear_all(self) -> bool:
        """Clear all stored data (for testing/debugging)."""
        try:
            # Clear experiments and their conversation folders
            for file_path in self.experiments_dir.glob("*.json"):
                if file_path.parent == self.experiments_dir:  # Only experiment files, not conversations
                    file_path.unlink()
            
            # Clear conversation subdirectories
            for subdir in self.experiments_dir.iterdir():
                if subdir.is_dir():
                    import shutil
                    shutil.rmtree(subdir)
            
            # Clear legacy imported conversations
            legacy_dir = self.data_dir / "imported_conversations"
            if legacy_dir.exists():
                import shutil
                shutil.rmtree(legacy_dir)
            
            return True
        except IOError as e:
            raise StorageError(f"Error clearing data: {e}")
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored data."""
        experiment_count = len(list(self.experiments_dir.glob("*.json")))
        
        # Count conversations in experiment subdirectories
        conversation_count = 0
        for subdir in self.experiments_dir.iterdir():
            if subdir.is_dir():
                conversation_count += len(list(subdir.glob("*.json")))
        
        # Count legacy imported conversations
        legacy_dir = self.data_dir / "imported_conversations"
        if legacy_dir.exists():
            conversation_count += len(list(legacy_dir.glob("*.json")))
        
        return {
            "experiment_count": experiment_count,
            "conversation_count": conversation_count,
            "data_directory": str(self.data_dir.absolute())
        }



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

from ..core.config import settings
from ..core.exceptions import StorageError
from .base import BaseStorage


class FileStorage(BaseStorage):
    """File-based storage for experiments and conversations."""
    
    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir or settings.data_directory)
        self.experiments_dir = self.data_dir / settings.experiments_directory
        
        # Create directories if they don't exist
        self.experiments_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_experiment_path(self, experiment_id: str) -> Path:
        """Get the path to an experiment file by searching in subdirectories."""
        # First check if there's a direct experiment file (legacy)
        direct_path = self.experiments_dir / f"{experiment_id}.json"
        if direct_path.exists():
            return direct_path
        
        # Search in subdirectories for the experiment file
        for subdir in self.experiments_dir.iterdir():
            if subdir.is_dir():
                experiment_file = subdir / f"{experiment_id}.json"
                if experiment_file.exists():
                    return experiment_file
        
        # If not found, return the default path (will be created in experiments root)
        return direct_path
    
    def _get_experiment_conversations_dir(self, experiment_id: str, experiment_title: str = None) -> Path:
        """Get the conversations directory for a specific experiment."""
        # We need experiment_title to create the folder
        if not experiment_title:
            return None
        
        # Create a safe folder name from the experiment title
        safe_title = re.sub(r'[^\w\s-]', '', experiment_title).strip()
        safe_title = re.sub(r'[-\s]+', '_', safe_title)
        safe_title = safe_title[:50]  # Limit length
        
        # Check if folder with this name already exists and add numbering if needed
        base_folder_name = safe_title
        counter = 1
        folder_name = base_folder_name
        
        while True:
            folder_path = self.experiments_dir / folder_name
            if not folder_path.exists():
                break
            
            # Check if this folder belongs to the same experiment
            # Look for any conversation file with this experiment_id
            has_conversation_from_same_experiment = False
            for conv_file in folder_path.glob("*.json"):
                try:
                    conv_data = self._read_json_file(conv_file)
                    if conv_data and conv_data.get('experiment_id') == experiment_id:
                        has_conversation_from_same_experiment = True
                        break
                except:
                    continue
            
            # If it's the same experiment, use the existing folder
            if has_conversation_from_same_experiment:
                break
            
            # If it's a different experiment with the same name, add numbering
            folder_name = f"{base_folder_name}_{counter:03d}"
            counter += 1
        
        # Create folder path: experiments/{folder_name}/
        folder_path = self.experiments_dir / folder_name
        
        # Create the folder if it doesn't exist
        folder_path.mkdir(exist_ok=True)
        
        return folder_path
    
    def _get_conversation_path(self, experiment_id: str, iteration: int, title: str, experiment_title: str = None) -> Path:
        """Get the path for a conversation file using the new naming convention."""
        conversations_dir = self._get_experiment_conversations_dir(experiment_id, experiment_title)
        if not conversations_dir:
            return None
        
        # Create safe filename: {iteration:03d}_conversation.json
        filename = f"{iteration:03d}_conversation.json"
        return conversations_dir / filename
    
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
        
        # Ensure created_at is set
        if 'created_at' not in experiment:
            experiment['created_at'] = datetime.utcnow().isoformat()
        
        # Get the experiment path (this will determine where to save it)
        file_path = self._get_experiment_path(experiment_id)
        
        # If the file path is in the root experiments directory, we need to move it to a subdirectory
        if file_path.parent == self.experiments_dir:
            # Find the correct subdirectory for this experiment
            # We need to get the title from the experiment data to create the folder
            title = experiment.get('title', 'Unknown Experiment')
            if title.startswith('Experiment: '):
                title = title[12:]
            
            # Create safe folder name
            safe_title = re.sub(r'[^\w\s-]', '', title).strip()
            safe_title = re.sub(r'[-\s]+', '_', safe_title)
            safe_title = safe_title[:50]  # Limit length
            
            # Check if folder with this name already exists and add numbering if needed
            base_folder_name = safe_title
            counter = 1
            folder_name = base_folder_name
            
            while True:
                folder_path = self.experiments_dir / folder_name
                if not folder_path.exists():
                    break
                
                # Check if this folder belongs to the same experiment
                experiment_file_in_folder = folder_path / f"{experiment_id}.json"
                if experiment_file_in_folder.exists():
                    break
                
                # If it's a different experiment with the same name, add numbering
                folder_name = f"{base_folder_name}_{counter:03d}"
                counter += 1
            
            # Create the folder and save experiment file there
            folder_path = self.experiments_dir / folder_name
            folder_path.mkdir(exist_ok=True)
            file_path = folder_path / f"{experiment_id}.json"
        
        return self._write_json_file(file_path, experiment)
    
    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        # Since we don't save experiment metadata, reconstruct from conversations
        conversations = self.get_experiment_conversations(experiment_id)
        if not conversations:
            return None
        
        # Create experiment object from conversation data
        first_conv = conversations[0]
        experiment = {
            'id': experiment_id,
            'title': f"Experiment: {first_conv.get('title', 'Unknown')}",
            'status': 'running',
            'created_at': first_conv.get('created_at', ''),
            'iterations': len(conversations),
            'current_iteration': max(conv.get('iteration', 0) for conv in conversations)
        }
        return experiment
    
    def get_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments."""
        experiments = []
        
        # Since we don't save experiment metadata anymore, we need to reconstruct
        # experiment information from conversation files in subdirectories
        
        # Check subdirectories for experiment conversations
        for subdir in self.experiments_dir.iterdir():
            if subdir.is_dir():
                # Get all conversations from this folder
                conversations = []
                for file_path in subdir.glob("*.json"):
                    conversation = self._read_json_file(file_path)
                    if conversation:
                        conversations.append(conversation)
                
                if conversations:
                    # Group conversations by experiment_id
                    experiment_groups = {}
                    for conv in conversations:
                        exp_id = conv.get('experiment_id')
                        if exp_id:
                            if exp_id not in experiment_groups:
                                experiment_groups[exp_id] = []
                            experiment_groups[exp_id].append(conv)
                    
                    # Create experiment objects from conversation data
                    for exp_id, convs in experiment_groups.items():
                        if convs:
                            # Use the first conversation to get basic info
                            first_conv = convs[0]
                            experiment = {
                                'id': exp_id,
                                'title': f"Experiment: {subdir.name}",
                                'status': 'running',
                                'created_at': first_conv.get('created_at', ''),
                                'iterations': len(convs),
                                'current_iteration': max(conv.get('iteration', 0) for conv in convs)
                            }
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
        """Delete an experiment and its conversations folder."""
        try:
            # Find the conversations directory for this experiment
            conversations_dir = None
            for subdir in self.experiments_dir.iterdir():
                if subdir.is_dir():
                    # Check if this folder contains conversations from this experiment
                    for file_path in subdir.glob("*.json"):
                        try:
                            conv_data = self._read_json_file(file_path)
                            if conv_data and conv_data.get('experiment_id') == experiment_id:
                                conversations_dir = subdir
                                break
                        except:
                            continue
                    if conversations_dir:
                        break
            
            # Delete conversations directory and all files
            if conversations_dir and conversations_dir.exists():
                import shutil
                shutil.rmtree(conversations_dir)
            
            return True
        except IOError as e:
            raise StorageError(f"Error deleting experiment {experiment_id}: {e}")
    
    # Conversation storage methods - NEW APPROACH
    def save_experiment_conversation(self, experiment_id: str, iteration: int, title: str, conversation: Dict[str, Any], experiment_title: str = None) -> bool:
        """Save an experiment conversation using the new folder structure."""
        # Get the conversation file path (this will create folder if needed)
        file_path = self._get_conversation_path(experiment_id, iteration, title, experiment_title)
        if not file_path:
            return False
        
        # Add metadata
        conversation['experiment_id'] = experiment_id
        conversation['iteration'] = iteration
        conversation['title'] = title
        conversation['created_at'] = datetime.utcnow().isoformat()
        
        return self._write_json_file(file_path, conversation)
    
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment from the new folder structure."""
        conversations = []
        
        # Search through all experiment folders for conversations with this experiment_id
        for subdir in self.experiments_dir.iterdir():
            if subdir.is_dir():
                for file_path in subdir.glob("*.json"):
                    try:
                        conversation = self._read_json_file(file_path)
                        if conversation and conversation.get('experiment_id') == experiment_id:
                            conversations.append(conversation)
                    except:
                        continue
        
        # Sort by iteration number
        conversations.sort(key=lambda x: x.get('iteration', 0))
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
        """Get a conversation by ID (searches both imported and experiment conversations)."""
        # First check imported conversations
        legacy_dir = self.data_dir / "imported_conversations"
        if legacy_dir.exists():
            # Search through all files to find conversation with matching ID
            for file_path in legacy_dir.glob("*.json"):
                conversation = self._read_json_file(file_path)
                if conversation and conversation.get('id') == conversation_id:
                    return conversation
        
        # If not found in imported conversations, search in experiment conversations
        for experiment_dir in self.experiments_dir.iterdir():
            if experiment_dir.is_dir():
                for conv_file in experiment_dir.glob("*.json"):
                    conversation = self._read_json_file(conv_file)
                    if conversation and conversation.get('id') == conversation_id:
                        return conversation
        
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


 
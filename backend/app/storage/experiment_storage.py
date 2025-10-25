"""
Experiment-specific storage operations.
"""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from ..core.config import settings
from ..core.exceptions import StorageError
from ..utils.file_utilities import FileLockManager, AtomicFileWriter, StorageIndex
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ExperimentStorage:
    """Handles experiment-specific storage operations."""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.experiments_dir = data_dir / settings.experiments_directory
        self.lock_manager = FileLockManager()
        self.file_writer = AtomicFileWriter()
        
        # Initialize storage index
        self.index_file = data_dir / 'experiments_index.json'
        self.index_lock_file = data_dir / 'experiments_index.lock'
        self.index = StorageIndex(self.index_file, self.index_lock_file)
        
        # Create directories if they don't exist
        self.experiments_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize index if it doesn't exist
        if not self.index_file.exists():
            self.index.rebuild_index(self.experiments_dir)
    
    def _get_experiment_path(self, experiment_id: str) -> Path:
        """Get the path to an experiment's metadata file."""
        return self.experiments_dir / experiment_id / "experiment.json"
    
    def _get_experiment_lock_path(self, experiment_id: str) -> Path:
        """Get the lock file path for a specific experiment."""
        return self.lock_manager.get_experiment_lock_path(self.data_dir, experiment_id)
    
    def save_experiment(self, experiment: Dict[str, Any]) -> bool:
        """Save an experiment to a JSON file with validation and locking."""
        experiment_id = experiment.get('id')
        if not experiment_id:
            experiment_id = str(uuid.uuid4())
            experiment['id'] = experiment_id

        if 'created_at' not in experiment:
            experiment['created_at'] = datetime.utcnow().isoformat()

        file_path = self._get_experiment_path(experiment_id)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Use per-experiment lock to prevent concurrent writes
        lock_path = self._get_experiment_lock_path(experiment_id)
        lock = self.lock_manager.get_lock(lock_path)
        
        try:
            with lock:
                return self._save_experiment_internal(experiment_id, experiment, file_path)
        except Exception as e:
            raise StorageError(f"Error saving experiment: {e}")
    
    def _save_experiment_internal(self, experiment_id: str, experiment: Dict[str, Any], file_path: Path) -> bool:
        """Internal method to save experiment without locking (called from within locked context)."""
        # Write experiment file
        if self.file_writer.write_json_atomic(file_path, experiment):
            # Update index
            self._update_index(experiment_id, experiment)
            return True
        return False
    
    def _update_index(self, experiment_id: str, experiment: Dict[str, Any]):
        """Update the experiment index."""
        index = self.index.read_index()
        
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
        self.index.write_index(index)
    
    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        file_path = self._get_experiment_path(experiment_id)
        return self.file_writer.read_json_safe(file_path)
    
    def get_experiments(self) -> list:
        """Get all experiments from the index."""
        if not self.index_file.exists():
            self.index.rebuild_index(self.experiments_dir)
        
        experiments = self.index.read_index()
        experiments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return experiments
    
    def update_experiment(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing experiment with new data, using locking."""
        # Use per-experiment lock
        lock_path = self._get_experiment_lock_path(experiment_id)
        lock = self.lock_manager.get_lock(lock_path)
        
        try:
            with lock:
                experiment = self.get_experiment(experiment_id)
                if not experiment:
                    return False
                
                experiment.update(updates)
                file_path = self._get_experiment_path(experiment_id)
                # Call internal method that doesn't try to acquire lock again
                return self._save_experiment_internal(experiment_id, experiment, file_path)
        except Exception as e:
            raise StorageError(f"Error updating experiment: {e}")
    
    def delete_experiment(self, experiment_id: str) -> bool:
        """Delete an experiment and its conversations folder."""
        try:
            experiment_dir = self.experiments_dir / experiment_id
            if experiment_dir.exists() and experiment_dir.is_dir():
                import shutil
                shutil.rmtree(experiment_dir)

                # Update index
                index = self.index.read_index()
                index = [exp for exp in index if exp['id'] != experiment_id]
                self.index.write_index(index)

                return True
            return False
        except Exception as e:
            raise StorageError(f"Error deleting experiment {experiment_id}: {e}")
    
    def clear_all(self) -> bool:
        """Clear all experiment data (for testing/debugging)."""
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
            
            return True
        except Exception as e:
            raise StorageError(f"Error clearing experiment data: {e}")
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored experiment data."""
        experiment_count = len(list(self.experiments_dir.glob("*.json")))
        
        # Count conversations in experiment subdirectories
        conversation_count = 0
        for subdir in self.experiments_dir.iterdir():
            if subdir.is_dir():
                conversation_count += len(list(subdir.glob("*.json")))
        
        return {
            "experiment_count": experiment_count,
            "conversation_count": conversation_count,
            "data_directory": str(self.data_dir.absolute())
        }

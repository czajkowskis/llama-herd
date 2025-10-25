"""
File operation utilities for atomic writes and locking.
"""
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, Type
from filelock import FileLock

from ..utils.logging import get_logger

logger = get_logger(__name__)


class FileLockManager:
    """Manages file locking operations."""
    
    def __init__(self, lock_timeout: int = 30):
        self.lock_timeout = lock_timeout
    
    def get_lock(self, lock_path: Path) -> FileLock:
        """Get a file lock for the specified path."""
        return FileLock(lock_path, timeout=self.lock_timeout)
    
    def get_experiment_lock_path(self, data_dir: Path, experiment_id: str) -> Path:
        """Get the lock file path for a specific experiment."""
        locks_dir = data_dir / '.locks'
        locks_dir.mkdir(parents=True, exist_ok=True)
        return locks_dir / f"{experiment_id}.lock"


class AtomicFileWriter:
    """Handles atomic file writing operations."""
    
    @staticmethod
    def write_json_atomic(file_path: Path, data: Dict[str, Any], validate_model: Optional[Type] = None) -> bool:
        """
        Write data to a JSON file using atomic write for safety.
        
        Args:
            file_path: Path to write to
            data: Data to write
            validate_model: Optional Pydantic model to validate data
            
        Returns:
            True if successful
        """
        try:
            # Validate data if model provided
            if validate_model:
                validate_model(**data)
            
            # Ensure parent directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Use atomic write
            tmp_path = str(file_path) + '.tmp'
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # Atomic move
            os.replace(tmp_path, str(file_path))
            return True
            
        except Exception as e:
            logger.error(f"Failed to write {file_path}: {e}")
            # Clean up temp file if it exists
            tmp_path = str(file_path) + '.tmp'
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
            raise
    
    @staticmethod
    def read_json_safe(file_path: Path) -> Optional[Dict[str, Any]]:
        """
        Read a JSON file safely, returning None if file doesn't exist or is invalid.
        
        Args:
            file_path: Path to read from
            
        Returns:
            JSON data or None if file doesn't exist or is invalid
        """
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to read {file_path}: {e}")
        return None


class StorageIndex:
    """Manages storage index operations."""
    
    def __init__(self, index_file: Path, index_lock_file: Path):
        self.index_file = index_file
        self.index_lock_file = index_lock_file
        self.file_writer = AtomicFileWriter()
    
    def read_index(self) -> list:
        """Read the index file with locking."""
        lock = FileLock(self.index_lock_file)
        with lock:
            return self.file_writer.read_json_safe(self.index_file) or []
    
    def write_index(self, experiments_list: list):
        """Write to the index file with locking and atomic writes."""
        lock = FileLock(self.index_lock_file)
        with lock:
            try:
                # Validate each entry
                validated_entries = []
                for exp in experiments_list:
                    try:
                        # Basic validation - ensure required fields exist
                        if not isinstance(exp, dict) or not exp.get('id'):
                            continue
                        validated_entries.append(exp)
                    except Exception as e:
                        logger.warning(f"Skipping invalid index entry: {e}")
                        continue
                
                # Use atomic write
                self.file_writer.write_json_atomic(self.index_file, validated_entries)
            except Exception as e:
                logger.error(f"Error writing index file: {e}")
                raise
    
    def rebuild_index(self, experiments_dir: Path):
        """Rebuild the index from scratch by scanning experiment directories."""
        experiments = []
        if experiments_dir.exists():
            for experiment_dir in experiments_dir.iterdir():
                if experiment_dir.is_dir():
                    experiment_file = experiment_dir / "experiment.json"
                    if experiment_file.exists():
                        experiment_data = self.file_writer.read_json_safe(experiment_file)
                        if experiment_data:
                            experiments.append({
                                'id': experiment_data.get('id'),
                                'title': experiment_data.get('title'),
                                'created_at': experiment_data.get('created_at'),
                                'status': experiment_data.get('status'),
                            })
        
        experiments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        self.write_index(experiments)

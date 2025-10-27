"""
Persistence service for pull tasks.
"""
import json
import os
from datetime import datetime
from typing import Dict, Any
from pathlib import Path
from filelock import FileLock

from ..core.config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)


class PullPersistence:
    """Handles persistence of pull tasks to disk."""
    
    def __init__(self):
        # Persistence setup
        try:
            data_dir = Path(getattr(settings, 'data_directory', '.'))
            data_dir.mkdir(parents=True, exist_ok=True)
            self._persistence_file = data_dir / 'pull_tasks.json'
            self._persistence_lock = data_dir / 'pull_tasks.lock'
        except Exception:
            self._persistence_file = None
            self._persistence_lock = None
    
    def serialize_task(self, task) -> Dict[str, Any]:
        """Serialize a PullTask to dictionary format."""
        return {
            'task_id': task.task_id,
            'model_name': task.model_name,
            'status': task.status,
            'progress': task.progress,
            'error': task.error,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'last_progress_update': task.last_progress_update.isoformat() if task.last_progress_update else None,
            'retry_count': task.retry_count,
            'last_retry_at': task.last_retry_at.isoformat() if task.last_retry_at else None,
        }
    
    def deserialize_task(self, data: Dict[str, Any], task_class):
        """Deserialize dictionary data to PullTask object."""
        def parse_dt(v):
            return datetime.fromisoformat(v) if v else None
        
        return task_class(
            task_id=data.get('task_id'),
            model_name=data.get('model_name'),
            status=data.get('status', 'pending'),
            progress=data.get('progress'),
            error=data.get('error'),
            created_at=parse_dt(data.get('created_at')),
            started_at=parse_dt(data.get('started_at')),
            completed_at=parse_dt(data.get('completed_at')),
            last_progress_update=parse_dt(data.get('last_progress_update')),
            retry_count=data.get('retry_count', 0),
            last_retry_at=parse_dt(data.get('last_retry_at')),
        )
    
    def persist_tasks(self, tasks: Dict[str, Any]):
        """Persist tasks to disk with atomic write."""
        if not self._persistence_file:
            return
        
        try:
            lock = FileLock(str(self._persistence_lock))
            with lock:
                # Use atomic write
                tmp = str(self._persistence_file) + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    json.dump(tasks, f, ensure_ascii=False, indent=2)
                os.replace(tmp, str(self._persistence_file))
        except Exception:
            logger.exception("Failed to persist pull tasks")
    
    def load_persisted_tasks(self, task_class):
        """Load persisted tasks from disk."""
        if not self._persistence_file or not self._persistence_file.exists():
            return {}
        
        try:
            lock = FileLock(str(self._persistence_lock))
            with lock:
                with open(self._persistence_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            
            # Rebuild tasks
            tasks = {}
            for tid, tdata in data.items():
                task = self.deserialize_task(tdata, task_class)
                # If a task was previously running, mark as error/stale
                if task.status == 'running':
                    task.status = 'error'
                    task.error = 'Interrupted by server restart'
                # Ensure no live handles or events
                task.task_handle = None
                task.stop_event = None
                tasks[tid] = task
            
            return tasks
        except Exception:
            logger.exception("Failed to load persisted pull tasks")
            return {}

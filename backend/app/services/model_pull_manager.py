"""
Background task manager for model pulls to allow concurrent API access.
"""
import asyncio
import threading
import uuid
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass
from datetime import datetime
import logging
import time
import shutil
import os

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class PullTask:
    """Represents a background model pull task."""
    task_id: str
    model_name: str
    status: str  # 'pending', 'running', 'completed', 'error', 'cancelled'
    progress: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    task_handle: Optional[threading.Thread] = None
    last_progress_update: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()


class ModelPullManager:
    """Manages background model pull tasks."""

    def __init__(self):
        self.tasks: Dict[str, PullTask] = {}
        self.progress_callbacks: Dict[str, Callable[[str, Dict[str, Any]], None]] = {}
        self._lock = threading.Lock()
        self.cleanup_thread: Optional[threading.Thread] = None
        self._running = True
        self._start_cleanup_thread()

    def _check_disk_space(self, required_bytes: int) -> bool:
        """Check if sufficient disk space is available."""
        try:
            from ..core.config import settings
            models_dir = os.path.expanduser(settings.ollama_models_dir)
            stat = shutil.disk_usage(models_dir)
            available_bytes = stat.free
            buffer_space = 1024 * 1024 * 1024  # 1GB buffer
            return available_bytes >= (required_bytes + buffer_space)
        except Exception as e:
            logger.error(f"Failed to check disk space: {e}")
            return True  # Allow download if check fails

    def _get_model_size_estimate(self, model_name: str) -> int:
        """Get estimated model size from catalog or Ollama API."""
        try:
            # First try to get from local catalog
            from ..api.routes.models import _get_model_catalog_data
            catalog = _get_model_catalog_data()
            for model in catalog:
                if model["tag"] == model_name:
                    return model["size"]
            
            # If not in catalog, try Ollama API show endpoint
            import requests
            from ..core.config import settings
            response = requests.get(
                f"{settings.ollama_url}/api/show",
                params={"name": model_name},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                # Ollama show API returns size in bytes
                return data.get("size", 0)
            
            # Default fallback size (2GB)
            logger.warning(f"Could not determine size for model {model_name}, using default 2GB estimate")
            return 2 * 1024 * 1024 * 1024
            
        except Exception as e:
            logger.error(f"Failed to get model size estimate for {model_name}: {e}")
            # Default fallback size (2GB)
            return 2 * 1024 * 1024 * 1024

    def create_pull_task(self, model_name: str) -> str:
        """Create a new pull task and return its ID."""
        task_id = str(uuid.uuid4())
        task = PullTask(
            task_id=task_id,
            model_name=model_name,
            status='pending'
        )
        with self._lock:
            self.tasks[task_id] = task
        logger.info(f"Created pull task {task_id} for model {model_name}")
        return task_id

    def start_pull_task(self, task_id: str, pull_function: Callable) -> bool:
        """Start a pull task in a background thread."""
        with self._lock:
            if task_id not in self.tasks:
                return False
            task = self.tasks[task_id]
            if task.status != 'pending':
                return False
            task.status = 'running'
            task.started_at = datetime.now()
            task.last_progress_update = datetime.now()
            # Create background thread
            task.task_handle = threading.Thread(
                target=self._run_pull_task,
                args=(task_id, pull_function),
                daemon=True
            )
            task.task_handle.start()
        logger.info(f"Started pull task {task_id} for model {task.model_name}")
        return True

    def _run_pull_task(self, task_id: str, pull_function: Callable):
        """Run the pull task in a background thread and handle completion/errors."""
        try:
            pull_function(task_id)
            # Task completed successfully
            if task_id in self.tasks:
                task = self.tasks[task_id]
                # Only mark as completed if not already cancelled
                if task.status != 'cancelled':
                    task.status = 'completed'
                    task.completed_at = datetime.now()
                    logger.info(f"Pull task {task_id} completed successfully")
        except Exception as e:
            # Task failed - mark as error and clean up immediately
            if task_id in self.tasks:
                task = self.tasks[task_id]
                # Don't override cancelled status with error
                if task.status != 'cancelled':
                    task.status = 'error'
                    task.error = str(e)
                    task.completed_at = datetime.now()
                    logger.error(f"Pull task {task_id} failed: {e}")

                    # Clean up failed task immediately
                    self._cleanup_failed_task(task_id)

    def get_pull_task(self, task_id: str) -> Optional[PullTask]:
        """Get a pull task by ID."""
        with self._lock:
            return self.tasks.get(task_id)

    def get_all_pull_tasks(self) -> Dict[str, PullTask]:
        """Get all pull tasks."""
        with self._lock:
            return self.tasks.copy()

    def register_progress_callback(self, task_id: str, callback: Callable[[str, Dict[str, Any]], None]):
        """Register a callback for progress updates."""
        with self._lock:
            self.progress_callbacks[task_id] = callback

    def unregister_progress_callback(self, task_id: str):
        """Unregister a progress callback."""
        with self._lock:
            self.progress_callbacks.pop(task_id, None)

    def _cleanup_failed_task(self, task_id: str):
        """Clean up a failed task from the active downloads."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                if task.status == 'error':
                    self.tasks.pop(task_id, None)
                    self.progress_callbacks.pop(task_id, None)
                    logger.info(f"Cleaned up failed pull task {task_id}")

    def update_progress(self, task_id: str, progress: Dict[str, Any]):
        """Update progress for a running task."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                # Add disk space information to progress
                try:
                    from ..core.config import settings
                    models_dir = os.path.expanduser(settings.ollama_models_dir)
                    stat = shutil.disk_usage(models_dir)
                    available_gb = stat.free / (1024 * 1024 * 1024)
                    progress['disk_space_available_gb'] = round(available_gb, 2)
                    # Add warning if disk space is low
                    if available_gb < 2.0:  # Less than 2GB available
                        progress['disk_space_warning'] = f"Low disk space: {available_gb:.2f}GB available"
                    elif available_gb < 5.0:  # Less than 5GB available
                        progress['disk_space_warning'] = f"Disk space running low: {available_gb:.2f}GB available"
                except Exception as e:
                    logger.error(f"Failed to check disk space for progress update: {e}")
                task.progress = progress
                task.last_progress_update = datetime.now()
                # Notify any registered callbacks
                if task_id in self.progress_callbacks:
                    try:
                        self.progress_callbacks[task_id](task_id, progress)
                    except Exception as e:
                        logger.error(f"Error in progress callback for task {task_id}: {e}")

    def cancel_pull_task(self, task_id: str) -> bool:
        """Cancel a running pull task."""
        if task_id not in self.tasks:
            return False

        task = self.tasks[task_id]
        if task.status not in ['pending', 'running'] or not task.task_handle:
            return False

        # For threading, we can't directly cancel like with asyncio
        # Instead, we'll mark it as cancelled and let the pull function handle it
        task.status = 'cancelled'
        task.completed_at = datetime.now()
        logger.info(f"Requested cancellation of pull task {task_id}")
        return True

    def cleanup_stale_tasks(self, stale_threshold_seconds: int = 300):
        """Clean up tasks that haven't had progress updates for a while (likely interrupted)."""
        current_time = datetime.now()
        to_remove = []
        with self._lock:
            for task_id, task in self.tasks.items():
                if task.status == 'running' and task.last_progress_update:
                    time_since_update = (current_time - task.last_progress_update).total_seconds()
                    if time_since_update > stale_threshold_seconds:
                        # Mark as error and schedule cleanup
                        task.status = 'error'
                        task.error = 'Download interrupted - no progress updates received'
                        task.completed_at = datetime.now()
                        to_remove.append(task_id)
                        logger.warning(f"Cleaning up stale pull task {task_id} (no progress for {time_since_update:.0f}s)")
        # Clean up the tasks after marking them as error
        for task_id in to_remove:
            threading.Timer(5.0, self._cleanup_failed_task, args=(task_id,)).start()

    def cleanup_completed_tasks(self, max_age_seconds: int = 3600, failed_age_seconds: int = 300, cancelled_age_seconds: int = 60):
        """Clean up old completed tasks and failed tasks."""
        current_time = datetime.now()
        to_remove = []
        with self._lock:
            for task_id, task in self.tasks.items():
                if task.status == 'completed':
                    # Clean up old completed tasks
                    age = (current_time - task.completed_at).total_seconds() if task.completed_at else 0
                    if age > max_age_seconds:
                        to_remove.append(task_id)
                elif task.status == 'cancelled':
                    # Clean up cancelled tasks after a short delay
                    age = (current_time - task.completed_at).total_seconds() if task.completed_at else 0
                    if age > cancelled_age_seconds:  # 1 minute for cancelled tasks
                        to_remove.append(task_id)
                elif task.status == 'error':
                    # Clean up failed tasks after a short delay
                    age = (current_time - task.completed_at).total_seconds() if task.completed_at else 0
                    if age > failed_age_seconds:  # 5 minutes for failed tasks
                        to_remove.append(task_id)
            for task_id in to_remove:
                self.tasks.pop(task_id, None)
                self.progress_callbacks.pop(task_id, None)
                logger.debug(f"Cleaned up old pull task {task_id}")

    def _start_cleanup_thread(self):
        """Start the background cleanup thread."""
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()

    def _cleanup_worker(self):
        """Background worker that periodically cleans up stale and old tasks."""
        while self._running:
            try:
                # Clean up stale tasks every 60 seconds
                self.cleanup_stale_tasks()
                # Clean up old completed tasks every 10 minutes
                self.cleanup_completed_tasks()
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")

            time.sleep(60)  # Check every minute

    def stop_cleanup(self):
        """Stop the cleanup thread."""
        self._running = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)


# Global instance
pull_manager = ModelPullManager()
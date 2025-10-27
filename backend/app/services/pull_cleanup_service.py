"""
Cleanup service for pull tasks.
"""
import threading
from datetime import datetime
from typing import Dict, Any
from ..utils.logging import get_logger

logger = get_logger(__name__)


class PullCleanupService:
    """Service for cleaning up old and stale pull tasks."""
    
    def __init__(self, task_manager):
        self.task_manager = task_manager
        self._running = True
        self._stop_event = threading.Event()
        self.cleanup_thread: threading.Thread = None
    
    def start_cleanup(self):
        """Start the background cleanup thread."""
        if self.cleanup_thread and self.cleanup_thread.is_alive():
            return
        
        self._running = True
        self._stop_event.clear()
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()
    
    def stop_cleanup(self):
        """Stop the cleanup thread."""
        self._running = False
        # Wake up the worker and join
        try:
            self._stop_event.set()
        except Exception:
            pass
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)
    
    def cleanup_stale_tasks(self, tasks: Dict[str, Any], stale_threshold_seconds: int = 300):
        """Clean up tasks that haven't had progress updates for a while (likely interrupted)."""
        current_time = datetime.now()
        to_remove = []
        
        for task_id, task in tasks.items():
            if task.status == 'running' and task.last_progress_update:
                time_since_update = (current_time - task.last_progress_update).total_seconds()
                if time_since_update > stale_threshold_seconds:
                    # Mark as error and schedule cleanup
                    task.status = 'error'
                    task.error = 'Download interrupted - no progress updates received'
                    task.completed_at = current_time
                    to_remove.append(task_id)
                    logger.warning(f"Cleaning up stale pull task {task_id} (no progress for {time_since_update:.0f}s)")
        
        # Clean up the tasks after marking them as error
        for task_id in to_remove:
            threading.Timer(5.0, self.task_manager._cleanup_failed_task, args=(task_id,)).start()
    
    def cleanup_completed_tasks(
        self, 
        tasks: Dict[str, Any], 
        max_age_seconds: int = 3600, 
        failed_age_seconds: int = 300, 
        cancelled_age_seconds: int = 60
    ):
        """Clean up old completed tasks and failed tasks."""
        current_time = datetime.now()
        to_remove = []
        
        for task_id, task in tasks.items():
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
            tasks.pop(task_id, None)
            logger.debug(f"Cleaned up old pull task {task_id}")
    
    def _cleanup_worker(self):
        """Background worker that periodically cleans up stale and old tasks."""
        while self._running:
            try:
                # Clean up stale tasks every 60 seconds
                tasks = self.task_manager.get_all_pull_tasks()
                self.cleanup_stale_tasks(tasks)
                # Clean up old completed tasks every 10 minutes
                self.cleanup_completed_tasks(tasks)
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")
            # Wait in a wakeable manner so stop_cleanup() can interrupt quickly
            self._stop_event.wait(timeout=60)

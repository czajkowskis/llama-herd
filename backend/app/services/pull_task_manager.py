"""
Simplified pull task manager using extracted services.
"""
import threading
import uuid
from typing import Dict, Optional, Callable, Any, List
from dataclasses import dataclass
from datetime import datetime

from ..services.progress_throttler import ProgressThrottler
from ..services.pull_persistence import PullPersistence
from ..services.pull_cleanup_service import PullCleanupService
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
    # Timestamp (epoch seconds) when we last emitted a progress callback to listeners
    last_emit_time: Optional[float] = None
    # Last emitted percent (0-100) used to decide large-enough deltas
    last_emitted_percent: Optional[float] = None
    stop_event: Optional[threading.Event] = None
    # Retry bookkeeping
    retry_count: int = 0
    last_retry_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()


class PullTaskManager:
    """Simplified manager for background model pull tasks."""

    def __init__(self, start_cleanup: bool = True):
        self.tasks: Dict[str, PullTask] = {}
        # Allow multiple callbacks per task (e.g., multiple websocket clients)
        self.progress_callbacks: Dict[str, List[Callable[[str, Dict[str, Any]], None]]] = {}
        self._lock = threading.Lock()
        
        # Initialize services
        self.progress_throttler = ProgressThrottler()
        self.persistence = PullPersistence()
        self.cleanup_service = PullCleanupService(self)
        
        # Load persisted tasks if any
        try:
            self._load_persisted_tasks()
        except Exception:
            logger.exception("Failed to load persisted pull tasks")
        
        if start_cleanup:
            self.cleanup_service.start_cleanup()

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
            # Create a stop event for cooperative cancellation
            task.stop_event = threading.Event()
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
            # Call the pull function. If the function accepts a stop_event argument, pass it.
            task = None
            with self._lock:
                task = self.tasks.get(task_id)
            # Attempt to call with stop_event if available
            try:
                if task and task.stop_event is not None:
                    pull_function(task_id, task.stop_event)
                else:
                    pull_function(task_id)
            except TypeError:
                # Fallback if pull_function doesn't accept stop_event
                pull_function(task_id)

            # Task completed successfully
            with self._lock:
                if task_id in self.tasks:
                    task = self.tasks[task_id]
                    # Only mark as completed if not already cancelled
                    if task.status != 'cancelled':
                        task.status = 'completed'
                        task.completed_at = datetime.now()
                        logger.info(f"Pull task {task_id} completed successfully")
        except Exception as e:
            # Task failed - mark as error and clean up immediately
            with self._lock:
                if task_id in self.tasks:
                    task = self.tasks[task_id]
                    # Don't override cancelled status with error
                    if task.status != 'cancelled':
                        task.status = 'error'
                        task.error = str(e)
                        task.completed_at = datetime.now()
                        logger.error(f"Pull task {task_id} failed: {e}")

                        # Clean up failed task immediately
                        # schedule cleanup to run outside the lock
                        threading.Timer(0.1, self._cleanup_failed_task, args=(task_id,)).start()

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
            lst = self.progress_callbacks.get(task_id)
            if lst is None:
                lst = []
                self.progress_callbacks[task_id] = lst
            lst.append(callback)

    def unregister_progress_callback(self, task_id: str):
        """Unregister a progress callback."""
        with self._lock:
            # Remove all callbacks for this task (caller expects to unregister by task_id)
            self.progress_callbacks.pop(task_id, None)

    def update_progress(self, task_id: str, progress: Dict[str, Any]):
        """Update progress for a running task."""
        callbacks: List[Callable[[str, Dict[str, Any]], None]] = []

        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                # Add disk space information to progress (best-effort)
                self._add_disk_space_info(progress)

                # Always update internal progress record and last_progress_update timestamp
                task.progress = progress
                task.last_progress_update = datetime.now()

                # Prepare for potential emission
                callbacks = list(self.progress_callbacks.get(task_id, []))

                # Check if we should emit based on throttling rules
                should_emit = self.progress_throttler.should_emit_progress(
                    progress, task.last_emit_time, task.last_emitted_percent
                )

                # If we decided to emit, record emit metadata now while still under lock
                if should_emit:
                    import time
                    task.last_emit_time = time.time()
                    progress_pct = self.progress_throttler._extract_percent(progress)
                    if progress_pct is not None:
                        task.last_emitted_percent = progress_pct

        # If we are emitting, call callbacks and persist. Do not call callbacks while holding lock.
        if callbacks and should_emit:
            safe_progress = dict(progress)
            for cb in callbacks:
                try:
                    cb(task_id, safe_progress)
                except Exception as e:
                    logger.error(f"Error in progress callback for task {task_id}: {e}")

            # Persist progress emission
            try:
                self._persist_tasks()
            except Exception:
                logger.exception("Failed to persist tasks after progress update")

    def _add_disk_space_info(self, progress: Dict[str, Any]):
        """Add disk space information to progress (best-effort)."""
        try:
            from ..core.config import settings
            import shutil
            import os
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
            logger.debug(f"Failed to check disk space for progress update: {e}")

    def _cleanup_failed_task(self, task_id: str):
        """Clean up a failed task from the active downloads."""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                if task.status == 'error':
                    self.tasks.pop(task_id, None)
                    self.progress_callbacks.pop(task_id, None)
                    logger.info(f"Cleaned up failed pull task {task_id}")
        # Persist change
        try:
            self._persist_tasks()
        except Exception:
            logger.exception("Failed to persist tasks after cleanup")

    def _persist_tasks(self):
        """Persist current tasks to disk."""
        with self._lock:
            serialized_tasks = {tid: self.persistence.serialize_task(t) for tid, t in self.tasks.items()}
        self.persistence.persist_tasks(serialized_tasks)

    def _load_persisted_tasks(self):
        """Load persisted tasks from disk."""
        persisted_tasks = self.persistence.load_persisted_tasks(PullTask)
        with self._lock:
            self.tasks.update(persisted_tasks)

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
        # Signal stop event so cooperative pull function can abort
        try:
            if task.stop_event:
                task.stop_event.set()
        except Exception:
            pass
        logger.info(f"Requested cancellation of pull task {task_id}")
        try:
            self._persist_tasks()
        except Exception:
            logger.exception("Failed to persist tasks after cancel")
        return True

    def mark_task_stale(self, task_id: str, message: str = 'Marked stale') -> bool:
        """Mark a task as stale/errored so it no longer blocks retries."""
        with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return False
            task.status = 'error'
            task.error = message
            task.completed_at = datetime.now()
        try:
            self._persist_tasks()
        except Exception:
            logger.exception("Failed to persist tasks after marking stale")
        return True

    def remove_pull_task(self, task_id: str) -> bool:
        """Permanently remove a pull task from manager and persistence."""
        with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return False

            # Signal stop event for cooperative cancellation if present
            try:
                if task.stop_event:
                    task.stop_event.set()
            except Exception:
                pass

            # Remove callbacks and task record immediately
            self.progress_callbacks.pop(task_id, None)
            self.tasks.pop(task_id, None)
            logger.info(f"Permanently removed pull task {task_id}")

        # Persist change
        try:
            self._persist_tasks()
        except Exception:
            logger.exception("Failed to persist tasks after removal")
        return True

    def get_task_health(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Return health info for a task (thread alive, last progress age, retry info)."""
        with self._lock:
            t = self.tasks.get(task_id)
            if not t:
                return None
            thread_alive = bool(t.task_handle and hasattr(t.task_handle, 'is_alive') and t.task_handle.is_alive())
            last_update_age = None
            if t.last_progress_update:
                last_update_age = (datetime.now() - t.last_progress_update).total_seconds()
            return {
                'task_id': t.task_id,
                'model_name': t.model_name,
                'status': t.status,
                'thread_alive': thread_alive,
                'last_progress_age_seconds': last_update_age,
                'retry_count': t.retry_count,
                'last_retry_at': t.last_retry_at.isoformat() if t.last_retry_at else None,
            }

    def start(self):
        """Publicly start the cleanup worker if not already running."""
        self.cleanup_service.start_cleanup()
        # After cleanup worker starts, attempt to resume any pending/incomplete tasks
        try:
            self._resume_incomplete_tasks()
        except Exception:
            logger.exception("Failed to resume incomplete pull tasks")

    def _resume_incomplete_tasks(self):
        """When the manager starts, resume pulls that were recorded as pending/running but have no active worker."""
        with self._lock:
            tasks_to_resume = [tid for tid, t in self.tasks.items() if t.status in ('pending', 'running')]

        for tid in tasks_to_resume:
            with self._lock:
                t = self.tasks.get(tid)
                if not t:
                    continue
                # Skip if thread is already alive
                if t.task_handle and hasattr(t.task_handle, 'is_alive') and t.task_handle.is_alive():
                    continue
                # Reset to pending so start_pull_task can begin
                t.status = 'pending'
                t.started_at = None
                t.completed_at = None
                t.error = None
                t.stop_event = threading.Event()

            # Start a new background thread using the manager performer
            try:
                # Use start_pull_task so bookkeeping is consistent
                self.start_pull_task(tid, lambda task_id, stop_event=None: self._perform_pull_model(task_id, t.model_name, stop_event))
                logger.info(f"Resumed pull task {tid} for model {t.model_name}")
            except Exception:
                logger.exception(f"Failed to resume pull task {tid}")

    def shutdown(self):
        """Publicly stop the cleanup worker and perform any shutdown tasks."""
        self.cleanup_service.stop_cleanup()

    def _perform_pull_model(self, task_id: str, model_name: str, stop_event: Optional[threading.Event] = None):
        """Internal method to perform the model pull using Ollama API."""
        # This method would contain the actual pull logic from the original manager
        # For now, we'll import it from the original file to maintain functionality
        from ..services.model_pull_manager import ModelPullManager
        original_manager = ModelPullManager(start_cleanup=False)
        original_manager._perform_pull_model(task_id, model_name, stop_event)

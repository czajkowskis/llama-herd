"""
Background task manager for model pulls to allow concurrent API access.
"""
import asyncio
import threading
import uuid
from typing import Dict, Optional, Callable, Any, List
from dataclasses import dataclass
from datetime import datetime
import logging
import time
import shutil
import os
import json

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


class ModelPullManager:
    """Manages background model pull tasks."""

    def __init__(self, start_cleanup: bool = True):
        self.tasks: Dict[str, PullTask] = {}
        # Allow multiple callbacks per task (e.g., multiple websocket clients)
        self.progress_callbacks: Dict[str, List[Callable[[str, Dict[str, Any]], None]]] = {}
        self._lock = threading.Lock()
        self.cleanup_thread: Optional[threading.Thread] = None
        self._running = True
        # Event to allow the cleanup worker to be woken up for shutdown
        self._stop_event = threading.Event()
        # Persistence setup
        try:
            from ..core.config import settings
            from pathlib import Path
            data_dir = Path(getattr(settings, 'data_directory', '.'))
            data_dir.mkdir(parents=True, exist_ok=True)
            self._persistence_file = data_dir / 'pull_tasks.json'
            self._persistence_lock = data_dir / 'pull_tasks.lock'
        except Exception:
            self._persistence_file = None
            self._persistence_lock = None

        # Load persisted tasks if any
        try:
            self._load_persisted_tasks()
        except Exception:
            logger.exception("Failed to load persisted pull tasks")
        if start_cleanup:
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

    def _serialize_task(self, task: PullTask) -> Dict[str, Any]:
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

    def _deserialize_task(self, data: Dict[str, Any]) -> PullTask:
        def parse_dt(v):
            return datetime.fromisoformat(v) if v else None
        return PullTask(
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

    def _persist_tasks(self):
        if not self._persistence_file:
            return
        try:
            from filelock import FileLock
            lock = FileLock(str(self._persistence_lock))
            with lock:
                data = {tid: self._serialize_task(t) for tid, t in self.tasks.items()}
                # Use atomic write
                tmp = str(self._persistence_file) + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                os.replace(tmp, str(self._persistence_file))
        except Exception:
            logger.exception("Failed to persist pull tasks")

    def _load_persisted_tasks(self):
        if not self._persistence_file or not self._persistence_file.exists():
            return
        try:
            from filelock import FileLock
            lock = FileLock(str(self._persistence_lock))
            with lock:
                with open(self._persistence_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            # Rebuild tasks
            with self._lock:
                for tid, tdata in data.items():
                    task = self._deserialize_task(tdata)
                    # If a task was previously running, mark as error/stale
                    if task.status == 'running':
                        task.status = 'error'
                        task.error = 'Interrupted by server restart'
                    # Ensure no live handles or events
                    task.task_handle = None
                    task.stop_event = None
                    self.tasks[tid] = task
        except Exception:
            logger.exception("Failed to load persisted pull tasks")

    def _perform_pull_model(self, task_id: str, model_name: str, stop_event: Optional[threading.Event] = None):
        """Internal method to perform the model pull using Ollama API.

        This mirrors the logic in the route-level perform_pull but lives in the manager so
        pulls continue regardless of frontend navigation and can be resumed on restart.
        """
        import requests
        response = None
        # Simple retry/backoff policy
        MAX_ATTEMPTS = 3
        attempt = 0
        last_exception = None
        while attempt < MAX_ATTEMPTS:
            attempt += 1
            try:
                from ..core.config import settings
                pull_data = {"name": model_name, "stream": True}
                logger.info(f"Starting pull attempt {attempt} for task {task_id} model {model_name}")
                response = requests.post(
                    f"{settings.ollama_url}/api/pull",
                    json=pull_data,
                    stream=True,
                    timeout=getattr(settings, 'ollama_timeout', 300)
                )

                if response.status_code != 200:
                    error_detail = response.text or "Failed to start model pull"
                    # Consider 5xx transient
                    status = getattr(response, 'status_code', 0)
                    if 500 <= status < 600 and attempt < MAX_ATTEMPTS:
                        logger.warning(f"Transient error starting pull (status {status}), retrying: {error_detail}")
                        last_exception = Exception(error_detail)
                        # record retry info
                        with self._lock:
                            t = self.tasks.get(task_id)
                            if t:
                                t.retry_count = attempt
                                t.last_retry_at = datetime.now()
                                self._persist_tasks()
                        backoff = min(60, 2 ** attempt)
                        time.sleep(backoff)
                        continue
                    raise Exception(error_detail)

                # stream lines
                for line in response.iter_lines():
                    # cooperative cancellation
                    if stop_event is not None and stop_event.is_set():
                        logger.info(f"Pull task {task_id} received stop event, aborting")
                        raise Exception("Pull task was cancelled")

                    current_task = self.get_pull_task(task_id)
                    if current_task and current_task.status == 'cancelled':
                        logger.info(f"Pull task {task_id} was cancelled, stopping download")
                        raise Exception("Pull task was cancelled")

                    if line:
                        try:
                            progress_data = json.loads(line.decode('utf-8'))
                            if 'error' in progress_data:
                                raise Exception(progress_data['error'])
                            self.update_progress(task_id, progress_data)
                        except json.JSONDecodeError:
                            continue

                # If we reach here without exception, success
                return

            except requests.exceptions.RequestException as re:
                logger.warning(f"Network error during pull attempt {attempt} for {model_name}: {re}")
                last_exception = re
                with self._lock:
                    t = self.tasks.get(task_id)
                    if t:
                        t.retry_count = attempt
                        t.last_retry_at = datetime.now()
                        self._persist_tasks()
                if attempt < MAX_ATTEMPTS:
                    backoff = min(60, 2 ** attempt)
                    time.sleep(backoff)
                    continue
                raise
            except Exception as e:
                logger.error(f"Error during model pull for {model_name} on attempt {attempt}: {e}")
                last_exception = e
                # If this looks transient (contains connection/timeout), retry
                msg = str(e).lower()
                if any(k in msg for k in ('connection', 'timeout', 'temporarily')) and attempt < MAX_ATTEMPTS:
                    with self._lock:
                        t = self.tasks.get(task_id)
                        if t:
                            t.retry_count = attempt
                            t.last_retry_at = datetime.now()
                            self._persist_tasks()
                    backoff = min(60, 2 ** attempt)
                    time.sleep(backoff)
                    continue
                # Non-transient - re-raise
                raise
            finally:
                if response:
                    try:
                        response.close()
                    except Exception:
                        pass

    def update_progress(self, task_id: str, progress: Dict[str, Any]):
        """Update progress for a running task."""
        callbacks: List[Callable[[str, Dict[str, Any]], None]] = []

        # Helper to extract a percent value (0-100) from progress data when available
        def _extract_percent(p: Dict[str, Any]) -> Optional[float]:
            # Prefer explicit fields
            for key in ('percent', 'progress'):
                if key in p:
                    try:
                        val = float(p[key])
                        # If given as 0..1 convert to 0..100
                        if 0.0 <= val <= 1.0:
                            val = val * 100.0
                        return float(val)
                    except Exception:
                        pass
            # Try bytes / total pattern
            for a_key, b_key in (('downloaded_bytes', 'total_bytes'), ('downloaded', 'size'), ('downloaded', 'total')):
                if a_key in p and b_key in p:
                    try:
                        a = float(p.get(a_key, 0))
                        b = float(p.get(b_key, 0))
                        if b > 0:
                            return (a / b) * 100.0
                    except Exception:
                        pass
            return None

        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                # Add disk space information to progress (best-effort)
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
                    logger.debug(f"Failed to check disk space for progress update: {e}")

                # Always update internal progress record and last_progress_update timestamp
                task.progress = progress
                task.last_progress_update = datetime.now()

                # Prepare for potential emission
                callbacks = list(self.progress_callbacks.get(task_id, []))

                # Determine throttling controls from settings (fallback sensible defaults)
                try:
                    from ..core.config import settings
                    throttle_ms = int(getattr(settings, 'pull_progress_throttle_ms', 500))
                    percent_delta = float(getattr(settings, 'pull_progress_percent_delta', 2.0))
                except Exception:
                    throttle_ms = 500
                    percent_delta = 2.0

                now_ts = time.time()
                last_emit = task.last_emit_time
                progress_pct = _extract_percent(progress)

                should_emit = False
                # If we've never emitted for this task, emit immediately
                if last_emit is None:
                    should_emit = True
                else:
                    # Time-based emission
                    if (now_ts - last_emit) * 1000.0 >= throttle_ms:
                        should_emit = True
                    # Percent-delta emission (if percent available)
                    elif progress_pct is not None and task.last_emitted_percent is not None and abs(progress_pct - task.last_emitted_percent) >= percent_delta:
                        should_emit = True
                    elif progress_pct is not None and task.last_emitted_percent is None:
                        # If we have a percent now but never emitted percent before, emit
                        should_emit = True

                # If we decided to emit, record emit metadata now while still under lock
                if should_emit:
                    task.last_emit_time = now_ts
                    if progress_pct is not None:
                        task.last_emitted_percent = progress_pct

        # If we are emitting, call callbacks and persist. Do not call callbacks while holding lock.
        if callbacks:
            # We must recompute whether we should actually call callbacks based on the task object we updated.
            # Safe to read without lock for this decision (best-effort)
            emit_now = False
            try:
                t = self.tasks.get(task_id)
                if t and t.last_emit_time is not None:
                    # If last_emit_time is recent, that indicates we intended to emit
                    if (time.time() - t.last_emit_time) * 1000.0 < max(10000, throttle_ms * 2):
                        emit_now = True
            except Exception:
                emit_now = True

            if emit_now:
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

    def mark_task_stale(self, task_id: str, message: str = 'Marked stale') -> bool:
        """Mark a task as stale/errored so it no longer blocks retries.

        Returns True if the task existed and was marked.
        """
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
        """Permanently remove a pull task from manager and persistence.

        If the task is running, attempt cooperative cancellation then remove the record.
        Returns True if the task existed and was removed.
        """
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

    def start(self):
        """Publicly start the cleanup worker if not already running."""
        with self._lock:
            if self.cleanup_thread and self.cleanup_thread.is_alive():
                return
            self._running = True
            self._stop_event.clear()
            self._start_cleanup_thread()
        # After cleanup worker starts, attempt to resume any pending/incomplete tasks
        try:
            self._resume_incomplete_tasks()
        except Exception:
            logger.exception("Failed to resume incomplete pull tasks")

    def _resume_incomplete_tasks(self):
        """When the manager starts, resume pulls that were recorded as pending/running but have no active worker.

        This does not attempt to resume partial downloads at the protocol level; it simply restarts the pull
        process so the model can be re-downloaded if it was interrupted by a page navigation or server restart.
        """
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
        self.stop_cleanup()

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
            # Wait in a wakeable manner so stop_cleanup() can interrupt quickly
            self._stop_event.wait(timeout=60)

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


# Global instance (do not start cleanup thread at import time)
# Use ModelPullManager which has all the required methods
pull_manager = ModelPullManager(start_cleanup=False)
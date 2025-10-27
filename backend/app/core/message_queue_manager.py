"""
Message queue management for WebSocket communication.
"""
import threading
from typing import Dict, Any, Optional
from collections import defaultdict
from queue import Queue, Empty

from ..utils.logging import get_logger

logger = get_logger(__name__)


class MessageQueueManager:
    """Manages message queues for WebSocket communication."""
    
    def __init__(self):
        self._queues: Dict[str, Queue] = defaultdict(Queue)
        self._lock = threading.Lock()
    
    def put_message_threadsafe(self, experiment_id: str, message: Dict[str, Any]) -> None:
        """Put a message in the queue for a specific experiment (thread-safe)."""
        with self._lock:
            self._queues[experiment_id].put(message)
    
    def get_message(self, experiment_id: str, timeout: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Get a message from the queue for a specific experiment."""
        try:
            queue = self._queues.get(experiment_id)
            if queue:
                return queue.get(timeout=timeout)
        except Empty:
            pass
        return None
    
    def get_all_messages(self, experiment_id: str) -> list:
        """Get all messages from the queue for a specific experiment."""
        messages = []
        queue = self._queues.get(experiment_id)
        if queue:
            while not queue.empty():
                try:
                    message = queue.get_nowait()
                    messages.append(message)
                except Empty:
                    break
        return messages
    
    def clear_queue(self, experiment_id: str) -> None:
        """Clear all messages for a specific experiment."""
        with self._lock:
            queue = self._queues.get(experiment_id)
            if queue:
                while not queue.empty():
                    try:
                        queue.get_nowait()
                    except Empty:
                        break
    
    def remove_queue(self, experiment_id: str) -> None:
        """Remove the queue for a specific experiment."""
        with self._lock:
            if experiment_id in self._queues:
                del self._queues[experiment_id]
    
    def has_messages(self, experiment_id: str) -> bool:
        """Check if there are messages in the queue for a specific experiment."""
        queue = self._queues.get(experiment_id)
        return queue is not None and not queue.empty()
    
    def get_queue_size(self, experiment_id: str) -> int:
        """Get the size of the queue for a specific experiment."""
        queue = self._queues.get(experiment_id)
        return queue.qsize() if queue else 0
    
    def get_all_queue_sizes(self) -> Dict[str, int]:
        """Get the size of all queues."""
        with self._lock:
            return {exp_id: queue.qsize() for exp_id, queue in self._queues.items()}
    
    def cleanup_empty_queues(self) -> None:
        """Remove empty queues to free up memory."""
        with self._lock:
            empty_queues = [exp_id for exp_id, queue in self._queues.items() if queue.empty()]
            for exp_id in empty_queues:
                del self._queues[exp_id]

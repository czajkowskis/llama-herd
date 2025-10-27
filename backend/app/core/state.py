"""
Centralized application state management using separated managers.
"""
import asyncio
from typing import Dict, Any, Optional, List

from ..schemas.conversation import Message, Conversation
from ..schemas.task import TaskModel
from ..schemas.agent import AgentModel
from .experiment_state_manager import ExperimentStateManager, ExperimentState
from .message_queue_manager import MessageQueueManager


class StateManager:
    """Centralized state manager using separated concerns."""
    
    def __init__(self):
        self.experiment_manager = ExperimentStateManager()
        self.message_queue_manager = MessageQueueManager()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the event loop for async operations."""
        self._loop = loop
    
    # Experiment state management - delegate to ExperimentStateManager
    def create_experiment(self, experiment_id: str, task: TaskModel, agents: List[AgentModel], chat_rules=None) -> ExperimentState:
        """Create a new experiment state."""
        return self.experiment_manager.create_experiment(experiment_id, task, agents, chat_rules)
    
    def get_experiment(self, experiment_id: str) -> Optional[ExperimentState]:
        """Get experiment state by ID."""
        return self.experiment_manager.get_experiment(experiment_id)
    
    def get_all_experiments(self) -> Dict[str, ExperimentState]:
        """Get all active experiments."""
        return self.experiment_manager.get_all_experiments()
    
    def remove_experiment(self, experiment_id: str) -> bool:
        """Remove experiment state."""
        return self.experiment_manager.remove_experiment(experiment_id)
    
    def update_experiment_status(self, experiment_id: str, status: str, **kwargs) -> bool:
        """Update experiment status."""
        return self.experiment_manager.update_experiment_status(experiment_id, status, **kwargs)
    
    def add_message(self, experiment_id: str, message: Message) -> bool:
        """Add message to experiment."""
        return self.experiment_manager.add_message(experiment_id, message)
    
    def add_conversation(self, experiment_id: str, conversation: Conversation) -> bool:
        """Add conversation to experiment."""
        return self.experiment_manager.add_conversation(experiment_id, conversation)
    
    def clear_messages(self, experiment_id: str) -> bool:
        """Clear messages for an experiment."""
        return self.experiment_manager.clear_messages(experiment_id)
    
    # Message queue management - delegate to MessageQueueManager
    def put_message_threadsafe(self, experiment_id: str, message: Dict[str, Any]) -> None:
        """Put a message in the queue for a specific experiment (thread-safe)."""
        self.message_queue_manager.put_message_threadsafe(experiment_id, message)
    
    def get_message(self, experiment_id: str, timeout: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Get a message from the queue for a specific experiment."""
        return self.message_queue_manager.get_message(experiment_id, timeout)
    
    def get_all_messages(self, experiment_id: str) -> list:
        """Get all messages from the queue for a specific experiment."""
        return self.message_queue_manager.get_all_messages(experiment_id)
    
    def clear_queue(self, experiment_id: str) -> None:
        """Clear all messages for a specific experiment."""
        self.message_queue_manager.clear_queue(experiment_id)
    
    def remove_queue(self, experiment_id: str) -> None:
        """Remove the queue for a specific experiment."""
        self.message_queue_manager.remove_queue(experiment_id)
    
    def has_messages(self, experiment_id: str) -> bool:
        """Check if there are messages in the queue for a specific experiment."""
        return self.message_queue_manager.has_messages(experiment_id)
    
    def get_queue_size(self, experiment_id: str) -> int:
        """Get the size of the queue for a specific experiment."""
        return self.message_queue_manager.get_queue_size(experiment_id)
    
    def get_all_queue_sizes(self) -> Dict[str, int]:
        """Get the size of all queues."""
        return self.message_queue_manager.get_all_queue_sizes()
    
    def cleanup_empty_queues(self) -> None:
        """Remove empty queues to free up memory."""
        self.message_queue_manager.cleanup_empty_queues()


# Global state manager instance
state_manager = StateManager()
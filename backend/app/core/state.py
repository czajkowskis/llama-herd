"""
Centralized application state management.
"""
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime
from ..schemas.conversation import ConversationAgent, Message


class ExperimentState:
    """Represents the state of a single experiment."""
    
    def __init__(self, experiment_id: str, task: Any, agents: list):
        self.experiment_id = experiment_id
        self.task = task
        self.agents = agents
        self.conversation_agents = []
        self.messages = []
        self.conversations = []
        self.iterations = 1
        self.current_iteration = 0
        self.status = 'running'
        self.created_at = datetime.now().isoformat()
        self.completed_at = None
        self.error = None
        
        # Initialize conversation agents
        for agent in agents:
            self.conversation_agents.append(ConversationAgent(
                id=agent.id,
                name=agent.name,
                color=agent.color,
                model=agent.model,
            ))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary."""
        return {
            'experiment_id': self.experiment_id,
            'task': self.task,
            'agents': self.agents,
            'conversation_agents': self.conversation_agents,
            'messages': self.messages,
            'conversations': self.conversations,
            'iterations': self.iterations,
            'current_iteration': self.current_iteration,
            'status': self.status,
            'created_at': self.created_at,
            'completed_at': self.completed_at,
            'error': self.error
        }


class StateManager:
    """Manages application state."""
    
    def __init__(self):
        self._active_experiments: Dict[str, ExperimentState] = {}
        self._message_queues: Dict[str, asyncio.Queue] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the event loop for async operations."""
        self._loop = loop
    
    def create_experiment(self, experiment_id: str, task: Any, agents: list) -> ExperimentState:
        """Create a new experiment state."""
        experiment_state = ExperimentState(experiment_id, task, agents)
        self._active_experiments[experiment_id] = experiment_state
        self._message_queues[experiment_id] = asyncio.Queue()
        return experiment_state
    
    def get_experiment(self, experiment_id: str) -> Optional[ExperimentState]:
        """Get experiment state by ID."""
        return self._active_experiments.get(experiment_id)
    
    def get_all_experiments(self) -> Dict[str, ExperimentState]:
        """Get all active experiments."""
        return self._active_experiments.copy()
    
    def remove_experiment(self, experiment_id: str) -> bool:
        """Remove experiment state."""
        if experiment_id in self._active_experiments:
            del self._active_experiments[experiment_id]
            if experiment_id in self._message_queues:
                del self._message_queues[experiment_id]
            return True
        return False
    
    def get_message_queue(self, experiment_id: str) -> Optional[asyncio.Queue]:
        """Get message queue for experiment."""
        return self._message_queues.get(experiment_id)
    
    def put_message_threadsafe(self, experiment_id: str, message: Dict[str, Any]) -> bool:
        """
        Put a message into the queue from a synchronous/threaded context.
        This is thread-safe and can be called from background threads.
        """
        queue = self._message_queues.get(experiment_id)
        if not queue:
            return False
        
        # If we have an event loop, use call_soon_threadsafe
        if self._loop and not self._loop.is_closed():
            try:
                self._loop.call_soon_threadsafe(queue.put_nowait, message)
                return True
            except Exception:
                return False
        
        # Fallback: try to put directly (only works if called from async context)
        try:
            queue.put_nowait(message)
            return True
        except Exception:
            return False
    
    def update_experiment_status(self, experiment_id: str, status: str, **kwargs) -> bool:
        """Update experiment status."""
        experiment = self.get_experiment(experiment_id)
        if experiment:
            experiment.status = status
            if status == 'completed':
                experiment.completed_at = datetime.now().isoformat()
            for key, value in kwargs.items():
                if hasattr(experiment, key):
                    setattr(experiment, key, value)
            return True
        return False
    
    def add_message(self, experiment_id: str, message: Message) -> bool:
        """Add message to experiment."""
        experiment = self.get_experiment(experiment_id)
        if experiment:
            experiment.messages.append(message)
            return True
        return False
    
    def add_conversation(self, experiment_id: str, conversation: Any) -> bool:
        """Add conversation to experiment."""
        experiment = self.get_experiment(experiment_id)
        if experiment:
            experiment.conversations.append(conversation)
            return True
        return False


# Global state manager instance
state_manager = StateManager() 
"""
Centralized application state management.
"""
from typing import Dict, Any, Optional, List
import asyncio
from datetime import datetime
from ..schemas.conversation import ConversationAgent, Message, Conversation
from ..schemas.task import TaskModel
from ..schemas.agent import AgentModel


class ExperimentState:
    """Represents the state of a single experiment."""
    
    def __init__(self, experiment_id: str, task: TaskModel, agents: List[AgentModel]):
        self.experiment_id: str = experiment_id
        self.task: TaskModel = task
        self.agents: List[AgentModel] = agents
        self.conversation_agents: List[ConversationAgent] = []
        self.messages: List[Message] = []
        self.conversations: List[Conversation] = []
        self.iterations: int = 1
        self.current_iteration: int = 0
        self.status: str = 'running'
        self.created_at: str = datetime.now().isoformat()
        self.completed_at: Optional[str] = None
        self.error: Optional[str] = None
        
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
            'task': self.task.model_dump() if hasattr(self.task, 'model_dump') else self.task,
            'agents': [agent.model_dump() if hasattr(agent, 'model_dump') else agent for agent in self.agents],
            'conversation_agents': [agent.model_dump() if hasattr(agent, 'model_dump') else agent for agent in self.conversation_agents],
            'messages': [msg.model_dump() if hasattr(msg, 'model_dump') else msg for msg in self.messages],
            'conversations': [conv.model_dump() if hasattr(conv, 'model_dump') else conv for conv in self.conversations],
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
    
    def create_experiment(self, experiment_id: str, task: TaskModel, agents: List[AgentModel]) -> ExperimentState:
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
    
    def add_conversation(self, experiment_id: str, conversation: Conversation) -> bool:
        """Add conversation to experiment."""
        experiment = self.get_experiment(experiment_id)
        if experiment:
            experiment.conversations.append(conversation)
            return True
        return False


# Global state manager instance
state_manager = StateManager() 
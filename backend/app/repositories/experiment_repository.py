"""
Experiment repository implementation.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from ..domain.models import Experiment, ExperimentStatus, Agent, Task, Conversation
from ..domain.repositories import ExperimentRepository
from ..storage import get_storage
from ..utils.logging import get_logger

logger = get_logger(__name__)


class FileExperimentRepository(ExperimentRepository):
    """File-based implementation of ExperimentRepository."""
    
    def __init__(self):
        self.storage = get_storage()
    
    def save(self, experiment: Experiment) -> bool:
        """Save an experiment."""
        try:
            experiment_dict = experiment.to_dict()
            return self.storage.save_experiment(experiment_dict)
        except Exception as e:
            logger.error(f"Failed to save experiment {experiment.id}: {e}")
            return False
    
    def get_by_id(self, experiment_id: str) -> Optional[Experiment]:
        """Get an experiment by ID."""
        try:
            experiment_dict = self.storage.get_experiment(experiment_id)
            if not experiment_dict:
                return None
            
            return self._dict_to_experiment(experiment_dict)
        except Exception as e:
            logger.error(f"Failed to get experiment {experiment_id}: {e}")
            return None
    
    def get_all(self) -> List[Experiment]:
        """Get all experiments."""
        try:
            experiments_list = self.storage.get_experiments()
            experiments = []
            
            for exp_dict in experiments_list:
                # Get full experiment data
                full_experiment = self.storage.get_experiment(exp_dict['id'])
                if full_experiment:
                    experiment = self._dict_to_experiment(full_experiment)
                    if experiment:
                        experiments.append(experiment)
            
            return experiments
        except Exception as e:
            logger.error(f"Failed to get all experiments: {e}")
            return []
    
    def update(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an experiment."""
        try:
            return self.storage.update_experiment(experiment_id, updates)
        except Exception as e:
            logger.error(f"Failed to update experiment {experiment_id}: {e}")
            return False
    
    def delete(self, experiment_id: str) -> bool:
        """Delete an experiment."""
        try:
            return self.storage.delete_experiment(experiment_id)
        except Exception as e:
            logger.error(f"Failed to delete experiment {experiment_id}: {e}")
            return False
    
    def exists(self, experiment_id: str) -> bool:
        """Check if an experiment exists."""
        return self.get_by_id(experiment_id) is not None
    
    def _dict_to_experiment(self, data: Dict[str, Any]) -> Optional[Experiment]:
        """Convert dictionary data to Experiment domain model."""
        try:
            # Parse task
            task_data = data.get('task', {})
            task = Task(
                prompt=task_data.get('prompt', ''),
                dataset_items=task_data.get('dataset_items')
            )
            
            # Parse agents
            agents = []
            for agent_data in data.get('agents', []):
                agent = Agent(
                    id=agent_data.get('id', ''),
                    name=agent_data.get('name', ''),
                    model=agent_data.get('model', ''),
                    prompt=agent_data.get('prompt', ''),
                    temperature=agent_data.get('temperature'),
                    color=agent_data.get('color')
                )
                agents.append(agent)
            
            # Parse conversations
            conversations = []
            for conv_data in data.get('conversations', []):
                conversation = self._dict_to_conversation(conv_data)
                if conversation:
                    conversations.append(conversation)
            
            # Parse timestamps
            created_at = datetime.fromisoformat(data['created_at']) if data.get('created_at') else datetime.now()
            completed_at = None
            if data.get('completed_at'):
                completed_at = datetime.fromisoformat(data['completed_at'])
            
            # Parse status
            status_str = data.get('status', 'pending')
            try:
                status = ExperimentStatus(status_str)
            except ValueError:
                status = ExperimentStatus.PENDING
            
            return Experiment(
                id=data['id'],
                title=data.get('title', ''),
                task=task,
                agents=agents,
                status=status,
                created_at=created_at,
                completed_at=completed_at,
                error=data.get('error'),
                iterations=data.get('iterations', 1),
                current_iteration=data.get('current_iteration', 0),
                conversations=conversations
            )
        except Exception as e:
            logger.error(f"Failed to convert dict to experiment: {e}")
            return None
    
    def _dict_to_conversation(self, data: Dict[str, Any]) -> Optional[Conversation]:
        """Convert dictionary data to Conversation domain model."""
        try:
            from ..domain.models import ConversationAgent, Message
            
            # Parse agents
            agents = []
            for agent_data in data.get('agents', []):
                agent = ConversationAgent(
                    id=agent_data.get('id', ''),
                    name=agent_data.get('name', ''),
                    color=agent_data.get('color', '#6366F1'),
                    model=agent_data.get('model', '')
                )
                agents.append(agent)
            
            # Parse messages
            messages = []
            for msg_data in data.get('messages', []):
                message = Message(
                    id=msg_data.get('id', ''),
                    agent_id=msg_data.get('agentId', ''),
                    content=msg_data.get('content', ''),
                    timestamp=datetime.fromisoformat(msg_data['timestamp']) if msg_data.get('timestamp') else datetime.now(),
                    model=msg_data.get('model', 'Unknown')
                )
                messages.append(message)
            
            created_at = datetime.fromisoformat(data['createdAt']) if data.get('createdAt') else datetime.now()
            
            return Conversation(
                id=data['id'],
                title=data.get('title', ''),
                agents=agents,
                messages=messages,
                created_at=created_at,
                experiment_id=data.get('experiment_id'),
                iteration=data.get('iteration')
            )
        except Exception as e:
            logger.error(f"Failed to convert dict to conversation: {e}")
            return None

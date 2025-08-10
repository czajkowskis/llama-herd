"""
Service for managing conversations.
"""
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..schemas.conversation import Message, ConversationAgent, Conversation
from ..core.exceptions import ValidationError
from ..core.state import state_manager
from ..utils.logging import logger


class ConversationService:
    """Service for managing conversations."""
    
    @staticmethod
    def create_message(
        experiment_id: str,
        agent_name: str,
        content: str,
        model: str = "Unknown"
    ) -> Message:
        """Create and add a new message to an experiment."""
        try:
            # Find or create agent
            agent_id = ConversationService._get_or_create_agent_id(
                experiment_id, agent_name, model
            )
            
            # Create message
            message = Message(
                id=str(uuid.uuid4()),
                agentId=agent_id,
                content=content,
                timestamp=datetime.now().isoformat(),
                model=model
            )
            
            # Add to experiment state
            if state_manager.add_message(experiment_id, message):
                # Notify via message queue
                ConversationService._notify_message(experiment_id, message)
                return message
            else:
                raise ValidationError(f"Failed to add message to experiment {experiment_id}")
                
        except Exception as e:
            logger.error(f"Failed to create message: {str(e)}")
            raise ValidationError(f"Failed to create message: {str(e)}")
    
    @staticmethod
    def get_experiment_messages(experiment_id: str) -> List[Message]:
        """Get all messages for an experiment."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise ValidationError(f"Experiment {experiment_id} not found")
        
        return experiment.messages
    
    @staticmethod
    def get_experiment_agents(experiment_id: str) -> List[ConversationAgent]:
        """Get all agents for an experiment."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise ValidationError(f"Experiment {experiment_id} not found")
        
        return experiment.conversation_agents
    
    @staticmethod
    def add_conversation_snapshot(experiment_id: str, title: str) -> Conversation:
        """Add a conversation snapshot to an experiment."""
        try:
            experiment = state_manager.get_experiment(experiment_id)
            if not experiment:
                raise ValidationError(f"Experiment {experiment_id} not found")
            
            conversation = Conversation(
                id=str(uuid.uuid4()),
                title=title,
                agents=experiment.conversation_agents,
                messages=experiment.messages,
                createdAt=datetime.now().isoformat()
            )
            
            if state_manager.add_conversation(experiment_id, conversation):
                # Notify via message queue
                ConversationService._notify_conversation(experiment_id, conversation)
                return conversation
            else:
                raise ValidationError(f"Failed to add conversation to experiment {experiment_id}")
                
        except Exception as e:
            logger.error(f"Failed to add conversation snapshot: {str(e)}")
            raise ValidationError(f"Failed to add conversation snapshot: {str(e)}")
    
    @staticmethod
    def _get_or_create_agent_id(
        experiment_id: str,
        agent_name: str,
        model: str
    ) -> str:
        """Get existing agent ID or create new agent."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise ValidationError(f"Experiment {experiment_id} not found")
        
        # Look for existing agent
        for agent in experiment.conversation_agents:
            if agent.name == agent_name:
                return agent.id
        
        # Create new agent
        agent_id = f"agent-{len(experiment.conversation_agents)}"
        new_agent = ConversationAgent(
            id=agent_id,
            name=agent_name,
            color="#6366F1",  # Default color
            model=model
        )
        experiment.conversation_agents.append(new_agent)
        
        return agent_id
    
    @staticmethod
    def _notify_message(experiment_id: str, message: Message):
        """Notify about new message via message queue."""
        queue = state_manager.get_message_queue(experiment_id)
        if queue:
            try:
                queue.put({
                    "type": "message",
                    "data": message.dict()
                })
            except Exception as e:
                logger.warning(f"Failed to notify about message: {str(e)}")
    
    @staticmethod
    def _notify_conversation(experiment_id: str, conversation: Conversation):
        """Notify about new conversation via message queue."""
        queue = state_manager.get_message_queue(experiment_id)
        if queue:
            try:
                queue.put({
                    "type": "conversation",
                    "data": conversation.dict()
                })
            except Exception as e:
                logger.warning(f"Failed to notify about conversation: {str(e)}") 
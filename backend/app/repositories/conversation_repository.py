"""
Conversation repository implementation.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from ..domain.models import Conversation, ConversationAgent, Message
from ..domain.repositories import ConversationRepository
from ..storage import get_storage
from ..utils.logging import get_logger

logger = get_logger(__name__)


class FileConversationRepository(ConversationRepository):
    """File-based implementation of ConversationRepository."""
    
    def __init__(self):
        self.storage = get_storage()
    
    def save(self, conversation: Conversation) -> bool:
        """Save a conversation."""
        try:
            conversation_dict = conversation.to_dict()
            return self.storage.save_conversation(conversation_dict)
        except Exception as e:
            logger.error(f"Failed to save conversation {conversation.id}: {e}")
            return False
    
    def get_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID."""
        try:
            conversation_dict = self.storage.get_conversation(conversation_id)
            if not conversation_dict:
                return None
            
            return self._dict_to_conversation(conversation_dict)
        except Exception as e:
            logger.error(f"Failed to get conversation {conversation_id}: {e}")
            return None
    
    def get_by_experiment(self, experiment_id: str) -> List[Conversation]:
        """Get all conversations for an experiment."""
        try:
            conversations_list = self.storage.get_experiment_conversations(experiment_id)
            conversations = []
            
            for conv_dict in conversations_list:
                conversation = self._dict_to_conversation(conv_dict)
                if conversation:
                    conversations.append(conversation)
            
            return conversations
        except Exception as e:
            logger.error(f"Failed to get conversations for experiment {experiment_id}: {e}")
            return []
    
    def get_all(self, source: Optional[str] = None) -> List[Conversation]:
        """Get all conversations, optionally filtered by source."""
        try:
            conversations_list = self.storage.get_conversations(source)
            conversations = []
            
            for conv_dict in conversations_list:
                conversation = self._dict_to_conversation(conv_dict)
                if conversation:
                    conversations.append(conversation)
            
            return conversations
        except Exception as e:
            logger.error(f"Failed to get all conversations: {e}")
            return []
    
    def update(self, conversation_id: str, updates: Dict[str, Any]) -> bool:
        """Update a conversation."""
        try:
            return self.storage.update_conversation(conversation_id, updates)
        except Exception as e:
            logger.error(f"Failed to update conversation {conversation_id}: {e}")
            return False
    
    def delete(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        try:
            return self.storage.delete_conversation(conversation_id)
        except Exception as e:
            logger.error(f"Failed to delete conversation {conversation_id}: {e}")
            return False
    
    def save_experiment_conversation(
        self, 
        experiment_id: str, 
        iteration: int, 
        title: str, 
        conversation: Conversation
    ) -> bool:
        """Save an experiment conversation."""
        try:
            conversation_dict = conversation.to_dict()
            return self.storage.save_experiment_conversation(
                experiment_id, iteration, title, conversation_dict
            )
        except Exception as e:
            logger.error(f"Failed to save experiment conversation: {e}")
            return False
    
    def _dict_to_conversation(self, data: Dict[str, Any]) -> Optional[Conversation]:
        """Convert dictionary data to Conversation domain model."""
        try:
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
            
            # Parse timestamps
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

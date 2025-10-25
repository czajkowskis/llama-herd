"""
Message handler for experiments.
"""
from ..services.conversation_service import ConversationService


class MessageHandler:
    """Handles message creation and storage for experiments."""
    
    def __init__(self, experiment_id: str):
        self.experiment_id = experiment_id
    
    def add_message(self, agent_name: str, content: str, model: str = "Unknown"):
        """Add a message to the experiment."""
        return ConversationService.create_message(
            self.experiment_id, agent_name, content, model
        )

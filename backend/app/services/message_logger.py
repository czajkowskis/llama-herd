"""
Message logging service for AutoGen agents.
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .message_handler import MessageHandler


class MessageLogger:
    """Handles message logging for AutoGen agents."""
    
    def __init__(self, message_handler: 'MessageHandler'):
        self.message_handler = message_handler
    
    def log_user_message(self, message):
        """Log a user proxy message."""
        if message and not isinstance(message, str):
            message = str(message)
        self.message_handler.add_message(
            agent_name="User",
            content=message,
            model="User"
        )
    
    def log_agent_message(self, agent_name: str, message, model: str = "Unknown"):
        """Log an agent message."""
        if message and not isinstance(message, str):
            message = str(message)
        self.message_handler.add_message(
            agent_name=agent_name,
            content=message,
            model=model
        )

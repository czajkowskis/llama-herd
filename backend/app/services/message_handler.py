"""
Message handler for experiments.
"""
import asyncio
from typing import Callable, Optional, Any
from autogen_agentchat.messages import TextMessage

from ..services.conversation_service import ConversationService


class MessageHandler:
    """Handles message creation and storage for experiments."""
    
    def __init__(self, experiment_id: str):
        self.experiment_id = experiment_id
        self._message_callbacks: list[Callable] = []
    
    def add_message(self, agent_name: str, content: str, model: str = "Unknown"):
        """Add a message to the experiment."""
        return ConversationService.create_message(
            self.experiment_id, agent_name, content, model
        )
    
    def create_message_callback(self) -> Callable[[TextMessage], None]:
        """Create a callback function for handling agent messages."""
        def handle_message(message: TextMessage) -> None:
            """Handle incoming message from agent."""
            if hasattr(message, 'content') and message.content:
                # Extract agent name from the message context
                agent_name = getattr(message, 'name', 'Agent')
                model = getattr(message, 'model', 'Unknown')
                
                # Add message to experiment
                self.add_message(
                    agent_name=agent_name,
                    content=str(message.content),
                    model=str(model)
                )
        
        return handle_message
    
    async def handle_async_message(self, agent_name: str, content: str, model: str = "Unknown"):
        """Handle incoming message asynchronously."""
        self.add_message(agent_name, content, model)

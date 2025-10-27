"""
Message handler for experiments.
"""
from typing import Callable
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.base import TaskResult

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
    
    def process_task_result(self, result: TaskResult, agent_name_mapping: dict[str, str] = None):
        """
        Process TaskResult from AutoGen API to extract and log messages.
        
        Args:
            result: The TaskResult returned from agent.run() or team.run()
            agent_name_mapping: Optional mapping from internal agent IDs to display names
        """
        if agent_name_mapping is None:
            agent_name_mapping = {}
        
        # Extract messages from the task result
        messages = result.messages
        
        for msg in messages:
            # Check if this is a message with content field
            if hasattr(msg, 'content') and msg.content:
                # Try to extract agent name from the message source
                agent_name = 'Unknown'
                model_name = 'Unknown'
                
                # Get source if available
                if hasattr(msg, 'source') and msg.source:
                    source = msg.source
                    # Try to find the agent name in the mapping
                    agent_name = 'Unknown'
                    
                    # Try direct key lookup
                    if source in agent_name_mapping:
                        agent_name = agent_name_mapping[source]
                    # Try string representation
                    elif str(source) in agent_name_mapping:
                        agent_name = agent_name_mapping[str(source)]
                    # Try to get name from source if it's an agent
                    elif hasattr(source, 'name'):
                        agent_name = source.name
                    else:
                        # Use string representation as fallback
                        agent_name = str(source)
                    
                    model_name = agent_name
                
                # Get content as string
                content = str(msg.content)
                
                # Log the message
                self.add_message(
                    agent_name=agent_name,
                    content=content,
                    model=model_name
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

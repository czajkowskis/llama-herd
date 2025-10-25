"""
Factory for creating AutoGen agents.
"""
from typing import List
import autogen
from autogen import AssistantAgent, UserProxyAgent

from ..schemas.agent import AgentModel
from ..services.agent_service import AgentService
from ..services.message_handler import MessageHandler
from ..utils.logging import get_logger

logger = get_logger(__name__)


class AgentFactory:
    """Factory for creating AutoGen agents."""
    
    @staticmethod
    def create_autogen_agents(
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ) -> List[AssistantAgent]:
        """Create AutoGen agents from agent models."""
        autogen_agents = []
        
        for agent_config in agents:
            # Validate agent configuration
            AgentService.validate_agent_config(agent_config)
            
            # Create agent configuration
            llm_config = AgentService.create_agent_config(agent_config)
            
            # Create standard agent
            agent = AgentFactory._create_standard_agent(
                agent_config, llm_config, message_handler
            )
            
            autogen_agents.append(agent)
            logger.info(f"Created AutoGen agent: {agent_config.name}")
        
        return autogen_agents
    
    @staticmethod
    def _create_standard_agent(
        agent_config: AgentModel,
        llm_config: dict,
        message_handler: 'MessageHandler'
    ) -> AssistantAgent:
        """Create a standard AutoGen agent."""
        
        # Create standard agent
        agent = AssistantAgent(
            name=agent_config.name,
            system_message=agent_config.prompt,
            llm_config=llm_config,
        )
        
        # Set additional properties
        agent.max_consecutive_auto_reply = 1  # Reduced to prevent loops
        agent.can_execute_code = False
        
        # Override the send method to log messages
        original_send = agent.send
        def logged_send(message, recipient, request_reply=None, silent=False):
            if not silent and message:
                # Log the outgoing message
                message_handler.add_message(
                    agent_name=agent_config.name,
                    content=str(message),
                    model=agent_config.model
                )
            return original_send(message, recipient, request_reply, silent)
        
        agent.send = logged_send
        
        return agent
    
    @staticmethod
    def create_user_proxy(primary_agent: AgentModel, message_handler: 'MessageHandler') -> UserProxyAgent:
        """Create a user proxy agent with logging capabilities."""
        llm_config = AgentService.create_agent_config(primary_agent)
        
        # Create standard UserProxyAgent
        user_proxy = UserProxyAgent(
            name="user_proxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=0,
            llm_config=llm_config,
            code_execution_config=False,
            is_termination_msg=lambda msg: False,
        )
        
        # Override the send method to log messages
        original_send = user_proxy.send
        def logged_send(message, recipient, request_reply=None, silent=False):
            if not silent and message:
                # Log the user proxy message
                message_handler.add_message(
                    agent_name="User",
                    content=str(message),
                    model="User"
                )
            return original_send(message, recipient, request_reply, silent)
        
        user_proxy.send = logged_send
        
        return user_proxy

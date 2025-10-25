"""
Factory for creating AutoGen agents.
"""
from typing import List
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_core.models import ChatCompletionClient

from ..schemas.agent import AgentModel
from ..services.agent_service import AgentService
from ..services.message_handler import MessageHandler
from ..utils.logging import get_logger

logger = get_logger(__name__)


class AgentFactory:
    """Factory for creating AutoGen agents."""
    
    @staticmethod
    async def create_autogen_agents(
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ) -> List[AssistantAgent]:
        """Create AutoGen agents from agent models."""
        autogen_agents = []
        
        for agent_config in agents:
            # Validate agent configuration
            AgentService.validate_agent_config(agent_config)
            
            # Create agent
            agent = await AgentFactory._create_standard_agent(
                agent_config, message_handler
            )
            
            autogen_agents.append(agent)
            logger.info(f"Created AutoGen agent: {agent_config.name}")
        
        return autogen_agents
    
    @staticmethod
    async def _create_standard_agent(
        agent_config: AgentModel,
        message_handler: 'MessageHandler'
    ) -> AssistantAgent:
        """Create a standard AutoGen agent."""
        
        # Get model client
        model_client = AgentService.create_agent_config(agent_config)
        
        # Sanitize agent name to be a valid Python identifier (replace spaces with underscores)
        agent_name = agent_config.name.replace(" ", "_")
        
        # Create agent with new API
        # The model is specified via model_client, and system message contains the agent's prompt
        agent = AssistantAgent(
            name=agent_name,
            model_client=model_client,
            system_message=agent_config.prompt,
        )
        
        # Subscribe to messages from this agent
        # The new API uses event-driven messaging
        # We'll handle message logging through the team's event system
        
        return agent

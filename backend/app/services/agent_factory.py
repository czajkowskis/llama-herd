"""
Factory for creating AutoGen agents.
"""
from typing import List
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
    def create_autogen_agents(
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ) -> List[AssistantAgent]:
        """Create AutoGen agents from agent models using the new AutoGen 0.7.5 API."""
        autogen_agents = []
        
        for agent_config in agents:
            # Validate agent configuration
            AgentService.validate_agent_config(agent_config)
            
            # Create model client (ChatCompletionClient)
            model_client = AgentService.create_agent_config(agent_config)
            
            # Create standard agent using new API
            agent = AgentFactory._create_standard_agent(
                agent_config, model_client
            )
            
            autogen_agents.append(agent)
            logger.info(f"Created AutoGen agent: {agent_config.name}")
        
        return autogen_agents
    
    @staticmethod
    def _create_standard_agent(
        agent_config: AgentModel,
        model_client: ChatCompletionClient
    ) -> AssistantAgent:
        """Create a standard AutoGen agent using the new AutoGen 0.7.5 API."""
        
        # Create agent using new API with model_client instead of llm_config dict
        agent = AssistantAgent(
            name=agent_config.name,
            system_message=agent_config.prompt,
            model_client=model_client,
        )
        
        return agent

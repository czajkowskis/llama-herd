"""
Service for managing AI agents.
"""
from typing import List, Dict, Any
from ..schemas.agent import AgentModel
from ..core.exceptions import AgentError
from ..core.config import settings
from ..utils.logging import logger


class AgentService:
    """Service for managing AI agents."""
    
    @staticmethod
    def validate_agent_config(agent: AgentModel) -> bool:
        """Validate agent configuration."""
        if not agent.name or len(agent.name.strip()) == 0:
            raise AgentError("Agent name cannot be empty")
        
        if not agent.model or len(agent.model.strip()) == 0:
            raise AgentError("Agent model cannot be empty")
        
        if not agent.prompt or len(agent.prompt.strip()) == 0:
            raise AgentError("Agent prompt cannot be empty")
        
        if agent.temperature is not None and (agent.temperature < 0 or agent.temperature > 2):
            raise AgentError("Agent temperature must be between 0 and 2")
        
        return True
    
    @staticmethod
    def create_agent_config(agent: AgentModel) -> Dict[str, Any]:
        """Create agent configuration for LLM."""
        config_list = [{
            "model": agent.model,
            "base_url": settings.ollama_base_url,
            "api_key": settings.ollama_api_key,
        }]
        
        llm_config: Dict[str, Any] = {
            "config_list": config_list,
            "temperature": agent.temperature if agent.temperature is not None else settings.default_temperature,
            "timeout": settings.ollama_timeout,
        }
        
        return llm_config
    
    @staticmethod
    def get_agent_summary(agent: AgentModel) -> Dict[str, Any]:
        """Get a summary of agent configuration."""
        return {
            "id": agent.id,
            "name": agent.name,
            "model": agent.model,
            "temperature": agent.temperature,
            "prompt_length": len(agent.prompt) if agent.prompt else 0
        }
    
    @staticmethod
    def validate_agents_for_experiment(agents: List[AgentModel]) -> bool:
        """Validate that agents are suitable for an experiment."""
        if not agents or len(agents) == 0:
            raise AgentError("At least one agent is required for an experiment")
        
        for agent in agents:
            AgentService.validate_agent_config(agent)
        
        # Check for duplicate agent names
        agent_names = [agent.name for agent in agents]
        if len(agent_names) != len(set(agent_names)):
            raise AgentError("Agent names must be unique")
        
        return True 
"""
Service for managing AI agents.
"""
from typing import List, Dict, Any
from autogen_core.models import ChatCompletionClient, ModelInfo
from autogen_ext.models.openai import OpenAIChatCompletionClient

from ..schemas.agent import AgentModel
from ..core.exceptions import AgentError
from ..core.config import settings


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
    def create_agent_config(agent: AgentModel) -> ChatCompletionClient:
        """Create a model client for the agent using Ollama."""
        # Create model info for Ollama models (since they're not standard OpenAI models)
        # Provide all required fields for ModelInfo
        model_info = ModelInfo(
            model_id=agent.model,
            provider="ollama",
            family="ollama",  # Model family
            context_length=4096,  # Default context length for most Ollama models
            supports_vision=False,
            vision=False,  # Not a vision model
            function_calling=False,  # Ollama models don't support function calling by default
            json_output=False,  # Not a JSON mode model
            stream=True,  # Support streaming
            multimodal=False,  # Not a multimodal model
            pricing_per_1m_input_tokens=0,  # Free (local)
            pricing_per_1m_output_tokens=0,  # Free (local)
            structured_output=False  # Not a structured output model
        )
        
        # Create client configuration for Ollama
        config = {
            "base_url": settings.ollama_base_url,
            "api_key": settings.ollama_api_key,
            "model": agent.model,
            "model_info": model_info,
        }
        
        model_client = OpenAIChatCompletionClient(**config)
        
        return model_client
    
    @staticmethod
    def get_model_args(agent: AgentModel) -> Dict[str, Any]:
        """Get model arguments (temperature, etc.) for agent."""
        return {
            "temperature": agent.temperature if agent.temperature is not None else settings.default_temperature,
        }
    
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
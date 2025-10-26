from pydantic import BaseModel, Field, field_validator
from typing import Optional


class AgentModel(BaseModel):
    """Agent configuration for multi-agent experiments."""
    
    id: str = Field(..., description="Unique identifier for the agent", example="agent1")
    name: str = Field(..., description="Display name for the agent", example="Solver")
    prompt: str = Field(..., description="System prompt defining the agent's role and behavior", example="You are a helpful assistant that solves problems step by step.")
    color: str = Field(..., description="Hex color code for UI display", example="#3B82F6")
    model: str = Field(..., description="LLM model identifier to use (e.g., 'llama2', 'codellama')", example="llama2")
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0, description="Temperature for LLM inference (0-1). Lower values make output more deterministic.", example=0.7)

    @field_validator('name', 'prompt', 'model')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure string fields are not empty."""
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator('temperature')
    @classmethod
    def validate_temperature(cls, v: Optional[float]) -> Optional[float]:
        """Ensure temperature is within valid range."""
        if v is not None and (v < 0 or v > 1):
            raise ValueError("Temperature must be between 0 and 1")
        return v


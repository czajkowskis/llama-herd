from pydantic import BaseModel, field_validator
from typing import Optional


class AgentModel(BaseModel):
    id: str
    name: str
    prompt: str
    color: str
    model: str
    temperature: Optional[float] = None

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


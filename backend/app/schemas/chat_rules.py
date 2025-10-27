from pydantic import BaseModel, Field, field_validator
from typing import Optional


class ChatRulesModel(BaseModel):
    """Chat rules configuration for experiments."""
    
    max_rounds: int = Field(
        default=8, 
        ge=1, 
        le=100, 
        description="Maximum number of conversation rounds",
        example=8
    )
    team_type: str = Field(
        default="round_robin",
        description="Speaker selection strategy",
        example="round_robin"
    )
    selector_prompt: Optional[str] = Field(
        default=None,
        description="Custom prompt for SelectorGroupChat to guide agent selection. Can use {roles}, {participants}, and {history} placeholders.",
        example="Available roles:\n{roles}\n\nCurrent conversation history:\n{history}\n\nPlease select the most appropriate agent for the next message."
    )
    
    @field_validator('team_type')
    @classmethod
    def validate_team_type(cls, v: str) -> str:
        """Ensure team_type is valid."""
        valid_types = ["round_robin", "selector", "magentic_one", "swarm", "base", "graph_flow"]
        if v not in valid_types:
            raise ValueError(f"team_type must be one of {valid_types}")
        return v 
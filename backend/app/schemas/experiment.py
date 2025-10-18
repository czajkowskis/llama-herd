from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime

from .agent import AgentModel
from .task import TaskModel
from .conversation import Conversation


class ExperimentRequest(BaseModel):
    task: TaskModel
    agents: List[AgentModel]
    iterations: int = 1

    @field_validator('agents')
    @classmethod
    def validate_agents(cls, v: List[AgentModel]) -> List[AgentModel]:
        """Ensure at least one agent is provided."""
        if not v or len(v) == 0:
            raise ValueError("At least one agent is required")
        return v

    @field_validator('iterations')
    @classmethod
    def validate_iterations(cls, v: int) -> int:
        """Ensure iterations is positive."""
        if v < 1:
            raise ValueError("Iterations must be at least 1")
        return v


class ExperimentListItem(BaseModel):
    """Experiment summary for list views."""
    experiment_id: str
    title: str
    status: str
    created_at: str
    agent_count: int
    message_count: int


class ExperimentResponse(BaseModel):
    """Full experiment response with all details."""
    experiment_id: str
    task: TaskModel
    agents: List[AgentModel]
    conversations: List[Conversation]
    iterations: int
    current_iteration: int
    status: str
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None


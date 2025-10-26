from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

from .agent import AgentModel
from .task import TaskModel
from .conversation import Conversation


class ExperimentRequest(BaseModel):
    """Request model for creating a new experiment."""
    
    task: TaskModel = Field(..., description="Task configuration for the experiment")
    agents: List[AgentModel] = Field(..., min_length=1, description="List of agents to participate in the experiment. Must include at least one agent.")
    iterations: int = Field(1, ge=1, description="Number of iterations to run (default: 1)", example=1)

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
    iterations: int
    current_iteration: int


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


class ExperimentStatusResponse(BaseModel):
    """Experiment status response matching frontend expectations."""
    experiment_id: str
    status: str
    conversation: Optional[Conversation] = None  # Live conversation for running experiments
    conversations: List[Conversation] = []  # Completed conversations
    iterations: int
    current_iteration: int
    error: Optional[str] = None
    # Additional fields that frontend might need
    task: Optional[TaskModel] = None
    agents: Optional[List[AgentModel]] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


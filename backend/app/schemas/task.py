from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class TaskItemModel(BaseModel):
    """Individual task item for dataset-based tasks."""
    
    task: str = Field(..., description="Task description", example="What is 2+2?")
    answer: str = Field(..., description="Expected answer", example="4")

    @field_validator('task', 'answer')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure string fields are not empty."""
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()


class TaskModel(BaseModel):
    """Task configuration for experiments."""
    
    id: str = Field(..., description="Unique identifier for the task", example="task1")
    prompt: str = Field(..., description="Main task prompt or question", example="Solve this math problem: What is 2+2?")
    datasetItems: Optional[List[TaskItemModel]] = Field(None, description="Optional dataset items for dataset-based tasks", example=None)
    expectedSolutionRegex: Optional[str] = Field(None, description="Optional regex pattern to validate solutions", example=r"^\d+$")

    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        """Ensure prompt is not empty."""
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty")
        return v.strip()


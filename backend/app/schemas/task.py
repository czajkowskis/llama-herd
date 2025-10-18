from pydantic import BaseModel, field_validator
from typing import List, Optional


class TaskItemModel(BaseModel):
    task: str
    answer: str

    @field_validator('task', 'answer')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Ensure string fields are not empty."""
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()


class TaskModel(BaseModel):
    id: str
    prompt: str
    datasetItems: Optional[List[TaskItemModel]] = None
    expectedSolutionRegex: Optional[str] = None

    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        """Ensure prompt is not empty."""
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty")
        return v.strip()


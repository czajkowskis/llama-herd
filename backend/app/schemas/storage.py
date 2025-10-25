"""
Storage-specific Pydantic models for data validation.

These models validate the actual JSON structure stored in files,
which may differ slightly from API models.
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict, RootModel
from typing import List, Optional, Any, Dict
from datetime import datetime


class StoredMessage(BaseModel):
    """Message as stored in JSON files."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    agentId: str = Field(alias='agent_id')
    content: str
    timestamp: str
    model: Optional[str] = None


class StoredAgent(BaseModel):
    """Agent configuration as stored in JSON files."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    name: str
    prompt: Optional[str] = None  # Optional for backward compatibility with conversations
    color: str
    model: str
    temperature: Optional[float] = None
    originalName: Optional[str] = Field(None, alias='original_name')


class StoredTaskItem(BaseModel):
    """Task item as stored in JSON files."""
    task: str
    answer: str


class StoredTask(BaseModel):
    """Task configuration as stored in JSON files."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    prompt: str
    datasetItems: Optional[List[StoredTaskItem]] = Field(None, alias='dataset_items')
    expectedSolutionRegex: Optional[str] = Field(None, alias='expected_solution_regex')


class StoredExperiment(BaseModel):
    """Complete experiment data as stored in JSON files."""
    id: str
    title: str
    task: Optional[StoredTask] = None  # Make optional for backward compatibility
    agents: Optional[List[StoredAgent]] = None  # Make optional for backward compatibility
    iterations: Optional[int] = 1
    status: Optional[str] = "pending"
    created_at: str
    updated_at: Optional[str] = None
    results: Optional[List[Any]] = None
    description: Optional[str] = None  # For backward compatibility
    
    @field_validator('created_at', 'updated_at')
    @classmethod
    def validate_datetime(cls, v):
        """Validate datetime strings can be parsed."""
        if v is None:
            return v
        try:
            # Try to parse as ISO format datetime
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid datetime format: {v}")


class ExperimentIndexEntry(BaseModel):
    """Single entry in the experiments index file."""
    id: str
    title: str
    created_at: str
    status: Optional[str] = "pending"  # Make optional with default

    @field_validator('created_at')
    @classmethod
    def validate_datetime(cls, v):
        """Validate datetime string can be parsed."""
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid datetime format: {v}")


class ExperimentsIndex(RootModel):
    """The experiments index file structure (list of entries)."""
    root: List[ExperimentIndexEntry]


class StoredConversation(BaseModel):
    """Conversation data as stored in JSON files."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    title: str
    agents: Optional[List[StoredAgent]] = None  # Make optional for backward compatibility
    messages: Optional[List[StoredMessage]] = None  # Make optional for backward compatibility
    createdAt: str = Field(alias='created_at')
    experiment_id: Optional[str] = None
    iteration: Optional[int] = None
    source: Optional[str] = None
    imported_at: Optional[str] = None

    @field_validator('createdAt', 'imported_at')
    @classmethod
    def validate_datetime(cls, v):
        """Validate datetime strings can be parsed."""
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid datetime format: {v}")

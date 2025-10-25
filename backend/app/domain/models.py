"""
Domain models for the application.
These represent the core business entities separate from API schemas.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class ExperimentStatus(Enum):
    """Experiment status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


class ConversationSource(Enum):
    """Conversation source enumeration."""
    EXPERIMENT = "experiment"
    IMPORTED = "imported"


@dataclass
class Agent:
    """Domain model for an AI agent."""
    id: str
    name: str
    model: str
    prompt: str
    temperature: Optional[float] = None
    color: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "model": self.model,
            "prompt": self.prompt,
            "temperature": self.temperature,
            "color": self.color
        }


@dataclass
class Task:
    """Domain model for a task."""
    prompt: str
    dataset_items: Optional[List[Dict[str, Any]]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "prompt": self.prompt,
            "dataset_items": self.dataset_items
        }


@dataclass
class Message:
    """Domain model for a message."""
    id: str
    agent_id: str
    content: str
    timestamp: datetime
    model: str = "Unknown"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "agentId": self.agent_id,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "model": self.model
        }


@dataclass
class ConversationAgent:
    """Domain model for a conversation agent."""
    id: str
    name: str
    color: str
    model: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "model": self.model
        }


@dataclass
class Conversation:
    """Domain model for a conversation."""
    id: str
    title: str
    agents: List[ConversationAgent]
    messages: List[Message]
    created_at: datetime
    experiment_id: Optional[str] = None
    iteration: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "title": self.title,
            "agents": [agent.to_dict() for agent in self.agents],
            "messages": [message.to_dict() for message in self.messages],
            "createdAt": self.created_at.isoformat(),
            "experiment_id": self.experiment_id,
            "iteration": self.iteration
        }


@dataclass
class Experiment:
    """Domain model for an experiment."""
    id: str
    title: str
    task: Task
    agents: List[Agent]
    status: ExperimentStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    iterations: int = 1
    current_iteration: int = 0
    conversations: List[Conversation] = None
    
    def __post_init__(self):
        if self.conversations is None:
            self.conversations = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "title": self.title,
            "task": self.task.to_dict(),
            "agents": [agent.to_dict() for agent in self.agents],
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "iterations": self.iterations,
            "current_iteration": self.current_iteration,
            "conversations": [conv.to_dict() for conv in self.conversations]
        }


@dataclass
class PullTask:
    """Domain model for a pull task."""
    task_id: str
    model_name: str
    status: str
    progress: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    last_retry_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "task_id": self.task_id,
            "model_name": self.model_name,
            "status": self.status,
            "progress": self.progress,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "retry_count": self.retry_count,
            "last_retry_at": self.last_retry_at.isoformat() if self.last_retry_at else None
        }

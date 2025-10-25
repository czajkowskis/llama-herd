"""
Repository interfaces for data access.
These define the contracts for data access without implementation details.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from .models import Experiment, Conversation, PullTask


class ExperimentRepository(ABC):
    """Repository interface for experiment data access."""
    
    @abstractmethod
    def save(self, experiment: Experiment) -> bool:
        """Save an experiment."""
        pass
    
    @abstractmethod
    def get_by_id(self, experiment_id: str) -> Optional[Experiment]:
        """Get an experiment by ID."""
        pass
    
    @abstractmethod
    def get_all(self) -> List[Experiment]:
        """Get all experiments."""
        pass
    
    @abstractmethod
    def update(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an experiment."""
        pass
    
    @abstractmethod
    def delete(self, experiment_id: str) -> bool:
        """Delete an experiment."""
        pass
    
    @abstractmethod
    def exists(self, experiment_id: str) -> bool:
        """Check if an experiment exists."""
        pass


class ConversationRepository(ABC):
    """Repository interface for conversation data access."""
    
    @abstractmethod
    def save(self, conversation: Conversation) -> bool:
        """Save a conversation."""
        pass
    
    @abstractmethod
    def get_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID."""
        pass
    
    @abstractmethod
    def get_by_experiment(self, experiment_id: str) -> List[Conversation]:
        """Get all conversations for an experiment."""
        pass
    
    @abstractmethod
    def get_all(self, source: Optional[str] = None) -> List[Conversation]:
        """Get all conversations, optionally filtered by source."""
        pass
    
    @abstractmethod
    def update(self, conversation_id: str, updates: Dict[str, Any]) -> bool:
        """Update a conversation."""
        pass
    
    @abstractmethod
    def delete(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        pass
    
    @abstractmethod
    def save_experiment_conversation(
        self, 
        experiment_id: str, 
        iteration: int, 
        title: str, 
        conversation: Conversation
    ) -> bool:
        """Save an experiment conversation."""
        pass


class PullTaskRepository(ABC):
    """Repository interface for pull task data access."""
    
    @abstractmethod
    def save(self, task: PullTask) -> bool:
        """Save a pull task."""
        pass
    
    @abstractmethod
    def get_by_id(self, task_id: str) -> Optional[PullTask]:
        """Get a pull task by ID."""
        pass
    
    @abstractmethod
    def get_all(self) -> List[PullTask]:
        """Get all pull tasks."""
        pass
    
    @abstractmethod
    def update(self, task_id: str, updates: Dict[str, Any]) -> bool:
        """Update a pull task."""
        pass
    
    @abstractmethod
    def delete(self, task_id: str) -> bool:
        """Delete a pull task."""
        pass
    
    @abstractmethod
    def get_by_status(self, status: str) -> List[PullTask]:
        """Get pull tasks by status."""
        pass

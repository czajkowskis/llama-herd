from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseStorage(ABC):
    """Abstract base class for storage implementations."""

    @abstractmethod
    def save_experiment(self, experiment: Dict[str, Any]) -> bool:
        """Save an experiment."""
        pass

    @abstractmethod
    def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get an experiment by ID."""
        pass

    @abstractmethod
    def get_experiments(self) -> List[Dict[str, Any]]:
        """Get all experiments."""
        pass

    @abstractmethod
    def update_experiment(self, experiment_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing experiment."""
        pass

    @abstractmethod
    def delete_experiment(self, experiment_id: str) -> bool:
        """Delete an experiment."""
        pass

    @abstractmethod
    def save_experiment_conversation(self, experiment_id: str, iteration: int, title: str, conversation: Dict[str, Any], experiment_title: str = None) -> bool:
        """Save an experiment conversation."""
        pass

    @abstractmethod
    def get_experiment_conversations(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific experiment."""
        pass

    @abstractmethod
    def delete_experiment_conversation(self, experiment_id: str, iteration: int, title: str) -> bool:
        """Delete a specific experiment conversation."""
        pass

    @abstractmethod
    def save_conversation(self, conversation: Dict[str, Any]) -> bool:
        """Save an imported conversation."""
        pass

    @abstractmethod
    def get_conversations(self, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get imported conversations."""
        pass

    @abstractmethod
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID."""
        pass

    @abstractmethod
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete an imported conversation."""
        pass

    @abstractmethod
    def clear_all(self) -> bool:
        """Clear all stored data."""
        pass

    @abstractmethod
    def get_storage_info(self) -> Dict[str, Any]:
        """Get information about stored data."""
        pass

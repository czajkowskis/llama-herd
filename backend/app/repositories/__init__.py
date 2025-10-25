"""
Repository module for data access layer.
"""
from .experiment_repository import FileExperimentRepository
from .conversation_repository import FileConversationRepository
from ..domain.repositories import ExperimentRepository, ConversationRepository

# Repository instances
_experiment_repository: ExperimentRepository = None
_conversation_repository: ConversationRepository = None


def get_experiment_repository() -> ExperimentRepository:
    """Get the experiment repository instance."""
    global _experiment_repository
    if _experiment_repository is None:
        _experiment_repository = FileExperimentRepository()
    return _experiment_repository


def get_conversation_repository() -> ConversationRepository:
    """Get the conversation repository instance."""
    global _conversation_repository
    if _conversation_repository is None:
        _conversation_repository = FileConversationRepository()
    return _conversation_repository


def reset_repositories():
    """Reset repository instances (useful for testing)."""
    global _experiment_repository, _conversation_repository
    _experiment_repository = None
    _conversation_repository = None


__all__ = [
    "FileExperimentRepository",
    "FileConversationRepository", 
    "get_experiment_repository",
    "get_conversation_repository",
    "reset_repositories"
]

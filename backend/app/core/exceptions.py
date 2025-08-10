"""
Custom application exceptions.
"""


class AppException(Exception):
    """Base application exception."""
    pass


class ValidationError(AppException):
    """Validation error exception."""
    pass


class NotFoundError(AppException):
    """Resource not found exception."""
    pass


class ExperimentError(AppException):
    """Experiment-related error exception."""
    pass


class AgentError(AppException):
    """Agent-related error exception."""
    pass


class StorageError(AppException):
    """Storage-related error exception."""
    pass 
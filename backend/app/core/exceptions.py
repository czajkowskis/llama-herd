"""
Custom application exceptions with structured error details.
"""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base application exception with structured error details."""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize application exception.
        
        Args:
            message: Human-readable error message
            error_code: Machine-readable error code
            details: Additional error context/details
        """
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON responses."""
        return {
            'error': self.error_code,
            'message': self.message,
            'details': self.details
        }


class ValidationError(AppException):
    """Validation error exception (400 Bad Request)."""
    
    def __init__(self, message: str, field: Optional[str] = None, **details):
        """
        Initialize validation error.
        
        Args:
            message: Error message
            field: Field that failed validation
            **details: Additional validation error details
        """
        error_details = details.copy()
        if field:
            error_details['field'] = field
        super().__init__(message, error_code='VALIDATION_ERROR', details=error_details)


class NotFoundError(AppException):
    """Resource not found exception (404 Not Found)."""
    
    def __init__(self, message: str, resource_type: Optional[str] = None, resource_id: Optional[str] = None):
        """
        Initialize not found error.
        
        Args:
            message: Error message
            resource_type: Type of resource (e.g., 'experiment', 'conversation')
            resource_id: ID of the missing resource
        """
        details = {}
        if resource_type:
            details['resource_type'] = resource_type
        if resource_id:
            details['resource_id'] = resource_id
        super().__init__(message, error_code='NOT_FOUND', details=details)


class AuthError(AppException):
    """Authentication/authorization error (401/403)."""
    
    def __init__(self, message: str, auth_type: str = 'authentication'):
        """
        Initialize auth error.
        
        Args:
            message: Error message
            auth_type: Type of auth error ('authentication' or 'authorization')
        """
        super().__init__(
            message, 
            error_code='AUTH_ERROR',
            details={'auth_type': auth_type}
        )


class ExperimentError(AppException):
    """Experiment-related error exception."""
    
    def __init__(self, message: str, experiment_id: Optional[str] = None, **details):
        """
        Initialize experiment error.
        
        Args:
            message: Error message
            experiment_id: Related experiment ID
            **details: Additional error context
        """
        error_details = details.copy()
        if experiment_id:
            error_details['experiment_id'] = experiment_id
        super().__init__(message, error_code='EXPERIMENT_ERROR', details=error_details)


class AgentError(AppException):
    """Agent-related error exception."""
    
    def __init__(self, message: str, agent_name: Optional[str] = None, **details):
        """
        Initialize agent error.
        
        Args:
            message: Error message
            agent_name: Name of the agent with issues
            **details: Additional error context
        """
        error_details = details.copy()
        if agent_name:
            error_details['agent_name'] = agent_name
        super().__init__(message, error_code='AGENT_ERROR', details=error_details)


class StorageError(AppException):
    """Storage-related error exception."""
    
    def __init__(self, message: str, operation: Optional[str] = None, **details):
        """
        Initialize storage error.
        
        Args:
            message: Error message
            operation: Storage operation that failed (e.g., 'read', 'write', 'delete')
            **details: Additional error context
        """
        error_details = details.copy()
        if operation:
            error_details['operation'] = operation
        super().__init__(message, error_code='STORAGE_ERROR', details=error_details)


class ConversationError(AppException):
    """Conversation-related error exception."""
    
    def __init__(self, message: str, conversation_id: Optional[str] = None, **details):
        """
        Initialize conversation error.
        
        Args:
            message: Error message
            conversation_id: Related conversation ID
            **details: Additional error context
        """
        error_details = details.copy()
        if conversation_id:
            error_details['conversation_id'] = conversation_id
        super().__init__(message, error_code='CONVERSATION_ERROR', details=error_details)
 
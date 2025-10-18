from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from ...storage import get_storage
from ...core.exceptions import NotFoundError, ConversationError, StorageError
from ...utils.logging import get_logger, log_with_context
from ...utils.case_converter import normalize_dict_to_snake

storage = get_storage()
logger = get_logger(__name__)


router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("")
async def save_conversation(conversation: dict):
    """Save a conversation to persistent storage."""
    try:
        # Normalize camelCase keys to snake_case
        normalized_conversation = normalize_dict_to_snake(conversation, deep=True)
        
        conversation_id = normalized_conversation.get('id', 'unknown')
        
        success = storage.save_conversation(normalized_conversation)
        if success:
            log_with_context(
                logger,
                'info',
                f"Saved conversation",
                conversation_id=conversation_id
            )
            return {"message": "Conversation saved", "id": conversation_id}
        else:
            raise StorageError(
                "Failed to save conversation",
                operation="write",
                conversation_id=conversation_id
            )
    except StorageError:
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error saving conversation: {str(e)}",
            exception_type=type(e).__name__
        )
        raise ConversationError(f"Error saving conversation: {str(e)}")


@router.get("")
async def list_conversations(source: Optional[str] = None):
    """Get all conversations, optionally filtered by source."""
    try:
        conversations = storage.get_conversations(source)
        log_with_context(
            logger,
            'info',
            f"Retrieved conversations",
            count=len(conversations),
            source=source
        )
        return {"conversations": conversations}
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error retrieving conversations: {str(e)}",
            exception_type=type(e).__name__
        )
        raise StorageError(
            f"Error retrieving conversations",
            operation="read"
        )


@router.get("/experiment/{experiment_id}")
async def get_experiment_conversations(experiment_id: str):
    """Get all conversations for a specific experiment."""
    try:
        conversations = storage.get_experiment_conversations(experiment_id)
        log_with_context(
            logger,
            'info',
            f"Retrieved experiment conversations",
            experiment_id=experiment_id,
            count=len(conversations)
        )
        return {"conversations": conversations}
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error retrieving experiment conversations: {str(e)}",
            experiment_id=experiment_id,
            exception_type=type(e).__name__
        )
        raise ConversationError(
            f"Error retrieving experiment conversations",
            experiment_id=experiment_id
        )


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation by ID."""
    try:
        conversation = storage.get_conversation(conversation_id)
        if conversation:
            log_with_context(
                logger,
                'info',
                f"Retrieved conversation",
                conversation_id=conversation_id
            )
            return conversation
        else:
            raise NotFoundError(
                f"Conversation not found",
                resource_type="conversation",
                resource_id=conversation_id
            )
    except NotFoundError:
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error retrieving conversation: {str(e)}",
            conversation_id=conversation_id,
            exception_type=type(e).__name__
        )
        raise ConversationError(
            f"Error retrieving conversation",
            conversation_id=conversation_id
        )


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    try:
        success = storage.delete_conversation(conversation_id)
        if success:
            log_with_context(
                logger,
                'info',
                f"Deleted conversation",
                conversation_id=conversation_id
            )
            return {"message": "Conversation deleted"}
        else:
            raise NotFoundError(
                f"Conversation not found",
                resource_type="conversation",
                resource_id=conversation_id
            )
    except NotFoundError:
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error deleting conversation: {str(e)}",
            conversation_id=conversation_id,
            exception_type=type(e).__name__
        )
        raise ConversationError(
            f"Error deleting conversation",
            conversation_id=conversation_id
        )


@router.get("/storage/info")
async def get_storage_info():
    """Get information about stored data."""
    try:
        info = storage.get_storage_info()
        logger.info("Retrieved storage info")
        return info
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error retrieving storage info: {str(e)}",
            exception_type=type(e).__name__
        )
        raise StorageError(
            "Error retrieving storage info",
            operation="read"
        )
 
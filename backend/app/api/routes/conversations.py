from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from ...storage.file_storage import storage


router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("")
async def save_conversation(conversation: dict):
    """Save a conversation to persistent storage."""
    try:
        success = storage.save_conversation(conversation)
        if success:
            return {"message": "Conversation saved", "id": conversation.get('id')}
        else:
            raise HTTPException(status_code=500, detail="Failed to save conversation")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving conversation: {str(e)}")


@router.get("")
async def list_conversations(source: Optional[str] = None):
    """Get all conversations, optionally filtered by source."""
    try:
        conversations = storage.get_conversations(source)
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving conversations: {str(e)}")


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation by ID."""
    try:
        conversation = storage.get_conversation(conversation_id)
        if conversation:
            return conversation
        else:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving conversation: {str(e)}")


@router.get("/experiment/{experiment_id}")
async def get_experiment_conversations(experiment_id: str):
    """Get all conversations for a specific experiment."""
    try:
        conversations = storage.get_experiment_conversations(experiment_id)
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving experiment conversations: {str(e)}")


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    try:
        success = storage.delete_conversation(conversation_id)
        if success:
            return {"message": "Conversation deleted"}
        else:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting conversation: {str(e)}")


@router.get("/storage/info")
async def get_storage_info():
    """Get information about stored data."""
    try:
        info = storage.get_storage_info()
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving storage info: {str(e)}") 
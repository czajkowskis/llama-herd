from fastapi import APIRouter, HTTPException
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Callable
import requests
import json
import asyncio
import functools
from datetime import datetime, UTC

from ...core.config import settings
from ...utils.logging import get_logger
from ...services.pull_manager import pull_manager
from ...services.model_catalog_service import model_catalog_service

logger = get_logger(__name__)

def handle_ollama_errors(func: Callable) -> Callable:
    """
    Decorator specifically for handling Ollama-related errors.
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ollama error in {func.__name__}: {str(e)}")
            # Provide more specific error messages for common Ollama issues
            error_msg = str(e).lower()
            if "connection" in error_msg or "timeout" in error_msg:
                raise HTTPException(status_code=503, detail="Failed to connect to Ollama service")
            elif "not found" in error_msg:
                raise HTTPException(status_code=404, detail="Model not found")
            else:
                raise HTTPException(status_code=500, detail="Internal server error")
    return wrapper

router = APIRouter(prefix="/api/models", tags=["models"])

# Ollama server URL - should be configurable
OLLAMA_URL = getattr(settings, 'ollama_url', 'http://localhost:11434')

class ModelInfo(BaseModel):
    """Information about an installed Ollama model."""
    
    name: str = Field(..., description="Model name", example="llama2")
    size: int = Field(..., description="Model size in bytes", example=3825819519)
    digest: str = Field(..., description="Model digest hash", example="sha256:abc123...")
    modified_at: str = Field(..., description="Last modification timestamp (ISO format)", example="2024-01-15T10:30:00Z")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional model details", example={"format": "gguf", "family": "llama"})

class ListModelsResponse(BaseModel):
    """Response containing list of installed models."""
    
    models: List[ModelInfo] = Field(..., description="List of installed models", example=[])

class PullModelRequest(BaseModel):
    """Request to pull a model from Ollama."""
    
    name: str = Field(..., description="Model name to pull (e.g., 'llama2')", example="llama2")

class PullModelResponse(BaseModel):
    """Response after initiating a model pull."""
    
    task_id: Optional[str] = Field(None, description="Unique task ID for tracking pull progress", example="task_abc123")
    message: str = Field(..., description="Status message", example="Started pulling model llama2")
    existing_task_id: Optional[str] = Field(None, description="Task ID if model is already being pulled", example="existing_task_xyz789")

class PullTaskStatus(BaseModel):
    """Status information for a model pull task."""
    
    task_id: str = Field(..., description="Unique task ID", example="task_abc123")
    model_name: str = Field(..., description="Model being pulled", example="llama2")
    status: str = Field(..., description="Task status (pending, running, completed, error, cancelled)", example="running")
    progress: Optional[Dict[str, Any]] = Field(None, description="Progress information", example={"completed": 50.5, "total": 100.0})
    error: Optional[str] = Field(None, description="Error message if failed", example=None)
    created_at: str = Field(..., description="Creation timestamp (ISO format)", example="2024-01-15T10:30:00Z")
    started_at: Optional[str] = Field(None, description="Start timestamp (ISO format)", example="2024-01-15T10:30:05Z")
    completed_at: Optional[str] = Field(None, description="Completion timestamp (ISO format)", example=None)

class DeleteModelRequest(BaseModel):
    """Request to delete a model."""
    
    name: str = Field(..., description="Model name to delete", example="llama2")

class ModelOperationResponse(BaseModel):
    """Response for model operations (delete, etc.)."""
    
    success: bool = Field(..., description="Whether the operation succeeded", example=True)
    message: str = Field(..., description="Operation result message", example="Model llama2 deleted successfully")

def check_ollama_connection():
    """Check if Ollama is reachable."""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/version", timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def _serialize_pull_task(task) -> PullTaskStatus:
    """Serialize a PullTask to PullTaskStatus response model."""
    return PullTaskStatus(
        task_id=task.task_id,
        model_name=task.model_name,
        status=task.status,
        progress=task.progress,
        error=task.error,
        created_at=task.created_at.isoformat() if task.created_at else None,
        started_at=task.started_at.isoformat() if task.started_at else None,
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
    )

def _serialize_pull_task_for_websocket(task) -> Dict[str, Any]:
    """Serialize a PullTask to dictionary format for WebSocket messages."""
    return {
        "task_id": task.task_id,
        "model_name": task.model_name,
        "status": task.status,
        "progress": task.progress,
        "error": task.error,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }

def require_ollama_connection(func):
    """Decorator to check Ollama connection before executing endpoint."""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")
        return await func(*args, **kwargs)
    return wrapper

@router.get("/list")
@require_ollama_connection
@handle_ollama_errors
async def list_models():
    """List all installed models."""
    response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=30)
    if response.status_code != 200:
        error_detail = response.text or "Failed to fetch models from Ollama"
        # Try to provide more specific error messages
        if "connection refused" in error_detail.lower():
            error_detail = "Cannot connect to Ollama. Please ensure Ollama is running and accessible."
        elif "no such file" in error_detail.lower():
            error_detail = "Ollama service not found. Please install and start Ollama."
        raise HTTPException(status_code=response.status_code, detail=error_detail)

    data = response.json()
    return ListModelsResponse(models=data.get("models", []))

@router.post("/pull")
@require_ollama_connection
async def pull_model(request: PullModelRequest) -> PullModelResponse:
    """Start pulling a model in the background and return task ID."""
    try:

        # Check if model is already being pulled. Allow retry if the existing task
        # appears inactive (no live thread or stale progress).
        now = datetime.now(UTC)
        for task in pull_manager.get_all_pull_tasks().values():
            if task.model_name != request.name:
                continue
            if task.status not in ['pending', 'running']:
                continue

            # If there's no thread handle or the thread is not alive, consider stale
            thread_dead = (not task.task_handle) or (hasattr(task.task_handle, 'is_alive') and not task.task_handle.is_alive())

            # If we have a last_progress_update timestamp, consider it stale if older than 60s
            stale_progress = False
            try:
                if task.last_progress_update:
                    age = (now - task.last_progress_update).total_seconds()
                    if age > 60:
                        stale_progress = True
            except Exception:
                stale_progress = False

            if thread_dead or stale_progress:
                # Mark the old task as stale/error so it doesn't block the retry
                pull_manager.mark_task_stale(task.task_id, 'Stale or inactive; allowing retry')
                logger.info(f"Existing pull task {task.task_id} for {request.name} marked stale to allow retry")
                continue

            # Otherwise, it's actively running - return existing task ID in response
            return PullModelResponse(
                task_id=None,
                message=f"Model {request.name} is already being pulled",
                existing_task_id=task.task_id
            )

        # Estimate model size and check disk space
        estimated_size = pull_manager._get_model_size_estimate(request.name)
        if not pull_manager._check_disk_space(estimated_size):
            raise HTTPException(status_code=507, detail="Insufficient disk space")

        # Create background pull task
        task_id = pull_manager.create_pull_task(request.name)

        # Use manager-level pull implementation so pulls continue independent of the request
        def perform_pull(task_id: str, stop_event=None):
            # Delegate to the manager's internal performer which knows how to call Ollama
            pull_manager._perform_pull_model(task_id, request.name, stop_event)

        # Start the background task
        if not pull_manager.start_pull_task(task_id, perform_pull):
            raise HTTPException(status_code=500, detail="Failed to start pull task")

        return PullModelResponse(
            task_id=task_id,
            message=f"Started pulling model {request.name}"
        )

    except HTTPException:
        # Re-raise HTTPExceptions (they're already properly formatted)
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Error pulling model {request.name}: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to pull model: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error pulling model {request.name}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/pull/{task_id}")
async def get_pull_status(task_id: str) -> PullTaskStatus:
    """Get the status of a model pull task."""
    task = pull_manager.get_pull_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Pull task not found")

    return _serialize_pull_task(task)

@router.get("/pull/by-model/{model_name}")
async def get_pull_by_model(model_name: str) -> Optional[PullTaskStatus]:
    """Get the most recent pull task for a specific model."""
    all_tasks = pull_manager.get_all_pull_tasks()
    
    # Find the most recent task for this model
    matching_tasks = [
        task for task in all_tasks.values()
        if task.model_name == model_name
    ]
    
    if not matching_tasks:
        raise HTTPException(status_code=404, detail=f"No pull task found for model {model_name}")
    
    # Return the most recently created task
    latest_task = max(matching_tasks, key=lambda t: t.created_at)
    return _serialize_pull_task(latest_task)


@router.get("/pull/{task_id}/health")
async def get_pull_health(task_id: str):
    """Return low-level health info about a pull task (worker alive, last progress age, retries)."""
    info = pull_manager.get_task_health(task_id)
    if info is None:
        raise HTTPException(status_code=404, detail="Pull task not found")
    return info

@router.delete("/pull/{task_id}")
async def cancel_pull_task(task_id: str) -> ModelOperationResponse:
    """Cancel a running model pull task."""
    task = pull_manager.get_pull_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Pull task not found")

    if task.status not in ['pending', 'running']:
        raise HTTPException(status_code=400, detail=f"Cannot cancel task with status '{task.status}'")

    if pull_manager.cancel_pull_task(task_id):
        return ModelOperationResponse(
            success=True,
            message=f"Pull task {task_id} cancelled successfully"
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to cancel pull task")


@router.delete("/pull/{task_id}/dismiss")
async def dismiss_pull_task(task_id: str) -> ModelOperationResponse:
    """Permanently remove a pull task so it will not reappear in listings."""
    task = pull_manager.get_pull_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Pull task not found")

    try:
        removed = pull_manager.remove_pull_task(task_id)
        if removed:
            return ModelOperationResponse(success=True, message=f"Pull task {task_id} removed")
        else:
            raise HTTPException(status_code=500, detail="Failed to remove pull task")
    except Exception as e:
        logger.exception(f"Failed to dismiss pull task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/pull")
async def list_pull_tasks() -> Dict[str, PullTaskStatus]:
    """List all model pull tasks."""
    tasks = pull_manager.get_all_pull_tasks()
    result = {}

    for task_id, task in tasks.items():
        result[task_id] = _serialize_pull_task(task)

    return result

@router.websocket("/ws/pull/{task_id}")
async def websocket_pull_progress(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time model pull progress updates."""
    await websocket.accept()

    # Check if task exists
    task = pull_manager.get_pull_task(task_id)
    if not task:
        await websocket.close(code=4004, reason="Pull task not found")
        return

    # Send initial status
    await websocket.send_text(json.dumps({
        "type": "status",
        "data": _serialize_pull_task_for_websocket(task)
    }))

    # Get the current event loop for the callback
    loop = asyncio.get_running_loop()

    # Register progress callback
    def progress_callback(task_id: str, progress: Dict[str, Any]):
        logger.info(f"Sending progress update for task {task_id}: {progress}")
        try:
            asyncio.run_coroutine_threadsafe(
                websocket.send_text(json.dumps({
                    "type": "progress",
                    "data": progress
                })),
                loop
            )
        except Exception as e:
            logger.error(f"Error sending progress update for task {task_id}: {e}")

    pull_manager.register_progress_callback(task_id, progress_callback)

    try:
        # Keep connection alive and listen for status changes
        while True:
            try:
                # Wait for any message or timeout
                await asyncio.wait_for(websocket.receive_text(), timeout=1.0)

                # Send current status on any message (ping)
                current_task = pull_manager.get_pull_task(task_id)
                if current_task:
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "data": _serialize_pull_task_for_websocket(current_task)
                    }))

                    # If task is completed, we can close the connection
                    if current_task.status in ['completed', 'error', 'cancelled']:
                        break

            except asyncio.TimeoutError:
                # Check if task is completed during timeout
                current_task = pull_manager.get_pull_task(task_id)
                if current_task and current_task.status in ['completed', 'error', 'cancelled']:
                    # Send final status and exit
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "data": _serialize_pull_task_for_websocket(current_task)
                    }))
                    break
                # Continue listening if task is still running

    except WebSocketDisconnect:
        logger.debug(f"WebSocket disconnected for pull task {task_id}")
    finally:
        # Unregister callback
        pull_manager.unregister_progress_callback(task_id)

@router.get("/version")
@require_ollama_connection
@handle_ollama_errors
async def get_version():
    """Get Ollama version information."""
    response = requests.get(f"{OLLAMA_URL}/api/version", timeout=10)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to get version")

    return response.json()

@router.delete("/delete/{model_name}")
@require_ollama_connection
async def delete_model(model_name: str) -> ModelOperationResponse:
    """Delete a model from Ollama."""
    try:

        # Check if model exists
        list_response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=30)
        if list_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to verify model existence")

        models_data = list_response.json()
        model_exists = any(model['name'] == model_name for model in models_data.get('models', []))
        if not model_exists:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")

        # Delete the model
        delete_response = requests.delete(f"{OLLAMA_URL}/api/delete",
                                        json={"name": model_name}, timeout=60)

        if delete_response.status_code not in [200, 204]:
            error_msg = delete_response.text or "Failed to delete model"
            raise HTTPException(status_code=delete_response.status_code, detail=error_msg)

        return ModelOperationResponse(success=True, message=f"Model {model_name} deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting model {model_name}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/catalog")
async def get_model_catalog():
    """Get curated model catalog."""
    # This could be extended to fetch from external registries
    catalog = model_catalog_service.get_catalog()
    return {"models": catalog}
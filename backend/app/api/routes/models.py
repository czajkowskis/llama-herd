from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import json
import logging
import asyncio
from datetime import datetime

from ...core.config import settings
from ...utils.logging import get_logger
from ...services.model_pull_manager import pull_manager

logger = get_logger(__name__)

router = APIRouter(prefix="/api/models", tags=["models"])

# Ollama server URL - should be configurable
OLLAMA_URL = getattr(settings, 'ollama_url', 'http://localhost:11434')

class ModelInfo(BaseModel):
    name: str
    size: int
    digest: str
    modified_at: str
    details: Optional[Dict[str, Any]] = None

class ListModelsResponse(BaseModel):
    models: List[ModelInfo]

class PullModelRequest(BaseModel):
    name: str

class PullModelResponse(BaseModel):
    task_id: str
    message: str

class PullTaskStatus(BaseModel):
    task_id: str
    model_name: str
    status: str
    progress: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class DeleteModelRequest(BaseModel):
    name: str

class ModelOperationResponse(BaseModel):
    success: bool
    message: str

def check_ollama_connection():
    """Check if Ollama is reachable."""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/version", timeout=5)
        return response.status_code == 200
    except:
        return False

@router.get("/list")
async def list_models():
    """List all installed models."""
    try:
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")

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

    except HTTPException:
        # Re-raise HTTPExceptions (they're already properly formatted)
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Ollama: {e}")
        raise HTTPException(status_code=503, detail="Failed to connect to Ollama service")
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/pull")
async def pull_model(request: PullModelRequest) -> PullModelResponse:
    """Start pulling a model in the background and return task ID."""
    try:
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")

        # Check if model is already being pulled. Allow retry if the existing task
        # appears inactive (no live thread or stale progress).
        now = datetime.utcnow()
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

            # Otherwise, it's actively running - block the new pull
            raise HTTPException(status_code=409, detail=f"Model {request.name} is already being pulled")

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
        result[task_id] = PullTaskStatus(
            task_id=task.task_id,
            model_name=task.model_name,
            status=task.status,
            progress=task.progress,
            error=task.error,
            created_at=task.created_at.isoformat() if task.created_at else None,
            started_at=task.started_at.isoformat() if task.started_at else None,
            completed_at=task.completed_at.isoformat() if task.completed_at else None,
        )

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
        "data": {
            "task_id": task.task_id,
            "model_name": task.model_name,
            "status": task.status,
            "progress": task.progress,
            "error": task.error,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        }
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
                        "data": {
                            "task_id": current_task.task_id,
                            "model_name": current_task.model_name,
                            "status": current_task.status,
                            "progress": current_task.progress,
                            "error": current_task.error,
                            "created_at": current_task.created_at.isoformat() if current_task.created_at else None,
                            "started_at": current_task.started_at.isoformat() if current_task.started_at else None,
                            "completed_at": current_task.completed_at.isoformat() if current_task.completed_at else None,
                        }
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
                        "data": {
                            "task_id": current_task.task_id,
                            "model_name": current_task.model_name,
                            "status": current_task.status,
                            "progress": current_task.progress,
                            "error": current_task.error,
                            "created_at": current_task.created_at.isoformat() if current_task.created_at else None,
                            "started_at": current_task.started_at.isoformat() if current_task.started_at else None,
                            "completed_at": current_task.completed_at.isoformat() if current_task.completed_at else None,
                        }
                    }))
                    break
                # Continue listening if task is still running

    except WebSocketDisconnect:
        logger.debug(f"WebSocket disconnected for pull task {task_id}")
    finally:
        # Unregister callback
        pull_manager.unregister_progress_callback(task_id)

@router.get("/version")
async def get_version():
    """Get Ollama version information."""
    try:
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")

        response = requests.get(f"{OLLAMA_URL}/api/version", timeout=10)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get version")

        return response.json()

    except requests.exceptions.RequestException as e:
        logger.error(f"Error getting Ollama version: {e}")
        raise HTTPException(status_code=503, detail="Failed to connect to Ollama service")
    except Exception as e:
        logger.error(f"Unexpected error getting version: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/delete/{model_name}")
async def delete_model(model_name: str) -> ModelOperationResponse:
    """Delete a model from Ollama."""
    try:
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")

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
    catalog = _get_model_catalog_data()
    return {"models": catalog}

def _get_model_catalog_data():
    """Get the static model catalog data."""
    return [
        # Llama family
        {"name": "Llama 3 8B Instruct Q4", "tag": "llama3:8b-instruct-q4_0", "size": 1900000000, "family": "llama", "quant": "q4_0", "notes": "Latest Llama 3 model, great for general chat"},
        {"name": "Llama 3 8B Instruct Q5", "tag": "llama3:8b-instruct-q5_0", "size": 2400000000, "family": "llama", "quant": "q5_0", "notes": "Higher quality quantization"},
        {"name": "Llama 3 70B Instruct Q4", "tag": "llama3:70b-instruct-q4_0", "size": 15000000000, "family": "llama", "quant": "q4_0", "notes": "Large 70B model for complex tasks"},

        # Code Llama family
        {"name": "Code Llama 7B Q4", "tag": "codellama:7b-instruct-q4_0", "size": 1800000000, "family": "codellama", "quant": "q4_0", "notes": "Specialized for coding tasks"},
        {"name": "Code Llama 13B Q4", "tag": "codellama:13b-instruct-q4_0", "size": 3500000000, "family": "codellama", "quant": "q4_0", "notes": "Larger Code Llama"},
        {"name": "Code Llama 34B Q4", "tag": "codellama:34b-instruct-q4_0", "size": 8000000000, "family": "codellama", "quant": "q4_0", "notes": "Very large Code Llama"},

        # Mistral family
        {"name": "Mistral 7B Instruct Q5", "tag": "mistral:7b-instruct-q5_1", "size": 1700000000, "family": "mistral", "quant": "q5_1", "notes": "Fast and efficient"},
        {"name": "Mixtral 8x7B Instruct Q3", "tag": "mixtral:8x7b-instruct-v0.1-q3_K_M", "size": 7500000000, "family": "mistral", "quant": "q3_K_M", "notes": "Mixture of experts"},

        # Other models
        {"name": "Phi-3 Mini 3.8B Q4", "tag": "phi3:3.8b-mini-instruct-4k-q4_0", "size": 900000000, "family": "phi", "quant": "q4_0", "notes": "Microsoft Phi-3"},
        {"name": "Gemma 7B Q4", "tag": "gemma:7b-instruct-q4_0", "size": 1800000000, "family": "gemma", "quant": "q4_0", "notes": "Google Gemma"},
        {"name": "Qwen 7B Chat Q4", "tag": "qwen:7b-chat-q4_0", "size": 1900000000, "family": "qwen", "quant": "q4_0", "notes": "Alibaba Qwen"},
    ]
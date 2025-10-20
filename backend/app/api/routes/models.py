from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import json
import logging
import asyncio
from datetime import datetime

from ...core.config import settings
from ...utils.logging import get_logger

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
async def pull_model(request: PullModelRequest, req: Request):
    """Pull a model from the registry with progress streaming."""
    try:
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")

        # Start the pull request to Ollama
        pull_data = {"name": request.name, "stream": True}
        response = requests.post(
            f"{OLLAMA_URL}/api/pull",
            json=pull_data,
            stream=True,
            timeout=300  # 5 minutes timeout
        )

        if response.status_code != 200:
            error_detail = response.text or "Failed to start model pull"
            # Provide more specific error messages
            if "already exists" in error_detail.lower():
                error_detail = f"Model {request.name} is already installed."
            elif "not found" in error_detail.lower():
                error_detail = f"Model {request.name} not found in Ollama registry."
            elif "disk" in error_detail.lower() or "space" in error_detail.lower():
                error_detail = "Insufficient disk space to download the model."
            elif "network" in error_detail.lower() or "connection" in error_detail.lower():
                error_detail = "Network error occurred during download."
            raise HTTPException(status_code=response.status_code, detail=error_detail)

        async def generate():
            """Stream the pull progress as Server-Sent Events."""
            try:
                for line in response.iter_lines():
                    if line:
                        try:
                            progress_data = json.loads(line.decode('utf-8'))
                            # Convert to SSE format
                            event_data = f"data: {json.dumps(progress_data)}\n\n"
                            yield event_data.encode('utf-8')
                        except json.JSONDecodeError:
                            continue

                # Send completion event
                completion_data = {"status": "completed", "model": request.name}
                yield f"data: {json.dumps(completion_data)}\n\n".encode('utf-8')

            except Exception as e:
                logger.error(f"Error during model pull streaming: {e}")
                error_data = {"status": "error", "error": str(e)}
                yield f"data: {json.dumps(error_data)}\n\n".encode('utf-8')

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
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

@router.delete("/delete")
async def delete_model(name: str):
    """Delete a model from local storage."""
    try:
        if not check_ollama_connection():
            raise HTTPException(status_code=503, detail="Ollama service is not available")

        delete_data = {"name": name}
        response = requests.delete(f"{OLLAMA_URL}/api/delete", json=delete_data, timeout=30)

        if response.status_code == 200:
            return ModelOperationResponse(success=True, message=f"Model {name} deleted successfully")
        else:
            error_detail = response.text or "Failed to delete model"
            # Provide more specific error messages
            if "not found" in error_detail.lower():
                error_detail = f"Model {name} not found or already deleted."
            elif "in use" in error_detail.lower():
                error_detail = f"Model {name} is currently in use and cannot be deleted."
            raise HTTPException(status_code=response.status_code, detail=error_detail)

    except HTTPException:
        # Re-raise HTTPExceptions (they're already properly formatted)
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Error deleting model {name}: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to delete model: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error deleting model {name}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

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

@router.get("/catalog")
async def get_model_catalog():
    """Get curated model catalog."""
    # This could be extended to fetch from external registries
    catalog = [
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
    return {"models": catalog}
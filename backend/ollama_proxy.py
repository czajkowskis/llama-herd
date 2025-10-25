#!/usr/bin/env python3
"""
Ollama Proxy Server using FastAPI
Translates between Ollama's API and OpenAI's API format for Autogen
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Ollama Proxy", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama server URL
OLLAMA_URL = "http://localhost:11434"

# Pydantic models for request/response
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False

class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str

class ChatCompletionUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ChatCompletionResponse(BaseModel):
    id: str
    object: str
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: ChatCompletionUsage

class ModelData(BaseModel):
    id: str
    object: str
    created: int
    owned_by: str

class ModelsResponse(BaseModel):
    object: str
    data: List[ModelData]

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """Handle chat completions requests from Autogen"""
    try:
        # Convert OpenAI format to Ollama format
        ollama_data = {
            "model": request.model,
            "messages": [msg.dict() for msg in request.messages],
            "stream": request.stream,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens
            }
        }
        
        logger.info(f"Proxying request to Ollama: {request.model}")
        
        # Forward request to Ollama
        response = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json=ollama_data,
            headers={'Content-Type': 'application/json'},
            timeout=300  # 5 minute timeout
        )
        
        if response.status_code == 200:
            ollama_response = response.json()
            
            # Convert Ollama response to OpenAI format
            import time
            current_timestamp = int(time.time())
            
            openai_response = ChatCompletionResponse(
                id=f"chatcmpl-{ollama_response.get('id', 'unknown')}",
                object="chat.completion",
                created=current_timestamp,
                model=request.model,
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=ChatMessage(
                            role="assistant",
                            content=ollama_response.get('message', {}).get('content', '')
                        ),
                        finish_reason="stop"
                    )
                ],
                usage=ChatCompletionUsage(
                    prompt_tokens=ollama_response.get('prompt_eval_count', 0),
                    completion_tokens=ollama_response.get('eval_count', 0),
                    total_tokens=ollama_response.get('prompt_eval_count', 0) + ollama_response.get('eval_count', 0)
                )
            )
            
            return openai_response
        else:
            logger.error(f"Ollama request failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="Ollama request failed")
            
    except Exception as e:
        logger.error(f"Error in chat_completions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/models")
async def list_models():
    """Handle models list request from Autogen"""
    try:
        # Get models from Ollama
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=300)
        
        if response.status_code == 200:
            ollama_models = response.json()
            
            # Convert to OpenAI format
            models_data = [
                ModelData(
                    id=model["name"],
                    object="model",
                    created=0,
                    owned_by="ollama"
                )
                for model in ollama_models.get("models", [])
            ]
            
            return ModelsResponse(
                object="list",
                data=models_data
            )
        else:
            logger.error(f"Failed to get models from Ollama: {response.status_code}")
            raise HTTPException(status_code=500, detail="Failed to get models")
            
    except Exception as e:
        logger.error(f"Error in list_models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ollama-proxy"}

if __name__ == '__main__':
    import uvicorn
    logger.info("Starting Ollama Proxy Server on port 8080")
    logger.info("This server translates OpenAI API calls to Ollama API calls")
    uvicorn.run(app, host="0.0.0.0", port=8080) 
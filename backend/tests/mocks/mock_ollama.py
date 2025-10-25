"""
Mock implementation of Ollama client for testing.
"""
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator
from unittest.mock import AsyncMock, MagicMock


class MockOllamaClient:
    """Mock Ollama client that simulates responses without external dependencies."""
    
    def __init__(self):
        self.models = {
            "llama2": {
                "name": "llama2",
                "size": 3825819519,
                "digest": "sha256:1234567890abcdef",
                "modified_at": "2023-12-01T10:00:00Z"
            },
            "codellama": {
                "name": "codellama",
                "size": 3825819519,
                "digest": "sha256:abcdef1234567890",
                "modified_at": "2023-12-01T11:00:00Z"
            }
        }
        self.pull_tasks = {}
        self.pull_progress = {}
        
    async def get_tags(self) -> Dict[str, Any]:
        """Mock get_tags response."""
        return {
            "models": list(self.models.values())
        }
    
    async def get_version(self) -> Dict[str, Any]:
        """Mock get_version response."""
        return {
            "version": "0.1.0",
            "build": "1234567890abcdef"
        }
    
    async def pull_model(self, model: str, progress_callback=None) -> Dict[str, Any]:
        """Mock model pulling with progress simulation."""
        if model not in self.models:
            raise Exception(f"Model {model} not found")
        
        # Simulate pull progress
        if progress_callback:
            for i in range(0, 101, 10):
                await progress_callback({
                    "status": "downloading" if i < 100 else "success",
                    "completed": i,
                    "total": 100,
                    "digest": self.models[model]["digest"]
                })
                await asyncio.sleep(0.01)  # Small delay to simulate real behavior
        
        return {
            "status": "success",
            "digest": self.models[model]["digest"]
        }
    
    async def generate_stream(self, model: str, prompt: str, **kwargs) -> AsyncGenerator[Dict[str, Any], None]:
        """Mock streaming response generation."""
        # Simulate streaming response
        response_text = f"Mock response to: {prompt[:50]}..."
        words = response_text.split()
        
        for i, word in enumerate(words):
            yield {
                "model": model,
                "created_at": "2023-12-01T12:00:00Z",
                "response": word + " ",
                "done": i == len(words) - 1
            }
            await asyncio.sleep(0.01)  # Small delay to simulate streaming
    
    async def generate(self, model: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """Mock non-streaming response generation."""
        return {
            "model": model,
            "created_at": "2023-12-01T12:00:00Z",
            "response": f"Mock response to: {prompt[:50]}...",
            "done": True,
            "context": [1, 2, 3, 4, 5],
            "total_duration": 1000000000,
            "load_duration": 100000000,
            "prompt_eval_count": 10,
            "prompt_eval_duration": 200000000,
            "eval_count": 20,
            "eval_duration": 700000000
        }
    
    async def chat_stream(self, model: str, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[Dict[str, Any], None]:
        """Mock streaming chat response."""
        # Extract the last user message
        last_message = messages[-1]["content"] if messages else "Hello"
        response_text = f"Mock chat response to: {last_message[:50]}..."
        words = response_text.split()
        
        for i, word in enumerate(words):
            yield {
                "model": model,
                "created_at": "2023-12-01T12:00:00Z",
                "message": {
                    "role": "assistant",
                    "content": word + " "
                },
                "done": i == len(words) - 1
            }
            await asyncio.sleep(0.01)
    
    async def chat(self, model: str, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Mock non-streaming chat response."""
        last_message = messages[-1]["content"] if messages else "Hello"
        return {
            "model": model,
            "created_at": "2023-12-01T12:00:00Z",
            "message": {
                "role": "assistant",
                "content": f"Mock chat response to: {last_message[:50]}..."
            },
            "done": True,
            "total_duration": 1000000000,
            "load_duration": 100000000,
            "prompt_eval_count": 10,
            "prompt_eval_duration": 200000000,
            "eval_count": 20,
            "eval_duration": 700000000
        }
    
    def set_error_response(self, error_type: str, error_message: str):
        """Configure mock to return specific errors."""
        self.error_type = error_type
        self.error_message = error_message
    
    def reset_errors(self):
        """Reset error configuration."""
        if hasattr(self, 'error_type'):
            delattr(self, 'error_type')
        if hasattr(self, 'error_message'):
            delattr(self, 'error_message')


class MockOllamaClientFactory:
    """Factory for creating mock Ollama clients with different configurations."""
    
    @staticmethod
    def create_successful_client() -> MockOllamaClient:
        """Create a mock client that always succeeds."""
        return MockOllamaClient()
    
    @staticmethod
    def create_failing_client(error_type: str = "ConnectionError", error_message: str = "Connection failed") -> MockOllamaClient:
        """Create a mock client that always fails."""
        client = MockOllamaClient()
        client.set_error_response(error_type, error_message)
        return client
    
    @staticmethod
    def create_slow_client(delay: float = 1.0) -> MockOllamaClient:
        """Create a mock client with configurable delays."""
        client = MockOllamaClient()
        client.delay = delay
        return client


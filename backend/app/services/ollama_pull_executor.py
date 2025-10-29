"""
Ollama pull executor for handling streaming model pulls.
"""
import requests
import json
import time
from typing import Callable, Optional, Dict, Any
from ..core.config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)


class OllamaPullExecutor:
    """Executes model pulls using Ollama's streaming API."""
    
    def __init__(self):
        self.ollama_url = getattr(settings, 'ollama_url', 'http://localhost:11434')
    
    def pull_model(
        self,
        model_name: str,
        progress_callback: Callable[[Dict[str, Any]], None],
        stop_event: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Pull a model from Ollama using streaming API.
        
        Args:
            model_name: Name of the model to pull
            progress_callback: Callback for progress updates (receives dict with status/progress)
            stop_event: Optional threading.Event for cooperative cancellation
            
        Returns:
            Final status dict with 'status' and optional 'error'
            
        Raises:
            Exception: On network errors or pull failures
        """
        url = f"{self.ollama_url}/api/pull"
        payload = {"name": model_name}
        
        logger.info(f"Starting pull for model {model_name}")
        
        try:
            response = requests.post(url, json=payload, stream=True, timeout=None)
            response.raise_for_status()
            
            # Parse streaming response
            for line in response.iter_lines():
                # Check for cancellation
                if stop_event and stop_event.is_set():
                    logger.info(f"Pull cancelled for model {model_name}")
                    raise InterruptedError("Pull cancelled by user")
                
                if not line:
                    continue
                
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse JSON from Ollama: {line}")
                    continue
                
                # Call progress callback
                progress_callback(data)
                
                # Check for completion
                if data.get('status') == 'success':
                    logger.info(f"Pull completed for model {model_name}")
                    return {"status": "success"}
                
                # Check for errors
                if data.get('status') == 'error':
                    error_msg = data.get('error', 'Unknown error')
                    logger.error(f"Pull failed for model {model_name}: {error_msg}")
                    raise Exception(f"Ollama pull failed: {error_msg}")
            
            # If we exit the loop without success, consider it incomplete
            logger.warning(f"Pull stream ended unexpectedly for model {model_name}")
            raise Exception("Pull stream ended unexpectedly")
            
        except InterruptedError:
            # Re-raise cancellation
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during pull of {model_name}: {e}")
            raise Exception(f"Network error during pull: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during pull of {model_name}: {e}")
            raise


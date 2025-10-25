from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from typing import Any, Dict

from ...utils.logging import get_logger
from ...services import ollama_client

logger = get_logger(__name__)

router = APIRouter()


@router.post('/api/ollama/generate')
async def proxy_generate(request: Request):
    """Proxy the generate endpoint to Ollama and stream the response back to client.

    This routes client generate requests through the backend so we can apply
    concurrency limits and caching, and avoid the frontend directly blocking on Ollama.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid JSON body')

    # Use the ollama_client stream helper which yields byte chunks
    try:
        # Probe upstream quickly to surface obvious errors before we start streaming
        try:
            status = await ollama_client.probe('/api/generate', method='POST', json_body=body, timeout=2.0)
        except Exception as e:
            logger.error(f'Probe to Ollama failed: {e}')
            raise HTTPException(status_code=502, detail='Failed to contact Ollama')

        if status >= 400:
            logger.error(f'Ollama returned status {status} for /api/generate')
            raise HTTPException(status_code=502, detail='Ollama returned error for generate')

        gen = await ollama_client.stream('/api/generate', method='POST', json_body=body, headers={'Content-Type': 'application/json'})

        async def safe_gen():
            try:
                async for chunk in gen:
                    yield chunk
            except Exception as e:
                logger.error(f'Error while streaming from Ollama: {e}')
                # Stop streaming and surface a 502 to the client
                # Raising here happens after headers were sent; log and stop iteration
                return

        return StreamingResponse(safe_gen(), media_type='application/x-ndjson')
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Failed to proxy generate to Ollama: {e}')
        raise HTTPException(status_code=502, detail='Failed to contact Ollama')

"""Async client wrapper for Ollama with concurrency limiting and simple caching.

This keeps FastAPI endpoints responsive when Ollama is slow by using
httpx AsyncClient and a small semaphore to bound concurrent upstream requests.
Simple in-memory caching is used for tags/version to allow fast responses
when upstream is busy.
"""
import asyncio
import time
from typing import Any, Dict, List, Optional

import httpx
import json

from ..core.config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)

# Concurrency limit for upstream Ollama requests
_SEMAPHORE = asyncio.Semaphore(getattr(settings, 'ollama_client_max_concurrency', 4))

# Singleton AsyncClient
_client: Optional[httpx.AsyncClient] = None

# Simple caches
_tags_cache: Optional[List[Dict[str, Any]]] = None
_tags_cache_ts: float = 0
_tags_cache_ttl: float = float(getattr(settings, 'ollama_tags_cache_ttl', 30))

_version_cache: Optional[Dict[str, Any]] = None
_version_cache_ts: float = 0
_version_cache_ttl: float = float(getattr(settings, 'ollama_version_cache_ttl', 10))


def _get_base_url() -> str:
    return getattr(settings, 'ollama_url', 'http://localhost:11434')


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        timeout = httpx.Timeout(getattr(settings, 'ollama_client_timeout', 10.0))
        _client = httpx.AsyncClient(base_url=_get_base_url(), timeout=timeout)
    return _client


async def _with_semaphore(coro):
    async with _SEMAPHORE:
        return await coro


async def get_tags(timeout: Optional[float] = None) -> List[Dict[str, Any]]:
    """Return tags (models) from Ollama. Uses cache for quick responses.

    timeout: optional override for per-call timeout in seconds.
    """
    global _tags_cache, _tags_cache_ts
    now = time.time()
    if _tags_cache and (now - _tags_cache_ts) < _tags_cache_ttl:
        return _tags_cache

    client = _get_client()

    async def _call():
        try:
            # Respect caller timeout if provided
            params = {'timeout': timeout} if timeout is not None else {}
            resp = await client.get('/api/tags')
            resp.raise_for_status()
            data = resp.json()
            models = data.get('models', [])
            # Update cache
            _tags_cache = models
            _tags_cache_ts = time.time()
            return models
        except Exception as e:
            logger.warning(f"Failed to fetch tags from Ollama: {e}")
            # On error, return stale cache if available
            if _tags_cache:
                return _tags_cache
            raise

    return await _with_semaphore(_call())


async def get_version(timeout: Optional[float] = None) -> Dict[str, Any]:
    """Return Ollama version info. Cached briefly."""
    global _version_cache, _version_cache_ts
    now = time.time()
    if _version_cache and (now - _version_cache_ts) < _version_cache_ttl:
        return _version_cache

    client = _get_client()

    async def _call():
        try:
            resp = await client.get('/api/version')
            resp.raise_for_status()
            data = resp.json()
            _version_cache = data
            _version_cache_ts = time.time()
            return data
        except Exception as e:
            logger.warning(f"Failed to fetch Ollama version: {e}")
            if _version_cache:
                return _version_cache
            raise

    return await _with_semaphore(_call())


async def delete_model(name: str) -> None:
    client = _get_client()

    async def _call():
        # Use explicit JSON body with data/header to be compatible across different client implementations
        resp = await client.request('DELETE', '/api/delete', data=json.dumps({'name': name}), headers={'Content-Type': 'application/json'})
        resp.raise_for_status()
        return None

    return await _with_semaphore(_call())


async def get_show(name: str) -> Dict[str, Any]:
    client = _get_client()

    async def _call():
        resp = await client.get('/api/show', params={'name': name})
        resp.raise_for_status()
        return resp.json()

    return await _with_semaphore(_call())


async def ping(timeout: Optional[float] = 2.0) -> bool:
    """Quick connectivity check using version endpoint with short timeout."""
    try:
        await get_version(timeout=timeout)
        return True
    except Exception:
        return False


async def stream(path: str, method: str = 'POST', json_body: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None):
    """Stream a request to Ollama and yield byte chunks.

    Usage:
      return StreamingResponse(stream(path, 'POST', json_body), media_type='application/x-ndjson')
    """
    client = _get_client()

    async def _gen():
        async with _SEMAPHORE:
            async with client.stream(method, path, json=json_body, headers=headers) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes():
                    yield chunk

    return _gen()


async def probe(path: str, method: str = 'POST', json_body: Optional[Dict[str, Any]] = None, timeout: float = 2.0) -> int:
    """Perform a quick non-streaming probe to get the status code from Ollama.

    Returns the HTTP status code (int). Raises exceptions on network errors.
    """
    client = _get_client()

    async def _call():
        resp = await client.request(method, path, json=json_body, timeout=timeout)
        status = resp.status_code
        # consume or close response to free connection
        try:
            await resp.aread()
        except Exception:
            pass
        return status

    return await _with_semaphore(_call())

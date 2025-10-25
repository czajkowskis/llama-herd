"""
Middleware for automatic case conversion between camelCase and snake_case.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..utils.case_converter import normalize_dict_to_snake, normalize_dict_to_camel
from ..utils.logging import get_logger

logger = get_logger(__name__)


class CaseConversionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically convert between camelCase (frontend) and snake_case (backend).
    
    - Incoming requests: Convert camelCase to snake_case
    - Outgoing responses: Convert snake_case to camelCase
    """
    
    def __init__(self, app: ASGIApp, convert_request: bool = True, convert_response: bool = True):
        super().__init__(app)
        self.convert_request = convert_request
        self.convert_response = convert_response
    
    async def dispatch(self, request: Request, call_next):
        # Convert incoming request data from camelCase to snake_case
        if self.convert_request and request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Read the request body
                body = await request.body()
                if body:
                    import json
                    data = json.loads(body)
                    # Convert camelCase to snake_case
                    converted_data = normalize_dict_to_snake(data, deep=True)
                    # Create a new request with converted data
                    import io
                    new_body = json.dumps(converted_data).encode()
                    request._body = new_body
            except Exception as e:
                logger.warning(f"Failed to convert request case: {e}")
        
        # Process the request
        response = await call_next(request)
        
        # Convert outgoing response data from snake_case to camelCase
        if self.convert_response and response.headers.get("content-type", "").startswith("application/json"):
            try:
                # Read the response body
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk
                
                if body:
                    import json
                    data = json.loads(body)
                    # Convert snake_case to camelCase
                    converted_data = normalize_dict_to_camel(data, deep=True)
                    # Create new response with converted data
                    new_body = json.dumps(converted_data).encode()
                    
                    # Create a new response
                    from starlette.responses import Response as StarletteResponse
                    new_response = StarletteResponse(
                        content=new_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type
                    )
                    return new_response
            except Exception as e:
                logger.warning(f"Failed to convert response case: {e}")
        
        return response

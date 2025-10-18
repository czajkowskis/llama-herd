from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio

from .core.config import settings
from .core.state import state_manager
from .core.exceptions import (
    AppException, 
    ValidationError, 
    NotFoundError, 
    AuthError,
    ExperimentError,
    AgentError,
    StorageError,
    ConversationError
)
from .api.routes.experiments import router as experiments_router
from .api.routes.conversations import router as conversations_router
from .api.ws import router as ws_router
from .utils.logging import get_logger, log_with_context

logger = get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    # Register exception handlers
    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        """Handle validation errors (400 Bad Request)."""
        log_with_context(
            logger, 
            'warning', 
            f"Validation error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=400,
            content=exc.to_dict()
        )
    
    @app.exception_handler(NotFoundError)
    async def not_found_error_handler(request: Request, exc: NotFoundError):
        """Handle not found errors (404 Not Found)."""
        log_with_context(
            logger,
            'info',
            f"Resource not found: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=404,
            content=exc.to_dict()
        )
    
    @app.exception_handler(AuthError)
    async def auth_error_handler(request: Request, exc: AuthError):
        """Handle authentication/authorization errors (401/403)."""
        status_code = 401 if exc.details.get('auth_type') == 'authentication' else 403
        log_with_context(
            logger,
            'warning',
            f"Auth error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=status_code,
            content=exc.to_dict()
        )
    
    @app.exception_handler(ExperimentError)
    async def experiment_error_handler(request: Request, exc: ExperimentError):
        """Handle experiment-specific errors (400 Bad Request)."""
        log_with_context(
            logger,
            'error',
            f"Experiment error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=400,
            content=exc.to_dict()
        )
    
    @app.exception_handler(AgentError)
    async def agent_error_handler(request: Request, exc: AgentError):
        """Handle agent-specific errors (400 Bad Request)."""
        log_with_context(
            logger,
            'error',
            f"Agent error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=400,
            content=exc.to_dict()
        )
    
    @app.exception_handler(StorageError)
    async def storage_error_handler(request: Request, exc: StorageError):
        """Handle storage errors (500 Internal Server Error)."""
        log_with_context(
            logger,
            'error',
            f"Storage error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=500,
            content=exc.to_dict()
        )
    
    @app.exception_handler(ConversationError)
    async def conversation_error_handler(request: Request, exc: ConversationError):
        """Handle conversation-specific errors (400 Bad Request)."""
        log_with_context(
            logger,
            'error',
            f"Conversation error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=400,
            content=exc.to_dict()
        )
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """Handle generic application exceptions (500 Internal Server Error)."""
        log_with_context(
            logger,
            'error',
            f"Application error: {exc.message}",
            error_code=exc.error_code,
            details=exc.details,
            path=request.url.path
        )
        return JSONResponse(
            status_code=500,
            content=exc.to_dict()
        )
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions (500 Internal Server Error)."""
        log_with_context(
            logger,
            'critical',
            f"Unexpected error: {str(exc)}",
            exception_type=type(exc).__name__,
            path=request.url.path
        )
        return JSONResponse(
            status_code=500,
            content={
                'error': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
                'details': {}
            }
        )

    # Include API routers
    app.include_router(experiments_router)
    app.include_router(conversations_router)
    app.include_router(ws_router)
    
    @app.on_event("startup")
    async def startup_event():
        """Set up event loop reference for state manager."""
        loop = asyncio.get_running_loop()
        state_manager.set_event_loop(loop)
        logger.info("LLaMa-Herd backend started successfully")

    return app


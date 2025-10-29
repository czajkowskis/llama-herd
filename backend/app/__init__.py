from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
from contextlib import asynccontextmanager

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
from .api.routes.models import router as models_router
from .api.ws import router as ws_router
from .api.routes.ollama_proxy import router as ollama_proxy_router
from .utils.logging import get_logger, log_with_context

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    loop = asyncio.get_running_loop()
    state_manager.set_event_loop(loop)
    # Start background services
    try:
        from .services.pull_manager import pull_manager
        # Start the cleanup worker for the global pull manager
        pull_manager.start()
        logger.info("Model pull manager cleanup worker started")
    except Exception:
        logger.exception("Failed to start model pull manager cleanup worker")
    # Start a small cache-warming task for Ollama tags/version so the UI
    # can use cached data while Ollama is busy pulling large models.
    try:
        from .services import ollama_client

        async def _warm_cache():
            while True:
                try:
                    await ollama_client.get_tags()
                    await ollama_client.get_version()
                except Exception:
                    # ignore - the client already logs details
                    pass
                await asyncio.sleep(getattr(settings, 'ollama_cache_warm_interval', 15))

        app.state._ollama_cache_task = asyncio.create_task(_warm_cache())
        logger.info('Started Ollama cache warming task')
    except Exception:
        logger.exception('Failed to start Ollama cache warming task')
    logger.info("LLaMa-Herd backend started successfully")
    
    yield
    
    # Shutdown
    # Stop background services cleanly
    try:
        from .services.pull_manager import pull_manager
        pull_manager.shutdown()
        logger.info("Model pull manager cleanup worker stopped")
    except Exception:
        logger.exception("Failed to stop model pull manager cleanup worker")
    # Cancel cache warmup task
    try:
        task = getattr(app.state, '_ollama_cache_task', None)
        if task:
            task.cancel()
    except Exception:
        logger.exception('Failed to stop Ollama cache warming task')


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    This function sets up the FastAPI application with middleware, exception handlers,
    and route registration. The app includes comprehensive OpenAPI documentation.
    """
    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        lifespan=lifespan,
        description="""
        **LLaMa-Herd Backend API** - Multi-Agent Conversation Platform
        
        FastAPI-based backend for managing multi-agent AI experiments and conversations.
        
        ## Features
        
        * **Experiment Management**: Create, run, and monitor multi-agent AI experiments
        * **Real-time Updates**: WebSocket support for live experiment monitoring
        * **Model Management**: Integration with Ollama for local LLM operations
        * **Conversation Persistence**: Store and manage conversation history
        
        ## Authentication
        
        Currently, the API does not require authentication. All endpoints are publicly accessible.
        
        ## Error Handling
        
        The API uses standard HTTP status codes and returns detailed error messages in JSON format.
        """,
        terms_of_service="https://github.com/yourusername/llama-herd",
        contact={
            "name": "LLaMa-Herd Team",
            "url": "https://github.com/yourusername/llama-herd",
            "email": "support@example.com",
        },
        license_info={
            "name": "MIT License",
            "url": "https://opensource.org/licenses/MIT",
        },
        tags_metadata=[
            {
                "name": "experiments",
                "description": "Experiment management endpoints. Create, monitor, and manage multi-agent AI experiments.",
            },
            {
                "name": "conversations",
                "description": "Conversation management endpoints. Store and retrieve conversation history.",
            },
            {
                "name": "models",
                "description": "Model management endpoints. List, pull, and manage Ollama models.",
            },
            {
                "name": "websockets",
                "description": "WebSocket endpoints for real-time updates during experiments and model pulls.",
            },
        ]
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

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint for Docker and load balancers."""
        return {"status": "healthy", "service": "llama-herd-backend"}

    # Include API routers
    app.include_router(experiments_router)
    app.include_router(conversations_router)
    app.include_router(models_router)
    app.include_router(ollama_proxy_router)
    app.include_router(ws_router)
    

    return app


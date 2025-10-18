from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from .core.config import settings
from .core.state import state_manager
from .api.routes.experiments import router as experiments_router
from .api.routes.conversations import router as conversations_router
from .api.ws import router as ws_router


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

    # Include API routers
    app.include_router(experiments_router)
    app.include_router(conversations_router)
    app.include_router(ws_router)
    
    @app.on_event("startup")
    async def startup_event():
        """Set up event loop reference for state manager."""
        loop = asyncio.get_running_loop()
        state_manager.set_event_loop(loop)

    return app


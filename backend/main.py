#!/usr/bin/env python3
"""
Main entry point for the LLaMa-Herd Backend FastAPI application.
"""
import uvicorn
from app.core.config import settings

def main():
    """Main function to start the FastAPI server."""
    print(f"🚀 Starting LLaMa-Herd Backend...")
    print(f"   API Title: {settings.api_title}")
    print(f"   API Version: {settings.api_version}")
    print(f"   Server: http://{settings.api_host}:{settings.api_port}")
    print(f"   API Docs: http://{settings.api_host}:{settings.api_port}/docs")
    print(f"   CORS Origins: {settings.cors_origins}")
    print("")
    
    uvicorn.run(
        "app:create_app",  # Use import string for reload support
        factory=True,
        host=settings.api_host,
        port=settings.api_port,
        log_level="info",
        reload=True
    )

if __name__ == "__main__":
    main() 
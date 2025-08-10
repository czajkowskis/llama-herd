"""
Application configuration settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    api_title: str = "LLaMa-Herd Backend"
    api_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]
    
    # Ollama Configuration
    ollama_base_url: str = "http://localhost:8080/v1"
    ollama_api_key: str = "ollama"
    ollama_timeout: int = 300
    
    # Storage Configuration
    data_directory: str = "data"
    experiments_directory: str = "experiments"
    conversations_directory: str = "conversations"
    
    # Experiment Configuration
    default_max_rounds: int = 8
    default_temperature: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings() 
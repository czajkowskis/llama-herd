"""
Application configuration settings.

All settings can be overridden using environment variables.
Environment variable names match the setting names (case-insensitive).

Example:
    export API_HOST=0.0.0.0
    export API_PORT=8000
    export OLLAMA_BASE_URL=http://localhost:8080/v1
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Union
import os


class Settings(BaseSettings):
    """Application settings.
    
    All settings can be configured via environment variables or .env file.
    Environment variables take precedence over .env file values.
    """
    
    # API Configuration
    api_title: str = Field(
        default="LLaMa-Herd Backend",
        description="API title shown in documentation"
    )
    api_version: str = Field(
        default="1.0.0",
        description="API version"
    )
    api_host: str = Field(
        default="0.0.0.0",
        description="Host to bind the API server (0.0.0.0 for all interfaces)",
        env="API_HOST"
    )
    api_port: int = Field(
        default=8000,
        description="Port to bind the API server",
        env="API_PORT"
    )
    
    # CORS Configuration
    cors_origins: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:3001",
        description="Allowed CORS origins (comma-separated string or list)",
        env="CORS_ORIGINS"
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests",
        env="CORS_ALLOW_CREDENTIALS"
    )
    cors_allow_methods: Union[str, List[str]] = Field(
        default="*",
        description="Allowed HTTP methods for CORS (comma-separated string or list)",
        env="CORS_ALLOW_METHODS"
    )
    cors_allow_headers: Union[str, List[str]] = Field(
        default="*",
        description="Allowed HTTP headers for CORS (comma-separated string or list)",
        env="CORS_ALLOW_HEADERS"
    )
    
    # Ollama Configuration
    ollama_base_url: str = Field(
        default="http://localhost:8080/v1",
        description="Base URL for Ollama API",
        env="OLLAMA_BASE_URL"
    )
    ollama_api_key: str = Field(
        default="ollama",
        description="API key for Ollama (if required)",
        env="OLLAMA_API_KEY"
    )
    ollama_timeout: int = Field(
        default=300,
        description="Timeout in seconds for Ollama API requests",
        env="OLLAMA_TIMEOUT"
    )
    
    # Storage Configuration
    data_directory: str = Field(
        default="data",
        description="Root directory for data storage",
        env="DATA_DIRECTORY"
    )
    experiments_directory: str = Field(
        default="experiments",
        description="Subdirectory for experiment data (relative to data_directory)",
        env="EXPERIMENTS_DIRECTORY"
    )
    conversations_directory: str = Field(
        default="conversations",
        description="Subdirectory for conversation data (relative to data_directory)",
        env="CONVERSATIONS_DIRECTORY"
    )
    
    # Experiment Configuration
    default_max_rounds: int = Field(
        default=8,
        description="Default maximum rounds for agent conversations",
        env="DEFAULT_MAX_ROUNDS"
    )
    default_temperature: float = Field(
        default=0.7,
        description="Default temperature for LLM inference",
        env="DEFAULT_TEMPERATURE"
    )
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }
    
    @field_validator('cors_origins', 'cors_allow_methods', 'cors_allow_headers', mode='before')
    @classmethod
    def parse_comma_separated_list(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated string into list."""
        if isinstance(v, str):
            return [x.strip() for x in v.split(',') if x.strip()]
        return v


# Global settings instance
settings = Settings() 
"""
Application configuration settings.

All settings can be overridden using environment variables.
Environment variable names match the setting names (case-insensitive).

Example:
    export API_HOST=0.0.0.0
    export API_PORT=8000
    export OLLAMA_BASE_URL=http://localhost:11434/v1
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, model_validator
from typing import List, Union
import os

from .config_validators import (
    validate_port, validate_timeout, validate_temperature, validate_directory_path,
    validate_url, validate_comma_separated_list, validate_positive_int,
    validate_percentage
)


class Settings(BaseSettings):
    """Application settings.
    
    All settings can be configured via environment variables or .env file.
    Environment variables take precedence over .env file values.
    """
    
    
    # Legacy flat configuration (for backward compatibility)
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
        description="Host to bind the API server (0.0.0.0 for all interfaces)"
    )
    api_port: int = Field(
        default=8000,
        description="Port to bind the API server"
    )
    
    # CORS Configuration
    cors_origins: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:3001",
        description="Allowed CORS origins (comma-separated string or list)"
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests",
    )
    cors_allow_methods: Union[str, List[str]] = Field(
        default="*",
        description="Allowed HTTP methods for CORS (comma-separated string or list)"
    )
    cors_allow_headers: Union[str, List[str]] = Field(
        default="*",
        description="Allowed HTTP headers for CORS (comma-separated string or list)"
    )
    
    # Ollama Configuration
    ollama_base_url: str = Field(
        default="http://localhost:11434/v1",
        description="Base URL for Ollama's OpenAI-compatible API (AutoGen uses this)"
    )
    ollama_url: str = Field(
        default="http://localhost:11434",
        description="Direct URL for Ollama server (for native API operations like /api/pull)"
    )
    ollama_api_key: str = Field(
        default="ollama",
        description="API key for Ollama (if required)"
    )
    ollama_timeout: int = Field(
        default=300,
        description="Timeout in seconds for Ollama API requests"
    )
    ollama_models_dir: str = Field(
        default="~/.ollama/models",
        description="Directory where Ollama stores downloaded models"
    )
    
    # Storage Configuration
    data_directory: str = Field(
        default="data",
        description="Root directory for data storage"
    )
    experiments_directory: str = Field(
        default="experiments",
        description="Subdirectory for experiment data (relative to data_directory)"
    )
    conversations_directory: str = Field(
        default="conversations",
        description="Subdirectory for conversation data (relative to data_directory)"
    )
    
    # Experiment Configuration
    default_max_rounds: int = Field(
        default=8,
        description="Default maximum rounds for agent conversations"
    )
    default_temperature: float = Field(
        default=0.7,
        description="Default temperature for LLM inference"
    )
    # Timeouts (in seconds)
    experiment_timeout_seconds: int = Field(
        default=60 * 60,  # 1 hour default
        description="Maximum time in seconds an experiment may run before being marked errored"
    )
    iteration_timeout_seconds: int = Field(
        default=5 * 60,  # 5 minutes default
        description="Maximum time in seconds an iteration/conversation may run before being marked errored"
    )
    
    # Pull Configuration
    pull_progress_throttle_ms: int = Field(
        default=500,
        description="Minimum time in milliseconds between progress updates"
    )
    pull_progress_percent_delta: float = Field(
        default=2.0,
        description="Minimum percentage change to trigger progress update"
    )
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }
    
    @field_validator('api_port', mode='before')
    @classmethod
    def validate_api_port(cls, v):
        return validate_port(v)
    
    @field_validator('cors_origins', 'cors_allow_methods', 'cors_allow_headers', mode='before')
    @classmethod
    def parse_comma_separated_list(cls, v: Union[str, List[str]]) -> List[str]:
        return validate_comma_separated_list(v)
    
    @field_validator('ollama_timeout', 'experiment_timeout_seconds', 'iteration_timeout_seconds', mode='before')
    @classmethod
    def validate_timeouts(cls, v):
        return validate_timeout(v)
    
    @field_validator('default_temperature', mode='before')
    @classmethod
    def validate_temperature(cls, v):
        return validate_temperature(v)
    
    @field_validator('data_directory', 'ollama_models_dir', mode='before')
    @classmethod
    def validate_directories(cls, v):
        return validate_directory_path(v)
    
    @field_validator('ollama_base_url', 'ollama_url', mode='before')
    @classmethod
    def validate_urls(cls, v):
        return validate_url(v)
    
    @field_validator('default_max_rounds', mode='before')
    @classmethod
    def validate_max_rounds(cls, v):
        return validate_positive_int(v)
    
    @field_validator('pull_progress_throttle_ms', mode='before')
    @classmethod
    def validate_throttle_ms(cls, v):
        return validate_positive_int(v)
    
    @field_validator('pull_progress_percent_delta', mode='before')
    @classmethod
    def validate_percent_delta(cls, v):
        return validate_percentage(v)
    


# Global settings instance
settings = Settings()
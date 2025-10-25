"""
Grouped configuration classes for better organization.
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Union


class APIConfig(BaseModel):
    """API server configuration."""
    title: str = Field(
        default="LLaMa-Herd Backend",
        description="API title shown in documentation"
    )
    version: str = Field(
        default="1.0.0",
        description="API version"
    )
    host: str = Field(
        default="0.0.0.0",
        description="Host to bind the API server (0.0.0.0 for all interfaces)"
    )
    port: int = Field(
        default=8000,
        description="Port to bind the API server"
    )


class CORSConfig(BaseModel):
    """CORS configuration."""
    origins: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:3001",
        description="Allowed CORS origins (comma-separated string or list)"
    )
    allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    allow_methods: Union[str, List[str]] = Field(
        default="*",
        description="Allowed HTTP methods for CORS (comma-separated string or list)"
    )
    allow_headers: Union[str, List[str]] = Field(
        default="*",
        description="Allowed HTTP headers for CORS (comma-separated string or list)"
    )
    
    @field_validator('origins', 'allow_methods', 'allow_headers', mode='before')
    @classmethod
    def parse_comma_separated_list(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated string into list."""
        if isinstance(v, str):
            return [x.strip() for x in v.split(',') if x.strip()]
        return v


class OllamaConfig(BaseModel):
    """Ollama service configuration."""
    base_url: str = Field(
        default="http://localhost:8080/v1",
        description="Base URL for Ollama API"
    )
    url: str = Field(
        default="http://localhost:11434",
        description="Direct URL for Ollama server (for model operations)"
    )
    api_key: str = Field(
        default="ollama",
        description="API key for Ollama (if required)"
    )
    timeout: int = Field(
        default=300,
        description="Timeout in seconds for Ollama API requests"
    )
    models_dir: str = Field(
        default="~/.ollama/models",
        description="Directory where Ollama stores downloaded models"
    )


class StorageConfig(BaseModel):
    """Storage configuration."""
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


class ExperimentConfig(BaseModel):
    """Experiment configuration."""
    default_max_rounds: int = Field(
        default=8,
        description="Default maximum rounds for agent conversations"
    )
    default_temperature: float = Field(
        default=0.7,
        description="Default temperature for LLM inference"
    )
    experiment_timeout_seconds: int = Field(
        default=60 * 60,  # 1 hour default
        description="Maximum time in seconds an experiment may run before being marked errored"
    )
    iteration_timeout_seconds: int = Field(
        default=5 * 60,  # 5 minutes default
        description="Maximum time in seconds an iteration/conversation may run before being marked errored"
    )


class PullConfig(BaseModel):
    """Model pull configuration."""
    progress_throttle_ms: int = Field(
        default=500,
        description="Minimum time in milliseconds between progress updates"
    )
    progress_percent_delta: float = Field(
        default=2.0,
        description="Minimum percentage change to trigger progress update"
    )
    max_retry_attempts: int = Field(
        default=3,
        description="Maximum number of retry attempts for failed pulls"
    )
    retry_backoff_seconds: int = Field(
        default=60,
        description="Maximum backoff time in seconds between retries"
    )
    cleanup_interval_seconds: int = Field(
        default=60,
        description="Interval in seconds for cleanup of stale tasks"
    )
    stale_task_threshold_seconds: int = Field(
        default=300,
        description="Time in seconds after which a task is considered stale"
    )
    completed_task_retention_seconds: int = Field(
        default=3600,
        description="Time in seconds to retain completed tasks"
    )
    failed_task_retention_seconds: int = Field(
        default=300,
        description="Time in seconds to retain failed tasks"
    )
    cancelled_task_retention_seconds: int = Field(
        default=60,
        description="Time in seconds to retain cancelled tasks"
    )

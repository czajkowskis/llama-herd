# LLaMa-Herd Backend

**Multi-Agent Conversation Platform - Backend API**

FastAPI-based backend for the LLaMa-Herd multi-agent conversation platform. Provides RESTful APIs and WebSocket support for managing experiments, conversations, and agent interactions.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Key Services](#key-services)
- [Troubleshooting](#troubleshooting)

## Overview

The LLaMa-Herd backend is a FastAPI application that provides:

- **Experiment Management**: Create and manage multi-agent AI experiments
- **Real-time Updates**: WebSocket support for live experiment monitoring
- **Model Management**: Integration with Ollama for local LLM operations
- **Conversation Persistence**: Store and manage conversation history
- **AutoGen Integration**: Multi-agent conversation orchestration

### Key Features

- RESTful API with automatic OpenAPI/Swagger documentation
- WebSocket support for real-time experiment updates
- Model pull management with progress tracking
- Persistent storage for experiments and conversations
- Comprehensive error handling and validation
- Background task execution for long-running experiments
- AutoGen integration for multi-agent conversations

## Architecture

### Technology Stack

- **Framework**: FastAPI 0.104+
- **Async Runtime**: Uvicorn with ASGI
- **Data Validation**: Pydantic 2.10+
- **AutoGen**: autogen-agentchat, autogen-core, autogen-ext
- **Storage**: File-based JSON storage with aiosqlite support
- **Testing**: pytest with async support

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Routes    │  │ WebSockets   │  │  Exception   │       │
│  │  Handlers   │  │   Handlers   │  │  Handlers    │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼───────────────┐
│         ▼                 ▼                  ▼               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Service Layer                        │  │
│  │  • ExperimentService                                  │  │
│  │  • ConversationService                                │  │
│  │  • AgentService                                       │  │
│  │  • AutogenService                                     │  │
│  │  • ModelPullManager                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Storage Layer                        │  │
│  │  • ExperimentStorage                                  │  │
│  │  • ConversationStorage                                │  │
│  │  • UnifiedStorage                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          │                                      │
          │                                      │
          ▼                                      ▼
┌──────────────────────┐          ┌──────────────────────┐
│   Ollama Server      │          │    AutoGen Agents    │
│  (localhost:11434)   │          │                      │
│                      │          │  Uses OpenAI API     │
│  • /v1/chat/         │◄─────────┤  format via Ollama   │
│    completions       │          │                      │
│  • /api/pull         │          │                      │
│  • /api/tags         │          └──────────────────────┘
└──────────────────────┘
```

## Installation

### Prerequisites

- **Python 3.11+**
- **Ollama** installed and running (see [ollama.ai](https://ollama.ai))
- **pip** package manager

### Setup

1. **Clone the repository** (if not already done):
   ```bash
   cd llama-herd/backend
   ```

2. **Create a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration (if needed)
   # The defaults work for local development with Ollama on port 11434
   ```

5. **Verify Ollama is running locally**:
   ```bash
   # Check if Ollama is running on port 11434
   curl http://localhost:11434/api/version
   
   # If not running, start Ollama:
   ollama serve
   ```

## Configuration

The backend can be configured via environment variables or a `.env` file. All settings have sensible defaults.

**Important**: When running locally (outside Docker), make sure your `OLLAMA_BASE_URL` and `OLLAMA_URL` point to `http://localhost:11434` instead of Docker's internal hostname `http://ollama:11434`.

### API Configuration

```bash
# Server configuration
API_HOST=0.0.0.0              # Host to bind server
API_PORT=8000                 # Port to bind server
API_TITLE="LLaMa-Herd Backend"  # API title
API_VERSION="1.0.0"           # API version
```

### CORS Configuration

```bash
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS="*"
CORS_ALLOW_HEADERS="*"
```

### Ollama Configuration

```bash
# Ollama API endpoints
OLLAMA_BASE_URL=http://localhost:11434/v1   # Ollama's OpenAI-compatible API (used by AutoGen)
OLLAMA_URL=http://localhost:11434           # Direct Ollama native API (used for /api/pull)
OLLAMA_API_KEY=ollama                        # API key if required
OLLAMA_TIMEOUT=300                           # Request timeout (seconds)
OLLAMA_MODELS_DIR=~/.ollama/models          # Model storage directory
```

### Storage Configuration

```bash
DATA_DIRECTORY=data                    # Root data directory
EXPERIMENTS_DIRECTORY=experiments     # Experiments subdirectory
CONVERSATIONS_DIRECTORY=conversations # Conversations subdirectory
```

### Experiment Configuration

```bash
DEFAULT_MAX_ROUNDS=8                    # Default conversation rounds
DEFAULT_TEMPERATURE=0.7                 # Default LLM temperature
EXPERIMENT_TIMEOUT_SECONDS=3600         # Max experiment runtime (1 hour)
```

### Model Pull Configuration

```bash
PULL_PROGRESS_THROTTLE_MS=500           # Progress update throttle
PULL_PROGRESS_PERCENT_DELTA=2.0         # Minimum % change for updates
```

## Running the Application

### Start the Backend

**Direct Start:**
```bash
python3 main.py
```

This will:
- Start the FastAPI backend on port 8000
- Connect directly to Ollama's native OpenAI-compatible endpoints at `http://localhost:11434/v1`
- Enable auto-reload in development mode

**Development Mode with Auto-reload:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Note**: Make sure Ollama is running on port 11434 before starting the backend. The application connects directly to Ollama's OpenAI-compatible API; no proxy is needed since Ollama supports OpenAI's API format natively.

### Access Endpoints

- **API**: http://localhost:8000
- **Interactive Docs (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## API Documentation

### Interactive Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

### API Endpoints

#### Experiments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/experiments/start` | Start a new experiment |
| GET | `/api/experiments` | List all experiments |
| GET | `/api/experiments/{id}` | Get experiment details |
| PUT | `/api/experiments/{id}` | Update experiment metadata |
| PUT | `/api/experiments/{id}/status` | Update experiment status |
| DELETE | `/api/experiments/{id}` | Delete an experiment |

#### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/{id}` | Get conversation details |
| POST | `/api/conversations` | Save a conversation |
| PUT | `/api/conversations/{id}` | Update a conversation |
| DELETE | `/api/conversations/{id}` | Delete a conversation |
| GET | `/api/conversations/experiment/{experiment_id}` | Get experiment conversations |

#### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/list` | List installed models |
| POST | `/api/models/pull` | Start pulling a model |
| GET | `/api/models/pull` | List all pull tasks |
| GET | `/api/models/pull/{task_id}` | Get pull task status |
| GET | `/api/models/pull/{task_id}/health` | Get pull task health |
| DELETE | `/api/models/pull/{task_id}` | Cancel a pull task |
| DELETE | `/api/models/pull/{task_id}/dismiss` | Dismiss a completed task |
| DELETE | `/api/models/delete/{model_name}` | Delete a model |
| GET | `/api/models/version` | Get Ollama version |
| GET | `/api/models/catalog` | Get model catalog |

#### WebSockets

| Endpoint | Description |
|----------|-------------|
| `WS /ws/experiments/{experiment_id}` | Real-time experiment updates |
| `WS /api/models/ws/pull/{task_id}` | Real-time model pull progress |

### Example Requests

**Start an Experiment:**

```bash
curl -X POST http://localhost:8000/api/experiments/start \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "id": "task1",
      "prompt": "Solve this math problem: 2+2"
    },
    "agents": [
      {
        "id": "agent1",
        "name": "Solver",
        "prompt": "You are a helpful assistant",
        "color": "#3B82F6",
        "model": "llama2"
      }
    ],
    "iterations": 1
  }'
```

**List Models:**

```bash
curl http://localhost:8000/api/models/list
```

**Pull a Model:**

```bash
curl -X POST http://localhost:8000/api/models/pull \
  -H "Content-Type: application/json" \
  -d '{"name": "llama2"}'
```

## Development

### Project Structure

```
backend/
├── app/
│   ├── __init__.py              # FastAPI app factory
│   ├── api/                     # API routes
│   │   ├── routes/
│   │   │   ├── experiments.py  # Experiment endpoints
│   │   │   ├── conversations.py # Conversation endpoints
│   │   │   ├── models.py        # Model endpoints
│   │   │   └── ollama_proxy.py  # Ollama API routes
│   │   └── ws.py                # WebSocket handlers
│   ├── core/                    # Core functionality
│   │   ├── config.py            # Configuration
│   │   ├── config_validators.py # Config validators
│   │   ├── exceptions.py        # Custom exceptions
│   │   ├── state.py             # State management
│   │   ├── experiment_state_manager.py
│   │   └── message_queue_manager.py
│   ├── schemas/                 # Pydantic models
│   │   ├── agent.py
│   │   ├── conversation.py
│   │   ├── experiment.py
│   │   ├── storage.py
│   │   └── task.py
│   ├── services/                # Business logic
│   │   ├── agent_service.py
│   │   ├── autogen_service.py
│   │   ├── conversation_runner.py
│   │   ├── conversation_service.py
│   │   ├── experiment_service.py
│   │   ├── iteration_manager.py
│   │   ├── message_handler.py
│   │   ├── message_logger.py
│   │   ├── model_pull_manager.py
│   │   ├── ollama_client.py
│   │   └── ... (other services)
│   ├── storage/                 # Data persistence
│   │   ├── base.py
│   │   ├── conversation_storage.py
│   │   ├── experiment_storage.py
│   │   └── unified_storage.py
│   └── utils/                   # Utilities
│       ├── case_converter.py
│       ├── experiment_helpers.py
│       ├── file_utilities.py
│       └── logging.py
├── data/                        # Application data
│   └── experiments/
├── tests/                       # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── main.py                      # Application entry point
├── requirements.txt             # Python dependencies
├── pytest.ini                   # Pytest configuration
└── mypy.ini                     # Type checking config
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test types
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m e2e              # End-to-end tests only

# Run specific test file
pytest tests/unit/test_services/test_experiment_service.py

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html
```

### Test Structure

- **Unit Tests** (`tests/unit/`): Test individual components in isolation
- **Integration Tests** (`tests/integration/`): Test API endpoints and component interactions
- **E2E Tests** (`tests/e2e/`): Test complete workflows

## Key Services

### ExperimentService

Manages experiment lifecycle and state.

**Key Methods:**
- `create_experiment()`: Create new experiment
- `update_experiment_status()`: Update experiment status
- `delete_experiment()`: Remove experiment

### AutogenService

Orchestrates multi-agent conversations using AutoGen.

**Key Methods:**
- `start_experiment_background()`: Start experiment in background thread
- `run_experiment()`: Execute full experiment workflow

### ConversationService

Handles conversation data and formatting.

**Key Methods:**
- `get_live_conversation()`: Get active conversation
- `save_conversation()`: Persist conversation

### ModelPullManager

Manages model pulling from Ollama with progress tracking.

**Key Features:**
- Background pull execution
- Progress tracking and callbacks
- Task persistence
- Automatic cleanup

### OllamaClient

Client for interacting with Ollama API.

**Key Methods:**
- `get_tags()`: List installed models
- `get_version()`: Get Ollama version
- `pull_model()`: Pull model from Ollama
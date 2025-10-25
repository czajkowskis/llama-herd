# LLaMa-Herd Backend

This is the FastAPI backend for the LLaMa-Herd application that handles Autogen group chat experiments.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure the application (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```
   
   See [CONFIGURATION.md](CONFIGURATION.md) for all available options.

3. **Install Ollama:**
   Make sure you have Ollama installed and running. You can download it from [ollama.ai](https://ollama.ai).

4. **Pull required models:**
   ```bash
   ollama pull llama2
   # Add other models as needed
   ```

## Running the Backend

### Option 1: Using the startup script (Recommended)

1. **Start both servers (proxy + backend):**
   ```bash
   ./start_servers.sh
   ```

### Option 2: Manual startup

1. **Start the Ollama proxy server:**
   ```bash
   python ollama_proxy.py
   ```

2. **Start the FastAPI server (in a new terminal):**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Access the API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Experiments

- `POST /api/experiments/start` - Start a new Autogen group chat experiment
- `GET /api/experiments/{experiment_id}` - Get experiment status and data
- `GET /api/experiments` - List all experiments
- `DELETE /api/experiments/{experiment_id}` - Delete an experiment

### WebSocket

- `WS /ws/experiments/{experiment_id}` - Real-time experiment updates

## Features

- **Autogen Integration**: Uses Microsoft's Autogen library for multi-agent conversations
- **Real-time Updates**: WebSocket connection for live experiment monitoring
- **Agent Management**: Supports custom agent prompts and models
- **Conversation Logging**: All messages are logged and can be viewed in the frontend
- **Error Handling**: Comprehensive error handling and status reporting

## Configuration

The backend is configured to work with Ollama models. You can modify the model configurations in the `create_autogen_agents` function in `main.py`.

## Troubleshooting

1. **Ollama not running**: Start with `ollama serve`
2. **Model not found**: Pull the model with `ollama pull <model-name>`
3. **Backend connection failed**: Ensure the backend is running on port 8000
4. **Proxy connection failed**: Ensure the proxy is running on port 8080
5. **CORS errors**: Backend is configured for `http://localhost:3000`
6. **API key errors**: The proxy server handles the API key translation automatically
7. **WebSocket connection issues**: Check that the frontend is connecting to the correct WebSocket URL

## Thread Safety and Race Condition Handling

### ModelPullManager Locking

The `ModelPullManager` now uses a `threading.Lock` to protect all accesses to its shared dictionaries (`tasks` and `progress_callbacks`). This prevents race conditions and KeyErrors when running concurrent pull tasks and during cleanup. All methods that read or modify these dicts acquire the lock.

**Trade-offs considered:**
- Locking is simple and robust for the current threading model.
- If full async behavior is needed, consider migrating to `asyncio` primitives and async tasks/queues.
- Locking may reduce parallelism if tasks are very frequent, but ensures correctness.

### Testing

The backend includes a comprehensive testing infrastructure with unit, integration, and end-to-end tests.

**Run all tests:**
```bash
cd backend
pytest
```

**Run specific test types:**
```bash
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m e2e              # End-to-end tests only
```

**Run specific test file:**
```bash
pytest tests/unit/test_services/test_experiment_service.py
```

**Test Requirements:**
- All external services (Ollama, Autogen) are mocked for fast, isolated testing
- Tests run automatically in CI/CD pipeline on push and pull requests

For detailed testing documentation, see [tests/README.md](tests/README.md).

### Thread Safety Testing

Unit tests (`test_model_pull_manager_threading.py`) verify that starting many concurrent pull tasks and running cleanup does not cause KeyError or corrupted state.

**Example: Running Thread Safety Tests**
```bash
pytest backend/test_model_pull_manager_threading.py -v
```

### API Documentation

All endpoints are documented with FastAPI's OpenAPI/Swagger integration.
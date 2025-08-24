# LLaMa-Herd Backend

This is the FastAPI backend for the LLaMa-Herd application that handles Autogen group chat experiments.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Ollama:**
   Make sure you have Ollama installed and running. You can download it from [ollama.ai](https://ollama.ai).

3. **Pull required models:**
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
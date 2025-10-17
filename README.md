# LLaMa-Herd

A React-based application for creating and managing multi-agent conversations using Ollama models and Microsoft's Autogen framework.

## Features

- **Multi-Agent Conversations**: Create and manage conversations between multiple AI agents
- **Ollama Integration**: Use local Ollama models for agent responses
- **Autogen Integration**: Leverage Microsoft's Autogen framework for sophisticated multi-agent interactions
- **Real-time Updates**: Live WebSocket updates during experiments
- **Conversation Import**: Import existing conversations from JSON files
- **Agent Configuration**: Customize agent prompts, models, and visual appearance
- **Task Management**: Create and manage tasks for agent conversations
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## Architecture

The application consists of two main components:

1. **Frontend (React/TypeScript)**: User interface for creating and managing experiments
2. **Backend (FastAPI/Python)**: Handles Autogen integration and real-time communication

## Environment Variables (Frontend)

The frontend uses environment variables to configure API endpoints. These are managed via `.env` files, consistent with Create React App.

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

The following variables are available:

- `REACT_APP_API_BASE_URL`: The base URL for the backend API (e.g., `http://localhost:8000`).
- `REACT_APP_OLLAMA_BASE_URL`: The base URL for the Ollama API (e.g., `http://localhost:11434`).

These variables are embedded at build time. If you change them, you will need to restart the development server.

## Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Python 3.8+**
3. **Ollama** - Download from [ollama.ai](https://ollama.ai)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd llama-herd
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. **Start Ollama:**
   ```bash
   ollama serve
   ```

5. **Pull required models:**
   ```bash
   ollama pull llama2
   # Add other models as needed
   ```

### Running the Application

1. **Start the backend:**
   ```bash
   cd backend
   ./start.sh
   # Or manually: python main.py
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### Creating Experiments

1. **Create a Task**: Define what you want your agents to discuss or accomplish
2. **Add Agents**: Create agents with custom prompts, models, and visual styles
3. **Start Experiment**: Click "Start Experiment" to begin the Autogen group chat
4. **Monitor Progress**: Watch real-time updates as agents interact with each other

### Importing Conversations

1. **Upload JSON Files**: Import existing conversations from JSON files
2. **Configure Agents**: Customize agent names, colors, and models
3. **View Conversations**: Browse and interact with imported conversations

## API Documentation

The backend provides a REST API and WebSocket endpoints:

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/experiments/start` - Start a new experiment
- `GET /api/experiments/{id}` - Get experiment status
- `WS /ws/experiments/{id}` - Real-time updates

## Development

### Frontend Structure

```
src/
├── components/          # React components
│   ├── agent/          # Agent management
│   ├── conversation/    # Conversation display
│   ├── experiment/     # Experiment management
│   └── ui/            # Reusable UI components
├── pages/             # Page components
├── services/          # API services
└── types/            # TypeScript definitions
```

### Backend Structure

```
backend/
├── main.py           # FastAPI application
├── requirements.txt  # Python dependencies
├── test_backend.py  # Backend testing
└── start.sh         # Startup script
```

### Testing

**Test the backend:**
```bash
cd backend
python test_backend.py
```

## Configuration

### Models

The application works with any Ollama model. Popular options include:
- `llama2` - Meta's Llama 2
- `codellama` - Code-focused model
- `mistral` - Mistral AI's model
- `neural-chat` - Intel's conversational model

### Agent Prompts

Customize agent behavior by modifying their system prompts. Example prompts:
- **Expert Agent**: "You are an expert in [field]. Provide detailed, accurate information."
- **Critic Agent**: "You are a critical thinker. Question assumptions and identify potential issues."
- **Facilitator Agent**: "You are a conversation facilitator. Help guide the discussion and summarize points."

## Troubleshooting

### Common Issues

1. **Ollama not running**: Start with `ollama serve`
2. **Model not found**: Pull the model with `ollama pull <model-name>`
3. **Backend connection failed**: Ensure the backend is running on port 8000
4. **CORS errors**: Backend is configured for `http://localhost:3000`

### Logs

- **Frontend**: Check browser console for errors
- **Backend**: Check terminal output for Python errors
- **Ollama**: Check Ollama logs for model issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Microsoft Autogen](https://github.com/microsoft/autogen) - Multi-agent conversation framework
- [Ollama](https://ollama.ai) - Local LLM server
- [React](https://reactjs.org) - Frontend framework
- [FastAPI](https://fastapi.tiangolo.com) - Backend framework

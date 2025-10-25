# LLaMa-Herd

**A Multi-Agent Conversation Platform for AI Research and Development**

LLaMa-Herd is a multi-agent conversation platform that facilitates creation, configuration, and orchestration of conversations between multiple AI agents. Built with modern web technologies and designed for researchers, developers, and AI enthusiasts, it provides an environment for exploring multi-agent interactions and collaborative AI systems.

## Key Features

- **Multi-Agent Experiments**: Create and run experiments with multiple AI agents working together
- **Real-time Monitoring**: Live WebSocket updates during experiments with connection status tracking
- **Custom Agent Configuration**: Define agents with specific personalities, language models, and behaviors
- **Experiment Management**: Track experiment status, iterations, and conversation history
- **History & Analysis**: View and analyze completed experiments and imported conversations
- **Model Management**: Pull and manage Ollama models with progress tracking
- **Import/Export**: Import conversations and export experiment data in various formats
- **Ollama Integration**: Seamless integration with local Ollama models
- **Testing Infrastructure**: Comprehensive testing with unit, integration, and E2E tests

## Prerequisites

- **Python 3.10+** with pip
- **Node.js 16+** with npm
- **Ollama** installed and running ([Download from ollama.ai](https://ollama.ai))

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd llama-herd
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# From project root
npm install
```

### 4. Ollama Setup

```bash
# Install Ollama (if not already installed)
# Visit https://ollama.ai for installation instructions

# Start Ollama server
ollama serve

# Pull some models (in a new terminal)
ollama pull llama2
ollama pull codellama
# Add other models as needed
```

## Running the Application

### Option 1: Quick Start (Recommended)

```bash
# Start both backend and proxy server
cd backend
./start_with_proxy.sh
```

This script will:
- Check dependencies
- Start the Ollama proxy server on port 8080
- Start the FastAPI backend on port 8000
- Handle cleanup when stopped

### Option 2: Manual Startup

**Terminal 1 - Start Ollama Proxy:**
```bash
cd backend
python3 ollama_proxy.py
```

**Terminal 2 - Start Backend:**
```bash
cd backend
python3 main.py
```

**Terminal 3 - Start Frontend:**
```bash
npm start
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
llama-herd/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes and WebSocket handlers
│   │   ├── core/              # Configuration and core utilities
│   │   ├── schemas/           # Pydantic models
│   │   ├── services/          # Business logic services
│   │   ├── storage/           # Data persistence layer
│   │   └── utils/             # Utility functions
│   ├── data/                  # Application data storage
│   ├── tests/                 # Backend tests
│   ├── main.py               # Application entry point
│   ├── ollama_proxy.py       # Ollama API proxy
│   └── start_with_proxy.sh   # Startup script
├── src/                       # React frontend
│   ├── components/           # Reusable UI components
│   ├── features/             # Feature-specific components
│   │   ├── experiments/      # Experiment management
│   │   ├── history/          # History and analysis
│   │   └── models/           # Model management
│   ├── services/             # API services
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── tests/                     # Frontend E2E tests
└── build/                     # Production build output
```

## Configuration

### Backend Configuration

The backend can be configured via environment variables or `.env` file:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_TITLE="LLaMa-Herd Backend"
API_VERSION="1.0.0"

# CORS Configuration
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:8080/v1
OLLAMA_URL=http://localhost:11434
OLLAMA_TIMEOUT=300

# Storage Configuration
DATA_DIRECTORY=data
EXPERIMENTS_DIRECTORY=experiments

# Experiment Configuration
DEFAULT_MAX_ROUNDS=8
DEFAULT_TEMPERATURE=0.7
EXPERIMENT_TIMEOUT_SECONDS=3600
ITERATION_TIMEOUT_SECONDS=300
```

### Frontend Configuration

Frontend configuration is handled through:
- `src/config/index.ts` - API endpoints and settings
- Browser localStorage - UI preferences and Ollama connection
- Settings page - User-configurable options

## API Documentation

### REST Endpoints

**Experiments:**
- `POST /api/experiments/start` - Start a new experiment
- `GET /api/experiments/{experiment_id}` - Get experiment details
- `GET /api/experiments` - List all experiments
- `DELETE /api/experiments/{experiment_id}` - Delete an experiment

**Models:**
- `GET /api/models` - List available Ollama models
- `POST /api/models/pull` - Pull a new model
- `GET /api/models/pull/{task_id}` - Get pull task status

**Conversations:**
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{conversation_id}` - Get conversation details

### WebSocket Endpoints

- `WS /ws/experiments/{experiment_id}` - Real-time experiment updates


## License

This project is licensed under the MIT License - see the LICENSE file for details.

**Happy experimenting with multi-agent conversations!**
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

### Option 1: Docker (Recommended)
- **Docker** and **Docker Compose** installed
- **Git** for cloning the repository

### Option 2: Manual Installation
- **Python 3.10+** with pip
- **Node.js 16+** with npm
- **Ollama** installed and running ([Download from ollama.ai](https://ollama.ai))

## Installation & Setup

### Option 1: Docker Setup (Recommended)

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd llama-herd
```

#### 2. Configure Environment (Optional)

**Note:** Environment configuration is optional for Docker setup as environment variables are set in `docker-compose.yml`. For local development without Docker, create `.env` files based on the configuration sections below.

#### 3. Ensure Data Directory Exists

```bash
# The backend/data directory structure is tracked in git via .gitkeep files
# However, ensure it exists before starting:
mkdir -p backend/data/models
```

#### 4. Start with Docker Compose

**Development Mode (with hot-reload):**
```bash
docker-compose --profile dev up
```

**Production Mode:**
```bash
docker-compose --profile prod up -d
```

#### 4. Pull AI Models

```bash
# Pull some common models
docker-compose exec ollama ollama pull llama2
docker-compose exec ollama ollama pull codellama

# Or pull any other model you need
docker-compose exec ollama ollama pull <model-name>
```

#### 6. Access the Application

- **Development**: http://localhost:3000
- **Production**: http://localhost:80
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Ollama API**: http://localhost:11435

#### 7. Useful Docker Commands

```bash
# View logs
docker-compose logs [service-name]

# Follow logs in real-time
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache

# Check service health
docker-compose ps

# Execute commands in containers
docker-compose exec backend python --version
docker-compose exec frontend-dev npm --version

# Pull models in Ollama container
docker-compose exec ollama ollama pull llama2
docker-compose exec ollama ollama list

# Restart a specific service
docker-compose restart backend

# Check container resource usage
docker stats
```

**Quick Start for Testing:**
```bash
# 1. Start the application in development mode
docker-compose --profile dev up

# 2. Pull some models (in a new terminal)
docker-compose exec ollama ollama pull llama2:7b

# 3. Open browser to http://localhost:3000

# 4. When done testing, stop services
docker-compose down
```

### Option 2: Local Development (Without Docker)

#### 1. Prerequisites

- **Python 3.10+** with pip
- **Node.js 16+** with npm
- **Ollama** installed and running locally ([Download from ollama.ai](https://ollama.ai))

#### 2. Clone the Repository

```bash
git clone <repository-url>
cd llama-herd
```

#### 3. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment for local development
cp .env.example .env
# The .env.example is already configured for local Ollama on port 11434
# No changes needed unless you have a custom setup
```

#### 4. Ollama Setup

```bash
# Start Ollama server (if not already running)
ollama serve

# In a new terminal, pull some models
ollama pull llama2
ollama pull codellama
# Add other models as needed
```

#### 5. Frontend Setup

```bash
# From project root
npm install

# Configure environment for local development
cp .env.example .env
# The .env.example is already configured for local backend and Ollama
# No changes needed unless you have a custom setup
```

## Running the Application

### Start the Backend

```bash
cd backend
python3 main.py
```

This will:
- Start the FastAPI backend on port 8000
- Connect directly to Ollama's OpenAI-compatible API at `http://localhost:11434/v1`
- Enable auto-reload in development mode

### Start the Frontend

In a separate terminal:

```bash
npm start
```

**Important Notes for Local Development:**
- Make sure Ollama is running locally on port 11434 before starting the backend
- The backend will connect to `http://localhost:11434` (not Docker's `http://ollama:11434`)
- Make sure you've copied `.env.example` to `.env` in both backend and root directories

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Ollama API**: http://localhost:11434 (standard port for local installation)

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
│   └── main.py               # Application entry point
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

**Configuration Differences: Docker vs Local**
- **Docker**: Ollama uses internal Docker hostname `http://ollama:11434` (configured in `docker-compose.yml`)
- **Local**: Ollama uses `http://localhost:11434` (configured via `.env` files)
- Use `backend/.env.example` and `.env.example` as templates for local development

### Backend Configuration

The backend can be configured via environment variables or `.env` file. See `backend/.env.example` for a template.

**Key settings for local development:**
```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_TITLE="LLaMa-Herd Backend"
API_VERSION="1.0.0"

# CORS Configuration
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# Ollama Configuration (IMPORTANT: use localhost for local development)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_URL=http://localhost:11434
OLLAMA_TIMEOUT=300

# Storage Configuration
DATA_DIRECTORY=./data
EXPERIMENTS_DIRECTORY=experiments

# Experiment Configuration
DEFAULT_MAX_ROUNDS=8
DEFAULT_TEMPERATURE=0.7
EXPERIMENT_TIMEOUT_SECONDS=3600
```

### Frontend Configuration

Frontend can be configured via `.env` file (see `.env.example`):
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
```

Configuration is also handled through:
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

## Docker Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
sudo lsof -i :8000
sudo lsof -i :3000
sudo lsof -i :11434
sudo lsof -i :11435

# Stop conflicting services (e.g., local Ollama)
sudo systemctl stop ollama
# or
pkill ollama

# Or change ports in docker-compose.yml if needed
```

**2. Permission Issues**

**Data Directory Permissions:**
```bash
# If backend/data directory has permission issues, fix ownership
sudo chown -R $USER:$USER backend/data

# Or ensure the directory exists before starting containers
mkdir -p backend/data/models backend/data/experiments backend/data/imported_conversations
chmod 755 backend/data backend/data/models backend/data/experiments backend/data/imported_conversations
```

**Docker Permissions (Linux):**
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
# Log out and back in, then try again
```

**Note:** The `backend/data/` directory structure is tracked in git via `.gitkeep` files. However, if Docker creates the directory as root (especially on Linux), you may need to fix ownership manually.

**3. Container Won't Start**
```bash
# Check container logs
docker-compose logs [service-name]

# Check container health
docker-compose ps

# Rebuild containers
docker-compose build --no-cache
```

**4. Ollama Models Not Loading**
```bash
# Check Ollama container logs
docker-compose logs ollama

# Pull models manually
docker-compose exec ollama ollama pull llama2

# Check available models
docker-compose exec ollama ollama list
```

**5. Frontend Not Connecting to Backend**
```bash
# Check if backend is healthy
curl http://localhost:8000/health

# Check CORS settings in .env file
# Ensure REACT_APP_API_BASE_URL is correct
```

**6. Data Not Persisting**
```bash
# Check volume mounts
docker volume ls | grep llama-herd

# Inspect volume contents
docker run --rm -v llama-herd-experiment-data:/data alpine ls -la /data

# Ensure backend/data directory exists and has correct permissions
mkdir -p backend/data/models backend/data/experiments backend/data/imported_conversations
# On Linux/Mac, set permissions:
chmod 755 backend/data backend/data/models backend/data/experiments backend/data/imported_conversations
```

**Note:** The `backend/data/` directory structure is created automatically with `.gitkeep` files to ensure it exists in the repository. However, if you encounter permission issues, you may need to adjust ownership manually, especially on Linux systems where Docker may create the directory as root.

**7. Clean Slate Reset**
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images (WARNING: This removes ALL Docker images)
docker system prune -a

# Start fresh
docker-compose --profile dev up
```

### Performance Tips

**1. Faster Builds**
```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker-compose build
```

**2. Resource Limits**
```bash
# Add resource limits to docker-compose.yml services:
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
```

**3. Development Hot Reload**
```bash
# Ensure file watching works in Docker
# Add to .env:
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

**Happy experimenting with multi-agent conversations!**
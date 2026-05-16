# LLaMa-Herd

> A local-first workspace for designing, running, and studying multi-agent LLM conversations.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript&logoColor=fff)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=fff)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=fff)
![Ollama](https://img.shields.io/badge/Ollama-local%20models-111?logo=ollama&logoColor=fff)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=fff)

LLaMa-Herd turns a local Ollama setup into a practical multi-agent experimentation lab. Create agents with different roles and model settings, give them a task, watch the conversation unfold in real time, and revisit the completed run later for analysis.

It is built as a full-stack app: a React/TypeScript interface for configuring experiments and reviewing history, backed by a FastAPI service that orchestrates agents, streams progress over WebSockets, manages Ollama models, and persists data locally.

<!-- Add a screenshot or short GIF here when ready. -->

## Why LLaMa-Herd

Multi-agent behavior is easier to understand when you can see the interaction, not just read a final transcript. LLaMa-Herd gives you a hands-on way to compare local models, test agent roles, observe collaboration patterns, and save the results for later inspection.

## Highlights

- **Multi-agent experiments:** Define a task, configure agents, and run iterative conversations.
- **Live monitoring:** Watch agent messages and experiment state update over WebSockets.
- **Local model workflow:** Pull, list, inspect, and delete Ollama models from the UI.
- **Conversation history:** Persist completed experiments and imported conversations locally.
- **Analysis-friendly views:** Review runs, browse messages, inspect raw JSON, and export data.
- **Developer-ready stack:** React, TypeScript, FastAPI, Pydantic, AutoGen, Docker, Jest, pytest, and Playwright.

## Architecture

```text
React + TypeScript UI
  experiments, history, models, settings
          |
          | REST + WebSockets
          v
FastAPI backend
  orchestration, model pulls, persistence
          |
          | Ollama native + OpenAI-compatible APIs
          v
Ollama
  local LLM runtime
```

## Quick Start

Docker is the fastest way to run the full stack, including Ollama.

```bash
git clone <repository-url>
cd llama-herd
docker compose build
docker compose --profile dev up
```

In another terminal, pull at least one model:

```bash
docker compose exec ollama ollama pull gemma3:4b
docker compose exec ollama ollama pull qwen3:4b
```

Open the app at http://localhost:3000.

Useful local endpoints:

- **Backend API:** http://localhost:8000
- **API docs:** http://localhost:8000/docs
- **Ollama API:** http://localhost:11435

## Local Development

Run Ollama locally, then start the backend and frontend in separate terminals.

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 main.py
```

```bash
# Frontend, from the repository root
npm install
cp .env.example .env
npm start
```

Local defaults expect:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Ollama: http://localhost:11434

## Project Shape

```text
backend/   FastAPI routes, services, storage, schemas, and tests
src/       React app, feature modules, shared components, hooks, services
tests/     Frontend end-to-end tests
```

## Quality Checks

```bash
npm run type-check
npm run test:ci
npm run test:e2e

cd backend
pytest
```

## Tech Stack

- **Frontend:** React 19, TypeScript, React Router, Tailwind CSS
- **Backend:** FastAPI, Pydantic, Uvicorn, AutoGen
- **Runtime:** Ollama through native and OpenAI-compatible APIs
- **Testing:** Jest, pytest, Playwright
- **Deployment:** Docker Compose development and production profiles

## License

This project is released under the MIT License.

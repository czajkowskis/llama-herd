## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Configuration](#configuration)
- [Key Components & Services](#key-components--services)
- [Troubleshooting](#troubleshooting)

## Overview

- **Experiment Management**: Create and configure multi-agent AI experiments
- **Real-time Monitoring**: Live WebSocket updates during experiments
- **History & Analysis**: View and analyze completed experiments and conversations
- **Model Management**: Pull and manage Ollama models with progress tracking
- **Import/Export**: Import conversations and export experiment data
- **Responsive UI**: Modern, accessible interface with theme support


## Architecture

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Routes    │  │  Components  │  │   Contexts   │  │
│  │   Management │  │   Hierarchy  │  │   Providers  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────┐
│         ▼                  ▼                  ▼          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Services Layer                       │  │
│  │  • experimentService                              │  │
│  │  • backendStorageService                         │  │
│  │  • ollamaService                                 │  │
│  │  • exportService                                 │  │
│  │  • ReconnectingWebSocket                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Custom Hooks                         │  │
│  │  • useUIPreferences                               │  │
│  │  • usePullTasks                                   │  │
│  │  • useOllamaConnection                            │  │
│  │  • useModelPulling                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         API Communication                         │  │
│  │  • REST API (fetch)                               │  │
│  │  • WebSocket (real-time updates)                  │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Installation

1. **Navigate to project root** (if not already there):
   ```bash
   cd llama-herd
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   Create a `.env` file in the root directory:
   ```bash
   REACT_APP_API_BASE_URL=http://localhost:8000
   REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
   ```

4. **Verify installation**:
   ```bash
   npm run type-check
   ```

## Running the Application

### Development Mode

Start the development server with hot-reload:

```bash
npm start
```

The application will open at http://localhost:3000

### Production Build

Build the application for production:

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server |
| `npm run build` | Create production build |
| `npm test` | Run tests in watch mode |
| `npm run test:ci` | Run tests with coverage (CI mode) |
| `npm run test:integration` | Run integration tests only |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:e2e:headed` | Run E2E tests in headed mode |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

## Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── common/             # Common components (Sidebar, ErrorBoundary, etc.)
│   └── ui/                 # UI primitives (Button, Input, etc.)
├── features/               # Feature-specific modules
│   ├── experiments/        # Experiment management
│   │   ├── components/     # Experiment components
│   │   ├── hooks/          # Experiment hooks
│   │   └── utils/          # Experiment utilities
│   ├── history/            # History and conversations
│   │   ├── components/     # History components
│   │   ├── hooks/          # History hooks
│   │   └── utils/          # History utilities
│   └── models/             # Model management
│       ├── components/     # Model components
│       └── hooks/          # Model hooks
├── services/               # API and business logic
│   ├── experimentService.ts
│   ├── backendStorageService.ts
│   ├── ollamaService.ts
│   ├── exportService.ts
│   └── ReconnectingWebSocket.ts
├── hooks/                  # Shared custom hooks
│   ├── useUIPreferences.ts
│   └── usePullTasks.ts
├── contexts/               # React contexts
│   └── PullTasksContext.tsx
├── pages/                  # Top-level page components
│   ├── Settings.tsx
│   └── About.tsx
├── routes/                 # Routing configuration
│   └── index.tsx
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
├── config/                 # Configuration
│   └── index.ts
├── mocks/                  # Mock data for testing
├── App.tsx                 # Root component
└── index.tsx               # Entry point
```

## Key Features

### Experiment Management

- **Create Experiments**: Configure agents, tasks, and parameters
- **Live Monitoring**: Real-time WebSocket updates during experiments
- **Status Tracking**: Monitor experiment progress and status
- **Multiple Views**: Switch between live and historical views

### History & Analysis

- **Conversation Viewing**: Browse completed conversations
- **Message Threading**: View agent interactions and responses
- **Export**: Export experiments in various formats (JSON, Markdown)
- **Search & Filter**: Find specific conversations or messages

### Model Management

- **Discover Models**: Browse available Ollama models
- **Install Models**: Pull models with progress tracking
- **Model List**: View installed models and their details
- **Connection Status**: Monitor Ollama connection health

### UI/UX Features

- **Theme Support**: Light/dark mode with CSS variables
- **Responsive Design**: Mobile-friendly layout
- **Error Boundaries**: Graceful error handling
- **Loading States**: Skeleton screens and spinners
- **Accessibility**: Keyboard navigation and ARIA labels

## Testing

### Unit Tests

Unit tests use Jest and React Testing Library:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# Run specific test
npm test MyComponent.test.tsx
```

**Test Example**:
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### End-to-End Tests

E2E tests use Playwright:

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

**Test Example**:
```typescript
import { test, expect } from '@playwright/test';

test('should create experiment', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="task-input"]', 'Test task');
  await page.click('[data-testid="submit-button"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```
## Key Components & Services

### Components

**App.tsx**: Root application component with routing and context providers

**Sidebar**: Navigation sidebar with expandable sections

**ErrorBoundary**: Catches and displays React errors gracefully

**LiveExperimentView**: Real-time experiment monitoring with WebSocket

**NewExperimentPage**: Form for creating new experiments

**ConversationViewer**: Displays conversation history with threading

**ModelsPage**: Model discovery, installation, and management interface

### Services

**experimentService.ts**: Experiment CRUD operations and WebSocket handling

**backendStorageService.ts**: Backend API communication layer

**ollamaService.ts**: Ollama API integration for model management

**exportService.ts**: Export functionality for experiments and conversations

**ReconnectingWebSocket.ts**: Robust WebSocket connection with auto-reconnect

### Custom Hooks

**useUIPreferences**: Manages UI theme, preferences, and local storage

**usePullTasks**: Handles model pull tasks with progress tracking

**useOllamaConnection**: Monitors Ollama connection status

**useModelPulling**: Manages model pulling operations

### Contexts

**PullTasksContext**: Global state for model pull tasks across the application

## License

This project is licensed under the MIT License - see the LICENSE file for details.

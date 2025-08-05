# LLaMa-Herd

A React application for managing multi-agent conversations and experiments.

## Conversation JSON Format

The application expects conversation files to be in JSON format with the following structure:

```json
{
  "title": "Conversation Title",
  "messages": [
    {
      "agent": {
        "name": "Agent Name",
        "model": "llama2:7b"
      },
      "content": "Agent message content",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    {
      "agent": {
        "name": "Another Agent",
        "model": "mistral:7b"
      },
      "content": "Another agent's message",
      "timestamp": "2024-01-01T12:01:00.000Z"
    }
  ]
}
```

### Key Features:

- **Agent Configuration**: Each agent can have a unique name and color
- **Model Information**: The model used by each agent is displayed in the chat
- **Multiple Conversations**: Upload and manage multiple conversation files
- **Inline Editing**: Edit conversation titles and agent names directly
- **Color Management**: Unique color assignment with custom color picker

### Supported JSON Structures:

1. **Standard Format** (recommended):
   ```json
   {
     "agent": {
       "name": "Agent Name",
       "model": "llama2:7b"
     },
     "content": "Message content"
   }
   ```

2. **Alternative Format**:
   ```json
   {
     "agent": "Agent Name",
     "model": "llama2:7b",
     "message": "Message content"
   }
   ```

The application will automatically extract model information and display it in both the agent configuration window and the chat visualization.

## Core Functionality

* **API Integration:** The application includes a service layer for seamless communication with the Ollama API, enabling access to local Ollama models.

* **AutoGen Integration:** The application is designed to work with AutoGen, providing a graphical interface for defining and executing multi-agent experiments. This allows users to easily set up and manage collaborative tasks and conversational workflows involving multiple AI agents.

## Prerequisites

To install and run this project, ensure the following software is installed on your system:

* **Node.js & npm:** A stable version of Node.js is required for the React development environment.

* **Ollama:** The Ollama server must be running locally to enable the application's core functionality. Detailed installation instructions can be found on the [official Ollama website](https://ollama.ai/).

## Installation and Execution

Follow these steps to set up and run the project:

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd <your-project-directory>
    ```

2.  **Install project dependencies:**

    ```bash
    npm install
    ```

3.  **Start the development server:**

    ```bash
    npm start
    ```

The application will be accessible via a web browser at `http://localhost:3000` (or the configured port).

## Ollama Server Configuration

For the application to function correctly, the Ollama server must be operational. Use the following commands to pull a model (e.g., `llama2`) and start the server:
```bash
ollama pull llama2
ollama run llama2
```
The application is initially configured to connect to the default Ollama API endpoint at `http://localhost:11434/api`. You can change it in the Settings page.

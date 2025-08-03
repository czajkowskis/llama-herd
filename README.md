# LLaMa-Herd

LLaMa-Herd is a web application built with React, providing a user interface for managing and experimenting with multiple agents via a local Ollama server and AutoGen integration. The application facilitates the setup and execution of conversational workflows involving a team of collaborative AI agents.

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

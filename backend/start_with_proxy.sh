#!/bin/bash

echo "Starting LLaMa-Herd Backend with Ollama Proxy..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ pip is not installed. Please install pip first."
    exit 1
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Check if Ollama is running
echo "🔍 Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "⚠️  Warning: Ollama doesn't seem to be running."
    echo "   Please start Ollama first: ollama serve"
    echo "   You can download Ollama from: https://ollama.ai"
fi

# Start the Ollama proxy server
echo "🚀 Starting Ollama Proxy Server..."
echo "   Proxy will be available at: http://localhost:8080"
echo ""

# Start proxy in background
python3 ollama_proxy.py &
PROXY_PID=$!

# Wait a moment for proxy to start
sleep 3

# Check if proxy is running
if curl -s http://localhost:8080/health &> /dev/null; then
    echo "✅ Ollama Proxy Server started successfully!"
else
    echo "❌ Failed to start Ollama Proxy Server"
    kill $PROXY_PID 2>/dev/null
    exit 1
fi

# Start the FastAPI server
echo "🚀 Starting FastAPI server..."
echo "   API will be available at: http://localhost:8000"
echo "   API docs will be available at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start main backend
python3 main.py

# Clean up proxy when main server stops
echo "🛑 Stopping Ollama Proxy Server..."
kill $PROXY_PID 2>/dev/null 
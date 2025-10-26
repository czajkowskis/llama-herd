// src/config/index.ts

/**
 * The base URL for the backend API.
 *
 * Reads from the `REACT_APP_API_BASE_URL` environment variable.
 * Defaults to empty string (relative URLs) if not set.
 */
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

/**
 * The base URL for the Ollama API.
 *
 * Reads from the `REACT_APP_OLLAMA_BASE_URL` environment variable.
 * Defaults to `http://localhost:11434` if not set.
 */
export const OLLAMA_BASE_URL = process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Builds a WebSocket URL from a given path.
 *
 * @param path The path for the WebSocket connection (e.g., /ws/experiment/123).
 * @returns The full WebSocket URL (e.g., ws://localhost:8000/ws/experiment/123).
 */
export const buildWebSocketUrl = (path: string): string => {
  // If API_BASE_URL is empty (relative URLs), use current host for WebSocket
  if (!API_BASE_URL) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
  }
  
  const url = new URL(API_BASE_URL);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}${path}`;
};

/**
 * Asserts that essential configuration is present, throwing an error if not.
 * This is useful for catching configuration issues early in CI/CD pipelines.
 */
export const assertConfig = (): void => {
  if (!API_BASE_URL) {
    throw new Error('REACT_APP_API_BASE_URL is not defined. Please check your .env file or environment variables.');
  }
  if (!OLLAMA_BASE_URL) {
    throw new Error('REACT_APP_OLLAMA_BASE_URL is not defined. Please check your .env file or environment variables.');
  }
};

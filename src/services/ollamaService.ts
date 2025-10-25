import { API_BASE_URL, OLLAMA_BASE_URL } from '../config';

// Interface for the response when listing available models.
export interface ModelTag {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface ListModelsResponse {
  models: ModelTag[];
}

export interface PullProgress {
  status?: string; // e.g., "pulling", "success", "error"
  total?: number; // total bytes
  completed?: number; // completed bytes
  digest?: string;
  error?: string;
  speed?: number; // download speed in bytes per second
}

export interface PullTask {
  task_id: string;
  model_name: string;
  status: string; // 'pending', 'running', 'completed', 'error', 'cancelled'
  progress?: PullProgress;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface VersionResponse {
  version: string;
}

/**
 * Fetches the list of available models from the backend API.
 * @returns A promise that resolves with an array of model names as strings, or rejects with an error.
 */
// Accept an optional baseUrl so callers (Settings) can test arbitrary endpoints.
export const listModels = async (baseUrl?: string): Promise<string[]> => {
  // When callers (Settings) supply a raw Ollama base URL we must not call
  // that host directly from the browser. Instead ask the backend to test the
  // specified Ollama endpoint and return the model list. If no baseUrl is
  // supplied, use the application's backend models listing as before.
  if (baseUrl) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ollama/test/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: baseUrl }),
      });
      if (!res.ok) {
        throw new Error(`Test proxy failed with status: ${res.status}`);
      }
      const data: ListModelsResponse = await res.json();
      return data.models.map(model => model.name);
    } catch (error) {
      console.error('Error fetching model list via backend test proxy:', error);
      throw error;
    }
  }

  const urlBase = API_BASE_URL;
  try {
    const response = await fetch(`${urlBase}/api/models/list`);
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data: ListModelsResponse = await response.json();
    return data.models.map(model => model.name);
  } catch (error) {
    console.error('Error fetching model list:', error);
    throw error;
  }
};

/**
 * Returns Ollama server version (and implicitly connectivity).
 */
export const getVersion = async (baseUrl?: string): Promise<string> => {
  if (baseUrl) {
    const res = await fetch(`${API_BASE_URL}/api/ollama/test/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: baseUrl }),
    });
    if (!res.ok) throw new Error(`Test proxy failed with status: ${res.status}`);
    const data: VersionResponse = await res.json();
    return data.version;
  }

  const urlBase = API_BASE_URL;
  const res = await fetch(`${urlBase}/api/models/version`);
  if (!res.ok) throw new Error(`API call failed with status: ${res.status}`);
  const data: VersionResponse = await res.json();
  return data.version;
};

/**
 * Gets all active model pull tasks.
 */
export const getPullTasks = async (baseUrl?: string): Promise<Record<string, PullTask>> => {
  const urlBase = baseUrl || API_BASE_URL;
  const res = await fetch(`${urlBase}/api/models/pull`);
  if (!res.ok) throw new Error(`API call failed with status: ${res.status}`);
  return await res.json();
};

/**
 * Deletes a local model by name/tag.
 */
export const deleteModel = async (name: string, baseUrl?: string): Promise<void> => {
  const urlBase = baseUrl || API_BASE_URL;
  const res = await fetch(`${urlBase}/api/models/delete/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Delete failed with status: ${res.status}`);
};

/**
 * Pulls a model by tag. Uses WebSocket for progress updates. Returns when done or aborted.
 */
export const pullModel = async (
  name: string,
  onProgress?: (p: PullProgress) => void,
  signal?: AbortSignal,
  baseUrl?: string,
  // By default we don't auto-cancel server tasks when the local signal aborts (navigation etc).
  autoCancelOnAbort: boolean = false
): Promise<void> => {
  const urlBase = baseUrl || API_BASE_URL;

  // Start the pull task
  // Start the pull task. Use an independent signal for the POST so unexpected aborts
  // (e.g., navigation) don't automatically cancel the server task. The provided
  // `signal` is used for client-side cancellation handling and websocket lifetime.
  const startResponse = await fetch(`${urlBase}/api/models/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!startResponse.ok) {
    throw new Error(`Pull failed with status: ${startResponse.status}`);
  }

  const startData = await startResponse.json();
  const taskId = startData.task_id;

  // Connect to WebSocket for progress updates
  const wsUrl = urlBase.replace(/^http/, 'ws') + `/api/models/ws/pull/${taskId}`;
  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    let completed = false;

    ws.onopen = () => {
      console.log(`Connected to pull progress WebSocket for task ${taskId}`);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'progress' && message.data) {
          const progress: PullProgress = message.data;
          onProgress?.(progress);
        } else if (message.type === 'status' && message.data) {
          const status = message.data;

          // Check if task is completed
          if (status.status === 'completed') {
            completed = true;
            ws.close();
            resolve();
          } else if (status.status === 'error') {
            completed = true;
            ws.close();
            reject(new Error(status.error || 'Pull failed'));
          } else if (status.status === 'cancelled') {
            completed = true;
            ws.close();
            reject(new DOMException('Pull was cancelled', 'AbortError'));
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', event.data, error);
      }
    };

    ws.onerror = (error) => {
      if (!completed) {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      }
    };

    ws.onclose = (event) => {
      if (!completed && !signal?.aborted) {
        reject(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`));
      }
    };

    // Handle abort signal: close websocket and reject locally. Only cancel the server
    // task if caller explicitly requested autoCancelOnAbort (defaults to false).
    if (signal) {
      signal.addEventListener('abort', () => {
        if (!completed) {
          completed = true;
          try { ws.close(); } catch (e) { /* ignore */ }
          if (autoCancelOnAbort) {
            fetch(`${urlBase}/api/models/pull/${taskId}`, {
              method: 'DELETE',
            }).catch(err => console.error('Failed to cancel pull task:', err));
          }
          reject(new DOMException('Pull was aborted', 'AbortError'));
        }
      });
    }
  });
};

/**
 * Cancels a running model pull task.
 */
export const cancelModelPull = async (taskId: string, baseUrl?: string): Promise<void> => {
  const urlBase = baseUrl || API_BASE_URL;
  const res = await fetch(`${urlBase}/api/models/pull/${taskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Cancel failed with status: ${res.status}`);
  }
};

/**
 * Permanently dismiss a pull task on the server so it won't be returned by list endpoints.
 */
export const dismissPullTask = async (taskId: string, baseUrl?: string): Promise<void> => {
  const urlBase = baseUrl || API_BASE_URL;
  const res = await fetch(`${urlBase}/api/models/pull/${taskId}/dismiss`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Dismiss failed with status: ${res.status}`);
  }
};
export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Interface for the response from the generate API.
export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * A reusable helper function to stream JSON objects from a ReadableStream.
 * Each JSON object is expected to be on a new line.
 *
 * @param reader The ReadableStreamDefaultReader to read from.
 * @param onObject A callback function invoked for each parsed JSON object.
 * @param signal An optional AbortSignal to cancel the stream processing.
 */
async function streamJsonLinesToObject<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onObject: (obj: T) => void,
  signal?: AbortSignal
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  const processBuffer = () => {
    // As long as there's a newline in the buffer, process lines
    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.trim() === '') {
        continue; // Ignore empty lines
      }
      try {
        const parsedObject = JSON.parse(line);
        onObject(parsedObject);
      } catch (error) {
        console.error('Failed to parse JSON line:', line, error);
        // Gracefully handle parsing errors and continue
      }
    }
  };

  // Set up abort listener to immediately cancel the reader
  const abortHandler = () => {
    reader.cancel('Stream reading was aborted.').catch(() => {
      // Ignore cancel errors - reader might already be closed
    });
  };
  
  if (signal) {
    signal.addEventListener('abort', abortHandler);
  }

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Check if already aborted before reading
      if (signal?.aborted) {
        await reader.cancel('Stream reading was aborted.');
        throw new DOMException('Stream reading was aborted.', 'AbortError');
      }

      // Race between reading and abort signal for immediate cancellation
      const readPromise = reader.read();
      const abortPromise = signal ? new Promise<never>((_, reject) => {
        const abortHandler = () => reject(new DOMException('Stream reading was aborted.', 'AbortError'));
        signal.addEventListener('abort', abortHandler, { once: true });
        // Clean up listener if read completes first
        readPromise.finally(() => signal.removeEventListener('abort', abortHandler));
      }) : new Promise<never>(() => {}); // Never resolves if no signal

      const { value, done } = await Promise.race([readPromise, abortPromise]);

      if (done) {
        // If there's any remaining data in the buffer, try to process it
        if (buffer.length > 0) {
          try {
            const parsedObject = JSON.parse(buffer);
            onObject(parsedObject);
          } catch (error) {
            // It might just be an incomplete line at the end of the stream
            console.error('Failed to parse final buffer content:', buffer, error);
          }
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // This is an expected error when the stream is aborted.
      console.log('Stream reading aborted as requested.');
      throw error; // Re-throw so caller knows it was aborted
    } else {
      console.error('Error reading from stream:', error);
      throw error;
    }
  } finally {
    // Clean up abort listener
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
}

/**
 * Generates a text completion for a given prompt and model.
 * This function supports streaming and non-streaming responses.
 * @param request The request payload including the model and prompt.
 * @param onStream A callback function to handle each chunk of a streamed response.
 * @param signal An optional AbortSignal to cancel the fetch request.
 * @returns A promise that resolves with the final response, or void for streamed responses.
 */
export const generateCompletion = async (
  request: GenerateRequest,
  onStream?: (chunk: GenerateResponse) => void,
  signal?: AbortSignal
): Promise<string | void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: request.stream ?? !!onStream }),
      signal, // Pass the signal to the fetch request
    });

    if (!response.ok || !response.body) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    if (onStream) {
      // Handle streaming responses using the helper
      const reader = response.body.getReader();
      await streamJsonLinesToObject<GenerateResponse>(reader, onStream, signal);
      // After the stream is complete, we can signal we are done if needed.
      // For example, by calling onStream with a special marker, but here we just resolve.
      return;
    } else {
      // Handle non-streaming responses
      const finalResponse = await response.json();
      return finalResponse.response;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Fetch aborted as requested.');
      // Don't rethrow abort errors as they are expected.
      return;
    }
    console.error('Error generating completion:', error);
    throw error;
  }
};

// Export the service object for easy importing
export const ollamaService = {
  listModels,
  getVersion,
  getPullTasks,
  deleteModel,
  pullModel,
  cancelModelPull,
  dismissPullTask,
  generateCompletion,
};

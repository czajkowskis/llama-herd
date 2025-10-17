import { OLLAMA_BASE_URL } from '../config';

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

/**
 * Fetches the list of available models from the Ollama server.
 * @returns A promise that resolves with an array of model names as strings, or rejects with an error.
 */
export const listModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
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

// Interface for the request body to generate a completion.
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      await reader.cancel('Stream reading was aborted.');
      break;
    }

    try {
      const { value, done } = await reader.read();
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
    } catch (error) {
      if (signal?.aborted) {
        // This is an expected error when the stream is aborted.
        console.log('Stream reading aborted as requested.');
      } else {
        console.error('Error reading from stream:', error);
      }
      break;
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
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
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
  generateCompletion,
};

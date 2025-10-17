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
 * Generates a text completion for a given prompt and model.
 * This function supports streaming and non-streaming responses.
 * @param request The request payload including the model and prompt.
 * @param onStream A callback function to handle each chunk of a streamed response.
 * @returns A promise that resolves with the final response, or void for streamed responses.
 */
export const generateCompletion = async (
  request: GenerateRequest,
  onStream?: (chunk: GenerateResponse) => void
): Promise<string | void> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: request.stream ?? !!onStream }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    if (onStream) {
      // Handle streaming responses
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // The API returns a JSON object per line.
        // We need to split the string by newlines to parse each object.
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          const data: GenerateResponse = JSON.parse(line);
          accumulatedResponse += data.response;
          if (onStream) {
            onStream(data);
          }
        }
      }
      return accumulatedResponse;
    } else {
      // Handle non-streaming response
      const data: GenerateResponse = await response.json();
      return data.response;
    }
  } catch (error) {
    console.error('Error generating completion:', error);
    throw error;
  }
};

// Export the service object for easy importing
export const ollamaService = {
  listModels,
  generateCompletion,
};

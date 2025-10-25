/**
 * Centralized error handling utilities for the application
 */

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

export interface ErrorDisplayProps {
  error: string | AppError;
  className?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * Creates a standardized error object
 */
export const createError = (message: string, code?: string, details?: unknown): AppError => ({
  message,
  code,
  details,
  timestamp: new Date().toISOString(),
});

/**
 * Extracts error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unexpected error occurred';
};

/**
 * Checks if an error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('connection') ||
         message.includes('timeout');
};

/**
 * Checks if an error is a server error (5xx)
 */
export const isServerError = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status);
    return status >= 500 && status < 600;
  }
  return false;
};

/**
 * Checks if an error is a client error (4xx)
 */
export const isClientError = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status);
    return status >= 400 && status < 500;
  }
  return false;
};

/**
 * Logs error to console with additional context
 */
export const logError = (error: unknown, context?: string): void => {
  const message = getErrorMessage(error);
  const logMessage = context ? `[${context}] ${message}` : message;
  
  console.error(logMessage, error);
};

/**
 * Handles API errors consistently
 */
export const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `API call failed with status: ${response.status}`;
  
  try {
    const errorData = await response.json();
    if (errorData.message) {
      errorMessage = errorData.message;
    } else if (errorData.error) {
      errorMessage = errorData.error;
    }
  } catch {
    // If we can't parse the error response, use the default message
  }
  
  const error = new Error(errorMessage);
  (error as any).status = response.status;
  throw error;
};

/**
 * Wraps async functions with error handling
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error;
    }
  };
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry on client errors (4xx)
      if (isClientError(error)) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

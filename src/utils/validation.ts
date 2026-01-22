// Validation utilities for frontend data

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates agent temperature value
 * @param temperature - The temperature value to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateTemperature = (temperature: number | undefined): ValidationResult => {
  if (temperature === undefined || temperature === null) {
    return { isValid: true }; // Temperature is optional
  }
  
  if (typeof temperature !== 'number') {
    return { isValid: false, error: 'Temperature must be a number' };
  }
  
  if (temperature < 0 || temperature > 1) {
    return { isValid: false, error: 'Temperature must be between 0 and 1' };
  }
  
  return { isValid: true };
};

/**
 * Validates agent name
 * @param name - The agent name to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateAgentName = (name: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Agent name cannot be empty' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Agent name must be 100 characters or less' };
  }
  
  // Check for spaces
  if (trimmedName.includes(' ')) {
    return { isValid: false, error: 'Agent name cannot contain spaces' };
  }
  
  // Validate Python variable name format: must start with letter or underscore, followed by letters, digits, or underscores
  const pythonVariableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!pythonVariableNameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Agent name must be a valid Python variable name (letters, digits, underscores; must start with letter or underscore)' };
  }
  
  return { isValid: true };
};

/**
 * Validates agent prompt
 * @param prompt - The agent prompt to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateAgentPrompt = (prompt: string): ValidationResult => {
  if (!prompt || !prompt.trim()) {
    return { isValid: false, error: 'Agent prompt cannot be empty' };
  }
  
  if (prompt.trim().length > 10000) {
    return { isValid: false, error: 'Agent prompt must be 10,000 characters or less' };
  }
  
  return { isValid: true };
};

/**
 * Validates task prompt
 * @param prompt - The task prompt to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateTaskPrompt = (prompt: string): ValidationResult => {
  if (!prompt || !prompt.trim()) {
    return { isValid: false, error: 'Task prompt cannot be empty' };
  }
  
  if (prompt.trim().length > 10000) {
    return { isValid: false, error: 'Task prompt must be 10,000 characters or less' };
  }
  
  return { isValid: true };
};

/**
 * Validates experiment iterations
 * @param iterations - The number of iterations to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export const validateIterations = (iterations: number): ValidationResult => {
  if (!Number.isInteger(iterations)) {
    return { isValid: false, error: 'Iterations must be a whole number' };
  }
  
  if (iterations < 1) {
    return { isValid: false, error: 'Iterations must be at least 1' };
  }
  
  if (iterations > 100) {
    return { isValid: false, error: 'Iterations must be 100 or less' };
  }
  
  return { isValid: true };
};

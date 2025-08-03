// Type definitions for the LLaMa-Herd application

export interface Agent {
  id: string;
  name: string;
  prompt: string;
  color: string;
}

export interface Task {
  id: string;
  prompt: string;
}

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
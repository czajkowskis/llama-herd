// Type definitions for the LLaMa-Herd application

export interface ChatRules {
  maxRounds: number;
  teamType: 'round_robin' | 'selector';
  selectorPrompt?: string;
  allowRepeatSpeaker?: boolean;
  maxConsecutiveAutoReply?: number;
  terminationCondition?: string;
}

export interface Agent {
  id: string;
  name: string;
  prompt: string;
  color: string;
  model: string;
  temperature?: number;
}

export interface Task {
  id: string;
  prompt: string;
  datasetItems?: { task: string; answer: string }[];
  expectedSolutionRegex?: string;
  iterations?: number;
}

export interface ConversationAgent {
  id: string;
  name: string;
  color: string;
  originalName?: string;
  model: string;
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  agents: ConversationAgent[];
  messages: Message[];
  createdAt: string;
  experiment_id?: string;
  iteration?: number;
}

export interface ExperimentStatusResponse {
  experiment_id: string;
  status: string;
  conversation: Conversation | null; // current conversation stream (null for completed experiments)
  conversations?: Conversation[]; // completed runs/items
  iterations?: number;
  current_iteration?: number;
  error?: string;
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
import { API_BASE_URL, buildWebSocketUrl } from '../config';
import { Agent, Task, ExperimentStatusResponse } from '../types/index.d';

export interface ExperimentRequest {
  task: Task;
  agents: Agent[];
}

export interface ExperimentResponse {
  experiment_id: string;
  status: string;
  websocket_url: string;
}

export interface ExperimentStatus {
  experiment_id: string;
  status: string;
  conversation: any;
  error?: string;
}

export interface ExperimentListResponse {
  experiments: Array<{
    experiment_id: string;
    title: string;
    status: string;
    created_at: string;
    agent_count: number;
    message_count: number;
  }>;
}

export interface WebSocketMessage {
  type: 'message' | 'status' | 'error' | 'conversation' | 'agents';
  data: any;
}

class ExperimentService {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];

  async startExperiment(task: Task, agents: Agent[], iterations: number = 1): Promise<ExperimentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/experiments/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, agents, iterations }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start experiment: ${response.statusText}`);
    }

    return response.json();
  }

  async getExperiment(experimentId: string): Promise<ExperimentStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/experiments/${experimentId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get experiment: ${response.statusText}`);
    }

    return response.json();
  }

  async listExperiments(): Promise<ExperimentListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/experiments`);
    
    if (!response.ok) {
      throw new Error(`Failed to list experiments: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteExperiment(experimentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/experiments/${experimentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete experiment: ${response.statusText}`);
    }
  }

  connectToExperiment(experimentId: string, onMessage: (message: WebSocketMessage) => void): void {
    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
    }

    // Store the message handler
    this.messageHandlers.push(onMessage);

    // Create WebSocket connection
    const wsUrl = buildWebSocketUrl(`/ws/experiments/${experimentId}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected to experiment');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        // Call all registered message handlers
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers = [];
  }

  removeMessageHandler(handler: (message: WebSocketMessage) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }
}

export const experimentService = new ExperimentService(); 
import { API_BASE_URL, buildWebSocketUrl } from '../config';
import { Agent, Task, ExperimentStatusResponse, ChatRules } from '../types/index.d';
import ReconnectingWebSocket from './ReconnectingWebSocket';
import { WebSocketMessage } from '../types/api';

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

class ExperimentService {
  // Map of experimentId -> ReconnectingWebSocket instance
  private connections: Map<string, ReconnectingWebSocket> = new Map();

  async startExperiment(task: Task, agents: Agent[], iterations: number = 1, chatRules?: any): Promise<ExperimentResponse> {
    const requestBody: any = { task, agents, iterations };
    if (chatRules) {
      // Transform camelCase frontend fields to snake_case backend fields
      requestBody.chat_rules = {
        max_rounds: chatRules.maxRounds,
        team_type: chatRules.teamType,
        selector_prompt: chatRules.selectorPrompt
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/experiments/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

  /**
   * Subscribe to experiment websocket messages. Returns an unsubscribe function.
   */
  connectToExperiment(
    experimentId: string,
    onMessage: (message: WebSocketMessage) => void
  ): () => void {
    let conn = this.connections.get(experimentId);
    const wsUrl = buildWebSocketUrl(`/ws/experiments/${experimentId}`);

    if (!conn) {
      conn = new ReconnectingWebSocket(wsUrl, {
        initialBackoffMs: 500,
        maxBackoffMs: 30000,
        heartbeatIntervalMs: 10000,
        heartbeatPayload: JSON.stringify({ type: 'ping' }),
        idleTimeoutMs: 60000,
      });
      conn.start();
      this.connections.set(experimentId, conn);
    }

    const unsubscribe = conn.subscribe(onMessage);

    return () => {
      unsubscribe();
      // If no subscribers remain, the wrapper will close after its idle timeout (or immediately).
      // Clean up the map entry if the connection has been closed.
      // Note: we don't have direct API to check subscribers count; rely on idle close to free resources.
    };
  }

  /**
   * Close all open connections and clear subscriptions. Useful for app shutdown.
   */
  disconnect(): void {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
  }

  // Optional: expose connection state for an experimentId
  getConnectionState(experimentId: string): string | null {
    const conn = this.connections.get(experimentId);
    return conn ? conn.getState() : null;
  }
}

export const experimentService = new ExperimentService();

export const getDefaultChatRules = async (): Promise<ChatRules> => {
  const response = await fetch(`${API_BASE_URL}/api/experiments/default-chat-rules`);
  if (!response.ok) {
    // Fallback to sensible defaults on failure
    console.error('Failed to fetch default chat rules. Using fallback.');
    return { 
      maxRounds: 8, 
      teamType: 'round_robin',
      selectorPrompt: "Available roles:\n{roles}\n\nCurrent conversation history:\n{history}\n\nPlease select the most appropriate agent for the next message."
    };
  }
  return response.json();
}; 
// Centralized WebSocket / API message types
export interface WebSocketMessage {
  type: 'message' | 'status' | 'error' | 'conversation' | 'agents';
  data: unknown;
}

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'completed';

// Type guards for WebSocket message data
export function isMessageData(data: unknown): data is { id: string; agentId: string; content: string; timestamp: string; model?: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'agentId' in data &&
    'content' in data &&
    'timestamp' in data
  );
}

export function isStatusData(data: unknown): data is { experiment_id: string; status: string; current_iteration?: number; error?: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'experiment_id' in data &&
    'status' in data
  );
}

export function isConversationData(data: unknown): data is { id: string; title: string; agents: unknown[]; messages: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'title' in data &&
    'agents' in data &&
    'messages' in data
  );
}

// Centralized WebSocket / API message types
export type WebSocketMessage = {
  type: 'message' | 'status' | 'error' | 'conversation' | 'agents';
  data: any;
};

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

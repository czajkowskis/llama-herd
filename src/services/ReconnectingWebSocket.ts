import { WebSocketMessage, ConnectionState, isStatusData } from '../types/api';

type Subscriber = (msg: WebSocketMessage) => void;
type StateChangeListener = (state: ConnectionState, reconnectAttempts: number, nextReconnectDelay: number) => void;

export interface ReconnectingWebSocketOptions {
  maxReconnectAttempts?: number; // undefined = infinite
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  heartbeatIntervalMs?: number; // send ping every N ms
  heartbeatPayload?: string;
  idleTimeoutMs?: number; // close socket after no subscribers for this many ms (optional)
}

export class ReconnectingWebSocket {
  private url: string;
  private opts: ReconnectingWebSocketOptions;
  private ws: WebSocket | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  private reconnectAttempts = 0;
  private shouldStop = false;
  // When the server sends a terminal final status with close_connection=true,
  // mark the socket as terminally closed to prevent any further retries —
  // this enforces the contract that completed experiments cannot be reconnected.
  private terminalClosed = false;
  private heartbeatTimer: number | null = null;
  private idleTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private nextReconnectDelay = 0;
  private state: ConnectionState = 'disconnected';

  constructor(url: string, opts?: ReconnectingWebSocketOptions) {
    this.url = url;
    this.opts = {
      initialBackoffMs: 500,
      maxBackoffMs: 30_000,
      heartbeatIntervalMs: 10_000,
      heartbeatPayload: JSON.stringify({ type: 'ping' }),
      idleTimeoutMs: 60_000,
      ...opts,
    };
  }

  start() {
    // Do not start if we've been informed server-side that the experiment is final
    if (this.terminalClosed) {
      console.warn('Socket marked terminally closed; will not start/reconnect')
      // Notify listeners that the connection is completed
      this.setState('completed');
      return;
    }
    this.shouldStop = false;
    this.open();
  }

  private open() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }

    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
      this.setState('reconnecting');
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private setState(s: ConnectionState) {
    this.state = s;
    this.notifyStateListeners();
  }

  private notifyStateListeners() {
    this.stateListeners.forEach(listener => {
      try {
        listener(this.state, this.reconnectAttempts, Math.ceil(this.nextReconnectDelay / 1000));
      } catch (e) {
        console.error('State listener threw:', e);
      }
    });
  }

  private onOpen() {
    this.reconnectAttempts = 0;
    this.setState('connected');
    this.startHeartbeat();
  }

  private onMessage(evt: MessageEvent) {
    const text = typeof evt.data === 'string' ? evt.data : null;
    if (!text) return;
    try {
      const msg = JSON.parse(text) as WebSocketMessage;
      // If server signals a terminal final status, stop reconnecting
      if (msg.type === 'status' && isStatusData(msg.data)) {
        const statusData = msg.data as unknown as { final?: boolean; close_connection?: boolean };
        if (statusData.final === true && statusData.close_connection === true) {
          // Prevent further reconnects and close socket. Mark terminalClosed so
          // manual retry attempts are also blocked.
          this.shouldStop = true;
          this.terminalClosed = true;
          try {
            if (this.ws) this.ws.close();
          } catch (e) {
            // ignore
          }
        }
      }
      // deliver to subscribers
      this.subscribers.forEach(s => {
        try {
          s(msg);
        } catch (e) {
          console.error('Subscriber threw:', e);
        }
      });
    } catch (err) {
      console.error('Failed to parse WS message', err, text);
    }
  }

  private onClose(event: CloseEvent) {
    this.stopHeartbeat();
    
    // If server indicated a terminal close OR normal close (code 1000), mark as completed
    // WebSocket code 1000 = normal closure, no need to reconnect
    if (this.terminalClosed || event.code === 1000) {
      this.setState('completed');
      this.shouldStop = true;
    } else {
      this.setState('disconnected');
      if (!this.shouldStop) {
        this.scheduleReconnect();
      }
    }
  }

  private onError() {
    // Let onclose handle reconnect
  }

  private scheduleReconnect() {
    if (this.opts.maxReconnectAttempts !== undefined && this.reconnectAttempts >= this.opts.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached');
      this.setState('disconnected');
      return;
    }
    this.reconnectAttempts += 1;
    this.nextReconnectDelay = Math.min(
      this.opts.initialBackoffMs! * Math.pow(2, this.reconnectAttempts - 1),
      this.opts.maxBackoffMs!
    );
    this.setState('reconnecting');
    this.notifyStateListeners(); // Notify with current reconnect delay
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      if (!this.shouldStop) this.open();
    }, this.nextReconnectDelay);
  }

  subscribe(handler: Subscriber): () => void {
    this.subscribers.add(handler);
    // If we have a pending idleTimer to close due to no subscribers, cancel it
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    // ensure socket started
    if (!this.ws) this.start();

    return () => {
      this.subscribers.delete(handler);
      // if no more subscribers, optionally close after idle timeout
      if (this.subscribers.size === 0) {
        if (this.opts.idleTimeoutMs && this.opts.idleTimeoutMs > 0) {
          this.idleTimer = window.setTimeout(() => {
            this.close();
          }, this.opts.idleTimeoutMs);
        } else {
          this.close();
        }
      }
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (!this.opts.heartbeatIntervalMs) return;
    this.heartbeatTimer = window.setInterval(() => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(this.opts.heartbeatPayload as string);
        }
      } catch (e) {
        // ignored
      }
    }, this.opts.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  close() {
    this.shouldStop = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    // if we closed due to terminal, set completed state; otherwise disconnected
    if (this.terminalClosed) {
      this.setState('completed');
    } else {
      this.setState('disconnected');
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getNextReconnectDelay(): number {
    return Math.ceil(this.nextReconnectDelay / 1000);
  }

  getMaxReconnectAttempts(): number | undefined {
    return this.opts.maxReconnectAttempts;
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    // Call immediately with current state
    listener(this.state, this.reconnectAttempts, Math.ceil(this.nextReconnectDelay / 1000));
    
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  retry() {
    if (this.terminalClosed) {
      console.warn('Socket marked terminally closed; manual retry disabled')
      this.setState('completed');
      return;
    }

    if (this.state === 'disconnected') {
      this.reconnectAttempts = 0;
      this.shouldStop = false;
      this.open();
    }
  }
}

export default ReconnectingWebSocket;

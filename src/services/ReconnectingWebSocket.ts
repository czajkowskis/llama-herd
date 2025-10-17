import { WebSocketMessage, ConnectionState } from '../types/api';

type Subscriber = (msg: WebSocketMessage) => void;

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
  private reconnectAttempts = 0;
  private shouldStop = false;
  private heartbeatTimer: number | null = null;
  private idleTimer: number | null = null;
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
    // optionally could notify subscribers about state changes via a special message
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

  private onClose() {
    this.stopHeartbeat();
    this.setState('disconnected');
    if (!this.shouldStop) {
      this.scheduleReconnect();
    }
  }

  private onError() {
    // Let onclose handle reconnect
  }

  private scheduleReconnect() {
    if (this.opts.maxReconnectAttempts !== undefined && this.reconnectAttempts >= this.opts.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached');
      return;
    }
    this.reconnectAttempts += 1;
    const backoff = Math.min(
      this.opts.initialBackoffMs! * Math.pow(2, this.reconnectAttempts - 1),
      this.opts.maxBackoffMs!
    );
    setTimeout(() => {
      if (!this.shouldStop) this.open();
    }, backoff);
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
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
  }

  getState(): ConnectionState {
    return this.state;
  }
}

export default ReconnectingWebSocket;

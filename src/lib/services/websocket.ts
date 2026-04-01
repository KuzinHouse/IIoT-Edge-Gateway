/**
 * WebSocket Service - Manages WebSocket connections with reconnection, heartbeat, and message handling
 */

export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatMessage?: unknown;
  protocols?: string | string[];
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (data: unknown) => void;
  onStateChange?: (state: ConnectionState) => void;
  onReconnectAttempt?: (attempt: number) => void;
  onMaxReconnectAttemptsReached?: () => void;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<Omit<WebSocketConfig, 'protocols'>> & { protocols?: string | string[] };
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private messageQueue: unknown[] = [];
  private subscribers = new Map<string, Set<(data: unknown) => void>>();

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatMessage: config.heartbeatMessage ?? { type: 'ping' },
      protocols: config.protocols,
      onOpen: config.onOpen ?? (() => {}),
      onClose: config.onClose ?? (() => {}),
      onError: config.onError ?? (() => {}),
      onMessage: config.onMessage ?? (() => {}),
      onStateChange: config.onStateChange ?? (() => {}),
      onReconnectAttempt: config.onReconnectAttempt ?? (() => {}),
      onMaxReconnectAttemptsReached: config.onMaxReconnectAttemptsReached ?? (() => {}),
    };
  }

  // Get current state
  getState(): ConnectionState {
    return this.state;
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Set state and notify
  private setState(state: ConnectionState): void {
    this.state = state;
    this.config.onStateChange(state);
  }

  // Connect to WebSocket
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    try {
      this.ws = this.config.protocols
        ? new WebSocket(this.config.url, this.config.protocols)
        : new WebSocket(this.config.url);

      this.ws.onopen = (event: Event) => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushMessageQueue();
        this.config.onOpen(event);
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.stopHeartbeat();
        this.config.onClose(event);

        if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.setState('error');
          this.config.onMaxReconnectAttemptsReached();
        } else {
          this.setState('disconnected');
        }
      };

      this.ws.onerror = (event: Event) => {
        this.setState('error');
        this.config.onError(event);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong response
          if (data.type === 'pong') {
            return;
          }

          // Process message
          this.config.onMessage(data);

          // Notify subscribers
          const messageType = data.type as string;
          const subscribers = this.subscribers.get(messageType);
          if (subscribers) {
            subscribers.forEach(callback => callback(data));
          }

          // Notify wildcard subscribers
          const wildcardSubscribers = this.subscribers.get('*');
          if (wildcardSubscribers) {
            wildcardSubscribers.forEach(callback => callback(data));
          }
        } catch (error) {
          console.error('[WebSocketService] Failed to parse message:', error);
        }
      };
    } catch (error) {
      this.setState('error');
      console.error('[WebSocketService] Connection error:', error);
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.setState('disconnecting');
    this.stopHeartbeat();
    this.cancelReconnect();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  // Reconnect to WebSocket
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.config.onReconnectAttempt(this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval * this.reconnectAttempts);
  }

  // Cancel reconnection
  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Start heartbeat
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimeout = setInterval(() => {
      if (this.isConnected()) {
        this.send(this.config.heartbeatMessage);
      }
    }, this.config.heartbeatInterval);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // Send message
  send(data: unknown): boolean {
    if (!this.isConnected()) {
      this.messageQueue.push(data);
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws!.send(message);
      return true;
    } catch (error) {
      console.error('[WebSocketService] Send error:', error);
      return false;
    }
  }

  // Flush message queue
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // Subscribe to message type
  subscribe(type: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }

    this.subscribers.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(type);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(type);
        }
      }
    };
  }

  // Subscribe to all messages
  subscribeAll(callback: (data: unknown) => void): () => void {
    return this.subscribe('*', callback);
  }

  // Clear all subscriptions
  clearSubscriptions(): void {
    this.subscribers.clear();
  }

  // Get connection statistics
  getStats(): {
    state: ConnectionState;
    reconnectAttempts: number;
    queuedMessages: number;
    subscriberCount: number;
  } {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      subscriberCount: Array.from(this.subscribers.values()).reduce(
        (total, set) => total + set.size,
        0
      ),
    };
  }
}

// Factory function to create WebSocket service
export function createWebSocketService(config: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
}

// Singleton instance for the main WebSocket connection
let mainWebSocketInstance: WebSocketService | null = null;

export function getMainWebSocket(): WebSocketService | null {
  return mainWebSocketInstance;
}

export function initializeMainWebSocket(config: Omit<WebSocketConfig, 'url'> & { url?: string }): WebSocketService {
  const defaultUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:8080';
  
  if (mainWebSocketInstance) {
    mainWebSocketInstance.disconnect();
  }

  mainWebSocketInstance = new WebSocketService({
    ...config,
    url: config.url || `${defaultUrl}/ws/live`,
  });

  return mainWebSocketInstance;
}

export default WebSocketService;

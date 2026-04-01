'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

export interface WebSocketMessage {
  type: 'device_discovered' | 'device_updated' | 'device_offline' | 'tag_update' | 'mqtt_status' | 'log' | 'connection_status' | 'alarm';
  payload: unknown;
  timestamp: number;
}

export interface UseWebSocketOptions {
  enabled?: boolean;
  url?: string;
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  messages: WebSocketMessage[];
  reconnect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
  connectionCount: number;
  lastConnected: Date | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    enabled = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connectionCount, setConnectionCount] = useState(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionInProgressRef = useRef(false);
  const optionsRef = useRef(options);
  const connectRef = useRef<() => void>(() => {});
  const maxMessages = 100;

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, clearHeartbeat]);

  // Connect function
  useEffect(() => {
    connectRef.current = () => {
      if (!enabled || wsRef.current?.readyState === WebSocket.OPEN || connectionInProgressRef.current) {
        return;
      }

      connectionInProgressRef.current = true;
      setIsConnecting(true);
      setError(null);

      try {
        const ws = apiClient.createWebSocket(
          (data) => {
            const message = data as WebSocketMessage;
            setLastMessage(message);
            setMessages(prev => [...prev.slice(-maxMessages + 1), message]);
            optionsRef.current.onMessage?.(message);
          },
          (err) => {
            setError('WebSocket connection error');
            optionsRef.current.onError?.(err);
          }
        );

        if (ws) {
          ws.onopen = () => {
            connectionInProgressRef.current = false;
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
            setConnectionCount(prev => prev + 1);
            setLastConnected(new Date());
            reconnectAttemptsRef.current = 0;
            startHeartbeat();
            optionsRef.current.onConnect?.();
          };

          ws.onclose = () => {
            connectionInProgressRef.current = false;
            setIsConnected(false);
            setIsConnecting(false);
            clearHeartbeat();
            optionsRef.current.onDisconnect?.();

            if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              reconnectTimeoutRef.current = setTimeout(() => {
                connectRef.current();
              }, reconnectInterval);
            } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
              setError('Max reconnection attempts reached');
            }
          };

          ws.onerror = () => {
            connectionInProgressRef.current = false;
            setError('WebSocket error');
            setIsConnecting(false);
          };

          wsRef.current = ws;
        } else {
          connectionInProgressRef.current = false;
          setIsConnecting(false);
        }
      } catch (err) {
        connectionInProgressRef.current = false;
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnecting(false);
      }
    };
  }, [enabled, reconnectInterval, maxReconnectAttempts, startHeartbeat, clearHeartbeat]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    clearHeartbeat();
    reconnectAttemptsRef.current = maxReconnectAttempts;
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearReconnectTimeout, clearHeartbeat, maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setError(null);
    setTimeout(() => connectRef.current(), 100);
  }, [disconnect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(() => connectRef.current(), 0);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }
    return () => {
      disconnect();
    };
  }, [enabled, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    messages,
    reconnect,
    disconnect,
    clearMessages,
    connectionCount,
    lastConnected,
  };
}

export default useWebSocket;

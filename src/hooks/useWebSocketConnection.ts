'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

export interface WebSocketMessage {
  type: 'device_discovered' | 'device_updated' | 'device_offline' | 'tag_update' | 'mqtt_status' | 'log' | 'connection_status';
  payload: unknown;
  timestamp: number;
}

export interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocketConnection(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    enabled = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionInProgressRef = useRef(false);
  
  // Store all options in a ref to avoid dependency issues
  const optionsRef = useRef({
    enabled,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval,
    maxReconnectAttempts,
  });
  
  // Store the connect function in a ref to allow recursive calls
  const connectRef = useRef<() => void>(() => {});
  
  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = {
      enabled,
      onMessage,
      onConnect,
      onDisconnect,
      onError,
      reconnectInterval,
      maxReconnectAttempts,
    };
  }, [enabled, onMessage, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Define the connect function and store in ref
  useEffect(() => {
    connectRef.current = () => {
      const opts = optionsRef.current;
      
      if (!opts.enabled || wsRef.current?.readyState === WebSocket.OPEN || connectionInProgressRef.current) {
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
            opts.onMessage?.(message);
          },
          (err) => {
            setError('WebSocket connection error');
            opts.onError?.(err);
          }
        );

        if (ws) {
          ws.onopen = () => {
            connectionInProgressRef.current = false;
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
            reconnectAttemptsRef.current = 0;
            opts.onConnect?.();
          };

          ws.onclose = () => {
            connectionInProgressRef.current = false;
            setIsConnected(false);
            setIsConnecting(false);
            opts.onDisconnect?.();

            // Auto-reconnect using the ref
            if (opts.enabled && reconnectAttemptsRef.current < opts.maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              reconnectTimeoutRef.current = setTimeout(() => {
                connectRef.current();
              }, opts.reconnectInterval);
            } else if (reconnectAttemptsRef.current >= opts.maxReconnectAttempts) {
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
  }, []); // No dependencies - uses ref for all values

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    reconnectAttemptsRef.current = optionsRef.current.maxReconnectAttempts; // Prevent auto-reconnect
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setError(null);
    setTimeout(() => connectRef.current(), 100);
  }, [disconnect]);

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
    reconnect,
    disconnect,
  };
}

// Hook for backend health status
export function useBackendStatus(pollInterval: number = 10000) {
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const checkHealth = async () => {
      try {
        const result = await apiClient.healthCheck();
        const isOnline = result.status === 'ok' || result.status === 'healthy';
        if (mounted) {
          setIsBackendOnline(isOnline);
          setLastCheck(new Date());
        }
      } catch {
        if (mounted) {
          setIsBackendOnline(false);
          setLastCheck(new Date());
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, pollInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollInterval]);

  return { isBackendOnline, lastCheck };
}

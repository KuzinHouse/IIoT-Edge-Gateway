import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionInfo } from '@/types/modbus';

interface UseConnectionsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useConnections(options: UseConnectionsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 5000 } = options;
  
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchConnections = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/connections', {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  }, []);

  const createConnection = useCallback(async (connection: Partial<ConnectionInfo>) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create connection');
      }
      
      await fetchConnections();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create connection');
    }
  }, [fetchConnections]);

  const deleteConnection = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/connections/${name}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setConnections(prev => prev.filter(c => c.name !== name));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete connection');
    }
  }, []);

  const connect = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/connections/${name}/connect`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchConnections();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to connect');
    }
  }, [fetchConnections]);

  const disconnect = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/connections/${name}/disconnect`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchConnections();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to disconnect');
    }
  }, [fetchConnections]);

  const getDiagnostics = useCallback(async (name: string) => {
    try {
      const response = await fetch(`/api/connections/${name}/diagnostics`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to get diagnostics');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchConnections, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchConnections]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Statistics
  const stats = {
    total: connections.length,
    connected: connections.filter(c => c.status === 'connected').length,
    disconnected: connections.filter(c => c.status === 'disconnected').length,
    error: connections.filter(c => c.status === 'error').length,
  };

  return {
    connections,
    loading,
    error,
    stats,
    refresh: fetchConnections,
    createConnection,
    deleteConnection,
    connect,
    disconnect,
    getDiagnostics,
  };
}

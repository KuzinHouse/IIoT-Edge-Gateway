import { useState, useEffect, useCallback, useRef } from 'react';
import type { Device } from '@/types/modbus';

interface UseDevicesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDevices(options: UseDevicesOptions = {}) {
  const { autoRefresh = true, refreshInterval = 5000 } = options;
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDevices = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/devices', {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchDevices(true);
  }, [fetchDevices]);

  const addDevice = useCallback(async (device: Partial<Device>) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(device),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newDevice = await response.json();
      setDevices(prev => [...prev, newDevice]);
      return newDevice;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add device');
    }
  }, []);

  const updateDevice = useCallback(async (id: string, updates: Partial<Device>) => {
    try {
      const response = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedDevice = await response.json();
      setDevices(prev => prev.map(d => d.id === id ? updatedDevice : d));
      return updatedDevice;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update device');
    }
  }, []);

  const deleteDevice = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete device');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDevices(true);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDevices]);

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
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    error: devices.filter(d => d.status === 'error').length,
  };

  return {
    devices,
    loading,
    error,
    refreshing,
    stats,
    refresh,
    addDevice,
    updateDevice,
    deleteDevice,
  };
}

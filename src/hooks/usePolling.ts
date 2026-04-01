'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PollingOptions<T> {
  fetchFn: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retries?: number;
  retryDelay?: number;
}

export interface PollingState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastFetched: Date | null;
  pollCount: number;
  errorCount: number;
}

export interface UsePollingReturn<T> extends PollingState<T> {
  refresh: () => Promise<void>;
  start: () => void;
  stop: () => void;
  isPolling: boolean;
  reset: () => void;
}

export function usePolling<T>(options: PollingOptions<T>): UsePollingReturn<T> {
  const {
    fetchFn,
    interval = 5000,
    enabled = true,
    immediate = true,
    onSuccess,
    onError,
    retries = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<PollingState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastFetched: null,
    pollCount: 0,
    errorCount: 0,
  });

  const [isPolling, setIsPolling] = useState(enabled);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const executeFetch = useCallback(async () => {
    if (fetchingRef.current || !mountedRef.current) return;
    
    fetchingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await fetchFn();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null,
          lastFetched: new Date(),
          pollCount: prev.pollCount + 1,
        }));
        retryCountRef.current = 0;
        onSuccess?.(data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
          errorCount: prev.errorCount + 1,
        }));
        onError?.(error);

        // Retry logic
        if (retryCountRef.current < retries) {
          retryCountRef.current++;
          setTimeout(() => {
            if (mountedRef.current && isPolling) {
              executeFetch();
            }
          }, retryDelay);
        }
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchFn, onSuccess, onError, retries, retryDelay, isPolling]);

  const refresh = useCallback(async () => {
    await executeFetch();
  }, [executeFetch]);

  const start = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stop = useCallback(() => {
    setIsPolling(false);
    clearPolling();
  }, [clearPolling]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      lastFetched: null,
      pollCount: 0,
      errorCount: 0,
    });
    retryCountRef.current = 0;
  }, []);

  // Handle polling
  useEffect(() => {
    mountedRef.current = true;

    if (isPolling && interval > 0) {
      if (immediate) {
        executeFetch();
      }
      
      intervalRef.current = setInterval(executeFetch, interval);
    }

    return () => {
      mountedRef.current = false;
      clearPolling();
    };
  }, [isPolling, interval, immediate, executeFetch, clearPolling]);

  return {
    ...state,
    refresh,
    start,
    stop,
    isPolling,
    reset,
  };
}

// Hook for multiple polling tasks
export interface PollingTask {
  id: string;
  name: string;
  interval: number;
  lastRun: Date | null;
  nextRun: Date | null;
  isActive: boolean;
}

export interface UseMultiPollingOptions {
  tasks: Array<{
    id: string;
    name: string;
    interval: number;
    fetchFn: () => Promise<void>;
  }>;
  enabled?: boolean;
}

export interface UseMultiPollingReturn {
  tasks: PollingTask[];
  startTask: (id: string) => void;
  stopTask: (id: string) => void;
  stopAll: () => void;
  startAll: () => void;
  runTask: (id: string) => Promise<void>;
}

export function useMultiPolling(options: UseMultiPollingOptions): UseMultiPollingReturn {
  const { tasks: taskConfigs, enabled = true } = options;

  const [tasks, setTasks] = useState<PollingTask[]>(() =>
    taskConfigs.map(t => ({
      id: t.id,
      name: t.name,
      interval: t.interval,
      lastRun: null,
      nextRun: null,
      isActive: enabled,
    }))
  );

  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const taskConfigsRef = useRef(taskConfigs);

  useEffect(() => {
    taskConfigsRef.current = taskConfigs;
  }, [taskConfigs]);

  const runTask = useCallback(async (id: string) => {
    const taskConfig = taskConfigsRef.current.find(t => t.id === id);
    if (!taskConfig) return;

    try {
      await taskConfig.fetchFn();
      setTasks(prev => prev.map(t =>
        t.id === id
          ? { ...t, lastRun: new Date(), nextRun: new Date(Date.now() + t.interval) }
          : t
      ));
    } catch (err) {
      console.error(`[useMultiPolling] Error in task ${id}:`, err);
    }
  }, []);

  const startTask = useCallback((id: string) => {
    const taskConfig = taskConfigsRef.current.find(t => t.id === id);
    if (!taskConfig) return;

    // Clear existing interval
    const existingInterval = intervalsRef.current.get(id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new interval
    const intervalId = setInterval(() => runTask(id), taskConfig.interval);
    intervalsRef.current.set(id, intervalId);

    // Run immediately
    runTask(id);

    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, isActive: true, nextRun: new Date(Date.now() + t.interval) } : t
    ));
  }, [runTask]);

  const stopTask = useCallback((id: string) => {
    const intervalId = intervalsRef.current.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      intervalsRef.current.delete(id);
    }

    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, isActive: false, nextRun: null } : t
    ));
  }, []);

  const stopAll = useCallback(() => {
    intervalsRef.current.forEach(interval => clearInterval(interval));
    intervalsRef.current.clear();
    setTasks(prev => prev.map(t => ({ ...t, isActive: false, nextRun: null })));
  }, []);

  const startAll = useCallback(() => {
    taskConfigsRef.current.forEach(task => startTask(task.id));
  }, [startTask]);

  // Auto-start if enabled
  useEffect(() => {
    if (enabled) {
      taskConfigsRef.current.forEach(task => startTask(task.id));
    }

    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, [enabled, startTask]);

  return {
    tasks,
    startTask,
    stopTask,
    stopAll,
    startAll,
    runTask,
  };
}

export default usePolling;

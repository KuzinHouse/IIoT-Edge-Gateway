'use client';

import { useState, useCallback, useEffect } from 'react';

export interface UseLocalStorageOptions<T> {
  key: string;
  initialValue: T;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  loading: boolean;
  error: Error | null;
}

export function useLocalStorage<T>({
  key,
  initialValue,
  serializer = JSON.stringify,
  deserializer = JSON.parse,
}: UseLocalStorageOptions<T>): UseLocalStorageReturn<T> {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(deserializer(item));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load from localStorage'));
      console.error(`[useLocalStorage] Error loading key "${key}":`, err);
    } finally {
      setLoading(false);
    }
  }, [key, deserializer]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setError(null);
      setStoredValue(prev => {
        const newValue = value instanceof Function ? value(prev) : value;
        localStorage.setItem(key, serializer(newValue));
        return newValue;
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save to localStorage'));
      console.error(`[useLocalStorage] Error saving key "${key}":`, err);
    }
  }, [key, serializer]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove from localStorage'));
      console.error(`[useLocalStorage] Error removing key "${key}":`, err);
    }
  }, [key, initialValue]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    loading,
    error,
  };
}

// Hook for multiple localStorage values
export interface StorageItem<T> {
  key: string;
  value: T;
  set: (value: T) => void;
  remove: () => void;
}

export interface UseMultiLocalStorageOptions {
  keys: string[];
}

export function useMultiLocalStorage(options: UseMultiLocalStorageOptions): {
  getItem: <T>(key: string, defaultValue: T) => T;
  setItem: <T>(key: string, value: T) => void;
  removeItem: (key: string) => void;
  clearAll: () => void;
  hasItem: (key: string) => boolean;
} {
  const { keys } = options;

  const getItem = useCallback(<T,>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);

  const setItem = useCallback(<T,>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[useMultiLocalStorage] Error setting key "${key}":`, err);
    }
  }, []);

  const removeItem = useCallback((key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[useMultiLocalStorage] Error removing key "${key}":`, err);
    }
  }, []);

  const clearAll = useCallback((): void => {
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error(`[useMultiLocalStorage] Error removing key "${key}":`, err);
      }
    });
  }, [keys]);

  const hasItem = useCallback((key: string): boolean => {
    return localStorage.getItem(key) !== null;
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
    clearAll,
    hasItem,
  };
}

// Session storage variant
export interface UseSessionStorageOptions<T> {
  key: string;
  initialValue: T;
}

export function useSessionStorage<T>({
  key,
  initialValue,
}: UseSessionStorageOptions<T>): UseLocalStorageReturn<T> {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const item = sessionStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load from sessionStorage'));
    } finally {
      setLoading(false);
    }
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setError(null);
      setStoredValue(prev => {
        const newValue = value instanceof Function ? value(prev) : value;
        sessionStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save to sessionStorage'));
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove from sessionStorage'));
    }
  }, [key, initialValue]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    loading,
    error,
  };
}

export default useLocalStorage;

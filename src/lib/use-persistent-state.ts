'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'iot-gateway-';

/**
 * Persist state to localStorage across page reloads.
 * Usage: const [value, setValue] = usePersistentState('my-key', defaultValue);
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const prefixedKey = STORAGE_PREFIX + key;
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(prefixedKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch { /* ignore */ }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }, [prefixedKey, state]);

  return [state, setState];
}

/**
 * Persist an array to localStorage, supports adding/removing items.
 * Prevents duplicate entries by id field.
 */
export function usePersistentArray<T extends { id?: string }>(
  key: string,
  defaultValue: T[],
): [T[], (value: T | ((prev: T[]) => T[])) => void] {
  const [state, setState] = usePersistentState<T[]>(key, defaultValue);

  const setWithIdCheck = useCallback((value: T | ((prev: T[]) => T[])) => {
    setState(prev => {
      const next = typeof value === 'function' ? (value as (prev: T[]) => T[])(prev) : value;
      // Deduplicate by id
      const seen = new Set<string>();
      return next.filter(item => {
        if (item.id && seen.has(item.id)) return false;
        if (item.id) seen.add(item.id);
        return true;
      });
    });
  }, [setState]);

  return [state, setWithIdCheck];
}

/**
 * Load once from localStorage on mount, does not re-sync.
 */
export function useOnceFromStorage<T>(key: string, defaultValue: T): T {
  const prefixedKey = STORAGE_PREFIX + key;
  const [value] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(prefixedKey);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch { /* ignore */ }
    return defaultValue;
  });
  return value;
}

/**
 * Save a value to localStorage (imperative).
 */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch { /* ignore */ }
}

/**
 * Load a value from localStorage (imperative).
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (stored !== null) return JSON.parse(stored) as T;
  } catch { /* ignore */ }
  return defaultValue;
}

/**
 * Clear all IoT Gateway data from localStorage.
 */
export function clearAllStorage(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get all stored keys with prefix.
 */
export function getStoredKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return keys;
}

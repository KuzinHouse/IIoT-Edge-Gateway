/**
 * Storage Service - Local and session storage with JSON serialization and event handling
 */

export type StorageType = 'local' | 'session';

export interface StorageOptions {
  prefix?: string;
  serialize?: boolean;
}

export interface StorageEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  storageType: StorageType;
}

type StorageListener = (event: StorageEvent) => void;

class StorageService {
  private prefix: string;
  private serialize: boolean;
  private listeners = new Map<string, Set<StorageListener>>();

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix ?? 'app_';
    this.serialize = options.serialize ?? true;
  }

  // Get storage based on type
  private getStorage(type: StorageType): Storage {
    return type === 'session' ? sessionStorage : localStorage;
  }

  // Build key with prefix
  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // Get value from storage
  get<T>(key: string, type: StorageType = 'local'): T | null {
    try {
      const storage = this.getStorage(type);
      const fullKey = this.buildKey(key);
      const item = storage.getItem(fullKey);

      if (item === null) return null;

      if (this.serialize) {
        return JSON.parse(item) as T;
      }

      return item as unknown as T;
    } catch (error) {
      console.error(`[StorageService] Error getting key "${key}":`, error);
      return null;
    }
  }

  // Set value in storage
  set<T>(key: string, value: T, type: StorageType = 'local'): boolean {
    try {
      const storage = this.getStorage(type);
      const fullKey = this.buildKey(key);
      const oldValue = this.get(key, type);

      const serializedValue = this.serialize ? JSON.stringify(value) : String(value);
      storage.setItem(fullKey, serializedValue);

      // Emit change event
      this.emit({
        key,
        oldValue,
        newValue: value,
        storageType: type,
      });

      return true;
    } catch (error) {
      console.error(`[StorageService] Error setting key "${key}":`, error);
      return false;
    }
  }

  // Remove value from storage
  remove(key: string, type: StorageType = 'local'): boolean {
    try {
      const storage = this.getStorage(type);
      const fullKey = this.buildKey(key);
      const oldValue = this.get(key, type);

      storage.removeItem(fullKey);

      // Emit change event
      this.emit({
        key,
        oldValue,
        newValue: null,
        storageType: type,
      });

      return true;
    } catch (error) {
      console.error(`[StorageService] Error removing key "${key}":`, error);
      return false;
    }
  }

  // Check if key exists
  has(key: string, type: StorageType = 'local'): boolean {
    const storage = this.getStorage(type);
    const fullKey = this.buildKey(key);
    return storage.getItem(fullKey) !== null;
  }

  // Clear all items with prefix
  clear(type: StorageType = 'local'): void {
    const storage = this.getStorage(type);
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      storage.removeItem(key);
    });
  }

  // Clear all storage
  clearAll(): void {
    this.clear('local');
    this.clear('session');
  }

  // Get all keys with prefix
  keys(type: StorageType = 'local'): string[] {
    const storage = this.getStorage(type);
    const keys: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }

    return keys;
  }

  // Get all items as object
  getAll<T>(type: StorageType = 'local'): Record<string, T> {
    const keys = this.keys(type);
    const result: Record<string, T> = {};

    keys.forEach(key => {
      const value = this.get<T>(key, type);
      if (value !== null) {
        result[key] = value;
      }
    });

    return result;
  }

  // Subscribe to storage changes
  subscribe(key: string, listener: StorageListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key)!.add(listener);

    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // Emit change event
  private emit(event: StorageEvent): void {
    const listeners = this.listeners.get(event.key);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => listener(event));
    }
  }

  // Get storage size in bytes
  getSize(type: StorageType = 'local'): number {
    const storage = this.getStorage(type);
    let size = 0;

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = storage.getItem(key);
        size += key.length + (value?.length || 0);
      }
    }

    return size * 2; // UTF-16 characters are 2 bytes
  }

  // Export all data as JSON
  export(): string {
    return JSON.stringify({
      local: this.getAll('local'),
      session: this.getAll('session'),
    });
  }

  // Import data from JSON
  import(json: string, merge = false): boolean {
    try {
      const data = JSON.parse(json);

      if (!merge) {
        this.clearAll();
      }

      if (data.local) {
        Object.entries(data.local).forEach(([key, value]) => {
          this.set(key, value, 'local');
        });
      }

      if (data.session) {
        Object.entries(data.session).forEach(([key, value]) => {
          this.set(key, value, 'session');
        });
      }

      return true;
    } catch (error) {
      console.error('[StorageService] Import error:', error);
      return false;
    }
  }
}

// Create default instance
export const storageService = new StorageService({ prefix: 'modbus_scanner_' });

// Convenience methods
export const storage = {
  get: <T>(key: string) => storageService.get<T>(key),
  set: <T>(key: string, value: T) => storageService.set(key, value),
  remove: (key: string) => storageService.remove(key),
  has: (key: string) => storageService.has(key),
  clear: () => storageService.clear(),
  keys: () => storageService.keys(),
  getAll: <T>() => storageService.getAll<T>(),
  subscribe: (key: string, listener: StorageListener) => storageService.subscribe(key, listener),
  getSession: <T>(key: string) => storageService.get<T>(key, 'session'),
  setSession: <T>(key: string, value: T) => storageService.set(key, value, 'session'),
};

export default storageService;

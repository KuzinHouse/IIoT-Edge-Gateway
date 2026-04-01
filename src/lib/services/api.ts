/**
 * API Client Service - Comprehensive fetch wrapper with error handling, retries, and caching
 */

// Types
export interface RequestConfig extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheKey?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export interface ApiError extends Error {
  status: number;
  statusText: string;
  data?: unknown;
}

// Cache implementation
class ApiCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private defaultTTL = 60000; // 1 minute

  set(key: string, data: unknown, ttl = this.defaultTTL): void {
    this.cache.set(key, { data, timestamp: Date.now() + ttl });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Request queue for deduplication
class RequestQueue {
  private pending = new Map<string, Promise<unknown>>();

  async add<T>(key: string, request: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    const promise = request().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// API Client class
export class ApiService {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  private cache: ApiCache;
  private queue: RequestQueue;
  private interceptors: {
    request: Array<(config: RequestConfig) => RequestConfig>;
    response: Array<(response: Response) => Response | Promise<Response>>;
    error: Array<(error: ApiError) => void | Promise<void>>;
  };

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    this.cache = new ApiCache();
    this.queue = new RequestQueue();
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  // Add request interceptor
  onRequest(interceptor: (config: RequestConfig) => RequestConfig): () => void {
    this.interceptors.request.push(interceptor);
    return () => {
      const index = this.interceptors.request.indexOf(interceptor);
      if (index > -1) this.interceptors.request.splice(index, 1);
    };
  }

  // Add response interceptor
  onResponse(interceptor: (response: Response) => Response | Promise<Response>): () => void {
    this.interceptors.response.push(interceptor);
    return () => {
      const index = this.interceptors.response.indexOf(interceptor);
      if (index > -1) this.interceptors.response.splice(index, 1);
    };
  }

  // Add error interceptor
  onError(interceptor: (error: ApiError) => void | Promise<void>): () => void {
    this.interceptors.error.push(interceptor);
    return () => {
      const index = this.interceptors.error.indexOf(interceptor);
      if (index > -1) this.interceptors.error.splice(index, 1);
    };
  }

  // Set default header
  setHeader(key: string, value: string): void {
    (this.defaultHeaders as Record<string, string>)[key] = value;
  }

  // Remove default header
  removeHeader(key: string): void {
    delete (this.defaultHeaders as Record<string, string>)[key];
  }

  // Set auth token
  setAuthToken(token: string): void {
    this.setHeader('Authorization', `Bearer ${token}`);
  }

  // Clear auth token
  clearAuthToken(): void {
    this.removeHeader('Authorization');
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Build URL
  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // Build cache key
  private buildCacheKey(method: string, url: string, body?: unknown): string {
    return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
  }

  // Create API error
  private createError(status: number, statusText: string, data?: unknown): ApiError {
    const error = new Error(`API Error: ${status} ${statusText}`) as ApiError;
    error.status = status;
    error.statusText = statusText;
    error.data = data;
    return error;
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main request method
  async request<T = unknown>(
    method: string,
    path: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      body,
      timeout = 30000,
      retries = 0,
      retryDelay = 1000,
      cache = false,
      cacheKey,
      headers: customHeaders,
      ...restConfig
    } = config;

    // Build full URL
    const url = this.buildUrl(path);

    // Build cache key
    const key = cacheKey || this.buildCacheKey(method, url, body);

    // Check cache for GET requests
    if (cache && method === 'GET') {
      const cached = this.cache.get<T>(key);
      if (cached) {
        return {
          data: cached,
          status: 200,
          headers: new Headers(),
        };
      }
    }

    // Apply request interceptors
    let finalConfig: RequestConfig = {
      ...restConfig,
      method,
      body,
      headers: { ...this.defaultHeaders, ...customHeaders },
    };

    for (const interceptor of this.interceptors.request) {
      finalConfig = interceptor(finalConfig);
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      ...finalConfig,
      body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
      headers: finalConfig.headers,
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    // Execute request with deduplication and retries
    const executeRequest = async (attempt = 0): Promise<ApiResponse<T>> => {
      try {
        const response = await fetch(url, fetchOptions);

        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.interceptors.response) {
          finalResponse = await interceptor(finalResponse);
        }

        // Handle non-OK responses
        if (!finalResponse.ok) {
          let errorData: unknown;
          try {
            errorData = await finalResponse.json();
          } catch {
            // Ignore JSON parse errors
          }

          const error = this.createError(finalResponse.status, finalResponse.statusText, errorData);

          // Retry on 5xx errors
          if (retries > 0 && attempt < retries && finalResponse.status >= 500) {
            await this.sleep(retryDelay * (attempt + 1));
            return executeRequest(attempt + 1);
          }

          // Apply error interceptors
          for (const interceptor of this.interceptors.error) {
            await interceptor(error);
          }

          throw error;
        }

        // Parse response
        let data: T;
        const contentType = finalResponse.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await finalResponse.json();
        } else {
          data = (await finalResponse.text()) as unknown as T;
        }

        // Cache successful GET requests
        if (cache && method === 'GET') {
          this.cache.set(key, data);
        }

        clearTimeout(timeoutId);

        return {
          data,
          status: finalResponse.status,
          headers: finalResponse.headers,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (error instanceof Error && error.name === 'AbortError') {
          const apiError = this.createError(408, 'Request Timeout');
          
          // Retry on timeout
          if (retries > 0 && attempt < retries) {
            await this.sleep(retryDelay * (attempt + 1));
            return executeRequest(attempt + 1);
          }

          for (const interceptor of this.interceptors.error) {
            await interceptor(apiError);
          }
          
          throw apiError;
        }

        // Retry on network errors
        if (retries > 0 && attempt < retries) {
          await this.sleep(retryDelay * (attempt + 1));
          return executeRequest(attempt + 1);
        }

        throw error;
      }
    };

    // Use request queue for deduplication
    return this.queue.add(key, () => executeRequest());
  }

  // Convenience methods
  get<T = unknown>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, config);
  }

  post<T = unknown>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { ...config, body });
  }

  put<T = unknown>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, { ...config, body });
  }

  patch<T = unknown>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, { ...config, body });
  }

  delete<T = unknown>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, config);
  }
}

// Create default instance
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
export const apiService = new ApiService(BACKEND_URL);

// Typed API methods for Modbus Scanner
export const modbusApi = {
  // Devices
  getDevices: () => apiService.get('/api/devices'),
  getDevice: (id: string) => apiService.get(`/api/devices/${id}`),
  getDeviceTags: (id: string) => apiService.get(`/api/devices/${id}/tags`),
  deleteDevice: (id: string) => apiService.delete(`/api/devices/${id}`),
  writeRegister: (id: string, data: { address: number; value: number }) =>
    apiService.post(`/api/devices/${id}/write`, data),

  // Connections
  getConnections: () => apiService.get('/api/connections'),
  createConnection: (data: unknown) => apiService.post('/api/connections', data),
  getConnection: (name: string) => apiService.get(`/api/connections/${name}`),
  deleteConnection: (name: string) => apiService.delete(`/api/connections/${name}`),
  connectConnection: (name: string) => apiService.post(`/api/connections/${name}/connect`),
  disconnectConnection: (name: string) => apiService.post(`/api/connections/${name}/disconnect`),
  getConnectionDiagnostics: (name: string) => apiService.get(`/api/connections/${name}/diagnostics`),
  testConnection: (name: string) => apiService.post(`/api/connections/${name}/test`),

  // Scan
  startScan: () => apiService.post('/api/scan'),

  // MQTT
  getMqttStatus: () => apiService.get('/api/mqtt/status'),

  // Config
  getConfig: () => apiService.get('/api/config'),
  updateConfig: (data: unknown) => apiService.put('/api/config', data),

  // Health
  health: () => apiService.get('/health'),

  // Logs
  getLogs: (params?: { level?: string; source?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.level) searchParams.set('level', params.level);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiService.get(`/api/logs${query ? `?${query}` : ''}`);
  },
};

export default apiService;

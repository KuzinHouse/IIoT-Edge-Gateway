// All application constants

// Connection types
export const CONNECTION_TYPES = ['tcp', 'rtu', 'ascii'] as const;
export const BAUD_RATES = [300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200];
export const PARITY_OPTIONS = ['none', 'even', 'odd', 'mark', 'space'];
export const STOP_BITS = [1, 1.5, 2];
export const DATA_BITS = [5, 6, 7, 8];

// Device status
export const DEVICE_STATUSES = ['online', 'offline', 'error', 'unknown'] as const;
export const CONNECTION_STATUSES = ['connected', 'disconnected', 'connecting', 'error'] as const;

// Tag types
export const TAG_TYPES = ['coil', 'discrete', 'holding', 'input'] as const;
export const DATA_TYPES = ['BOOL', 'INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT', 'DOUBLE', 'STRING'] as const;

// Alarm severities
export const ALARM_SEVERITIES = ['critical', 'warning', 'info'] as const;
export const ALARM_STATES = ['active', 'acknowledged', 'cleared'] as const;

// User roles
export const USER_ROLES = ['admin', 'operator', 'viewer', 'auditor'] as const;
export const PERMISSIONS = [
  'devices:read', 'devices:write', 'devices:delete',
  'connections:read', 'connections:write', 'connections:delete',
  'tags:read', 'tags:write', 'tags:delete',
  'alarms:read', 'alarms:write', 'alarms:acknowledge',
  'users:read', 'users:write', 'users:delete',
  'config:read', 'config:write',
  'flows:read', 'flows:write', 'flows:execute',
  'license:read', 'license:activate',
  'logs:read', 'audit:read',
] as const;

// Flow node types
export const NODE_TYPES = {
  SOURCE: ['modbus-source', 'mqtt-source', 'http-source', 'opcua-source'],
  TRANSFORM: ['transform', 'filter', 'aggregate', 'script'],
  SINK: ['mqtt-sink', 'http-sink', 'database-sink', 'influxdb-sink'],
} as const;

// Edge function categories
export const EDGE_CATEGORIES = ['math', 'string', 'array', 'logic', 'aggregation', 'conversion', 'time', 'protocol'] as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  THROUGHPUT_WARNING: 5000,
  THROUGHPUT_CRITICAL: 2000,
  LATENCY_WARNING: 50,
  LATENCY_CRITICAL: 100,
  CPU_WARNING: 70,
  CPU_CRITICAL: 90,
  MEMORY_WARNING: 80,
  MEMORY_CRITICAL: 95,
} as const;

// Default values
export const DEFAULTS = {
  TCP_PORT: 502,
  RTU_BAUD: 9600,
  POLL_INTERVAL: 1000,
  RECONNECT_DELAY: 5000,
  MAX_RETRIES: 3,
  TIMEOUT: 5000,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  DEVICES: '/api/devices',
  CONNECTIONS: '/api/connections',
  TAGS: '/api/tags',
  ALARMS: '/api/alarms',
  USERS: '/api/users',
  LICENSE: '/api/license/status',
  HEALTH: '/api/health',
  CONFIG: '/api/config',
  LOGS: '/api/logs',
  FLOWS: '/api/flows',
  PERFORMANCE: '/api/performance',
  SECURITY: '/api/security',
} as const;

// Quality codes
export const QUALITY_CODES = {
  GOOD: 'good',
  BAD: 'bad',
  UNCERTAIN: 'uncertain',
} as const;

// Colors
export const COLORS = {
  STATUS: {
    ONLINE: '#22c55e',
    OFFLINE: '#ef4444',
    ERROR: '#f59e0b',
    UNKNOWN: '#6b7280',
  },
  SEVERITY: {
    CRITICAL: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
  },
  QUALITY: {
    GOOD: '#22c55e',
    BAD: '#ef4444',
    UNCERTAIN: '#f59e0b',
  },
} as const;

// Connection types
export interface ConnectionInfo {
  id: string;
  name: string;
  description?: string;
  type: 'tcp' | 'rtu' | 'ascii';
  host?: string;
  port: number;
  path?: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  timeout: number;
  retries: number;
  pollInterval: number;
  autoReconnect: boolean;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Device types
export interface Device {
  id: string;
  name: string;
  description?: string;
  slaveId: number;
  host?: string;
  port: number;
  status: 'online' | 'offline' | 'error' | 'unknown';
  deviceType: string;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  serialNumber?: string;
  isActive: boolean;
  connectionId?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  description?: string;
  address: string;
  tagType: 'coil' | 'discrete' | 'holding' | 'input';
  dataType: 'BOOL' | 'INT16' | 'UINT16' | 'INT32' | 'UINT32' | 'FLOAT' | 'DOUBLE' | 'STRING';
  access: 'read' | 'write' | 'readWrite';
  unit?: string;
  scale: number;
  offset: number;
  group?: string;
  scanRate: number;
  isActive: boolean;
  deviceId: string;
  value?: number;
  quality?: 'good' | 'bad' | 'uncertain';
  timestamp?: string;
  createdAt: string;
  updatedAt: string;
}

// Tag value
export interface TagValue {
  id: string;
  tagId: string;
  value: string;
  rawValue?: string;
  quality: 'good' | 'bad' | 'uncertain';
  qualityCode: number;
  source: string;
  notes?: string;
  timestamp: string;
}

// Alarm types
export interface Alarm {
  id: string;
  name: string;
  description?: string;
  severity: 'critical' | 'warning' | 'info';
  state: 'active' | 'acknowledged' | 'cleared' | 'normal';
  isActive: boolean;
  isAcknowledged: boolean;
  triggeredAt?: string;
  triggerValue?: string;
  triggerMessage?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  clearedAt?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmRule {
  id: string;
  alarmId: string;
  tagId: string;
  condition: string;
  setpoint: number;
  deadband?: number;
  delay?: number;
  enabled: boolean;
}

// Flow types
export interface Flow {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'stopped' | 'error';
  isPublished: boolean;
  isActive: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowNode {
  id: string;
  flowId: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Record<string, unknown>;
  executionOrder: number;
  inputs: string[];
  outputs: string[];
}

export interface FlowEdge {
  id: string;
  flowId: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

// Driver types
export interface Driver {
  id: string;
  name: string;
  version?: string;
  protocol: string;
  status: 'running' | 'stopped' | 'error';
  enabled: boolean;
  config?: Record<string, unknown>;
  lastError?: string;
  uptime?: number;
  createdAt: string;
  updatedAt: string;
}

// Write requests
export interface WriteRegisterRequest {
  address: number;
  value: number;
}

export interface WriteCoilRequest {
  address: number;
  value: boolean;
}

// System info
export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  version: string;
  db: { status: string; latency: number };
  connections: { total: number; connected: number };
  devices: { total: number; online: number };
}

// Performance
export interface PerformanceData {
  cpu: number;
  memory: number;
  disk: number;
  network: { in: number; out: number };
  requests: { total: number; perSecond: number; avgLatency: number };
  connections: { active: number; total: number };
  devices: { online: number; offline: number };
}

// License
export interface LicenseInfo {
  id: string;
  key: string;
  type: string;
  owner?: string;
  organization?: string;
  isActive: boolean;
  isExpired: boolean;
  maxDevices: number;
  maxTags: number;
  maxConnections: number;
  maxUsers: number;
  expiresAt?: string;
  daysRemaining?: number;
}

// Dashboard stats
export interface DashboardStats {
  devices: { total: number; online: number; offline: number; error: number };
  connections: { total: number; connected: number; disconnected: number; error: number };
  tags: { total: number; active: number; good: number; bad: number };
  alarms: { total: number; active: number; critical: number; acknowledged: number };
  flows: { total: number; running: number; stopped: number };
}

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Trash2, Play, Square, Pencil, ArrowUpRight,
  Cloud, CloudOff, AlertCircle, CheckCircle2, XCircle,
  Server, Globe, Radio, Zap, ChevronRight, Eye,
  MessageSquare, ArrowUpDown, Clock, RefreshCw, Send,
  Settings2, FileJson, Shield, Timer, Gauge, Lock,
  LayoutGrid, List, Download, Upload, RotateCcw,
  Wifi, WifiOff, Loader2, Activity, TrendingUp, Package,
  X, ChevronDown, Info, BookmarkCheck, Layers, BarChart3,
  Cpu, HardDrive, Database, Link, Filter
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
} from '@/components/ui/tooltip';
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PROTOCOLS, getProtocol, getGroupedFields, GROUP_LABELS } from '@/lib/protocol-registry';
import type { ProtocolField } from '@/lib/protocol-registry';
import { usePersistentArray, saveToStorage, loadFromStorage } from '@/lib/use-persistent-state';
import {
  NORTH_APP_TEMPLATES,
  TEMPLATE_CATEGORIES,
  searchTemplates,
  getTemplateById,
  type NorthAppTemplate,
  type NorthAppTemplateCategory,
} from '@/lib/north-app-templates';

// ============================================================
// Protocol ID → display name mapping
// ============================================================
const NORTH_PROTOCOL_IDS = ['mqtt-v5', 'kafka', 'http-rest', 'websocket', 'aws-iot', 'azure-iot', 'pi-system', 'influxdb', 'timescaledb', 'elasticsearch', 'opcua'];

const PROTOCOL_TYPE_MAP: Record<string, string> = {
  'mqtt-v5': 'MQTT v5',
  'kafka': 'Kafka',
  'http-rest': 'HTTP REST',
  'websocket': 'WebSocket',
  'aws-iot': 'AWS IoT',
  'azure-iot': 'Azure IoT Hub',
  'pi-system': 'OSIsoft PI System',
  'influxdb': 'InfluxDB',
  'timescaledb': 'TimescaleDB',
  'elasticsearch': 'Elasticsearch',
  'opcua': 'OPC UA',
};

// ============================================================
// Types
// ============================================================
interface NorthApp {
  id: string;
  name: string;
  protocolId: string;
  status: 'running' | 'stopped' | 'error';
  description?: string;
  config: Record<string, string | number | boolean>;
  devicesConnected: number;
  msgSent: number;
  msgFailed: number;
  lastActive: string; // ISO string for localStorage
  dataFormat: 'JSON' | 'XML' | 'Protobuf';
  batchSize: number;
  flushInterval: number;
  compression: boolean;
  sparkline: number[];
}

// ============================================================
// Mock Data
// ============================================================
function makeSparkline(): number[] {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 50) + 10);
}

const initialNorthApps: NorthApp[] = [
  {
    id: 'n1', name: 'MQTT Cloud Bridge', protocolId: 'mqtt-v5',
    status: 'running',
    description: 'Основной MQTT мост для отправки данных в облако',
    config: { host: 'mqtt.eclipseprojects.io', port: 1883, clientId: 'neuron-mqtt-bridge', username: 'edge_user', qos: '1', keepAlive: 60, cleanSession: true, tls: false, topic: 'neuron/data/#' },
    devicesConnected: 3, msgSent: 15230, msgFailed: 12,
    lastActive: new Date().toISOString(), dataFormat: 'JSON',
    batchSize: 100, flushInterval: 5, compression: false, sparkline: makeSparkline(),
  },
  {
    id: 'n2', name: 'Kafka Pipeline', protocolId: 'kafka',
    status: 'running',
    description: 'Конвейер данных в Apache Kafka',
    config: { bootstrapServers: 'kafka.local:9092', topic: 'iot-data', clientId: 'neuron-kafka-producer', acks: 'all', saslMechanism: 'PLAIN' },
    devicesConnected: 2, msgSent: 84200, msgFailed: 0,
    lastActive: new Date().toISOString(), dataFormat: 'JSON',
    batchSize: 500, flushInterval: 10, compression: true, sparkline: makeSparkline(),
  },
  {
    id: 'n3', name: 'HTTP API Push', protocolId: 'http-rest',
    status: 'stopped',
    description: 'HTTP REST API для отправки данных',
    config: { url: 'https://api.example.com/data', method: 'POST', timeout: 30, retryCount: 3 },
    devicesConnected: 0, msgSent: 0, msgFailed: 0,
    lastActive: new Date(Date.now() - 86400000).toISOString(), dataFormat: 'JSON',
    batchSize: 50, flushInterval: 3, compression: false, sparkline: [],
  },
  {
    id: 'n4', name: 'AWS IoT Core', protocolId: 'aws-iot',
    status: 'error',
    description: 'Подключение к AWS IoT Core',
    config: { endpoint: 'xxxxxx.iot.eu-west-1.amazonaws.com', port: 8883, clientId: 'neuron-aws-iot', thingName: 'edge-gateway-01', tls: true },
    devicesConnected: 0, msgSent: 4500, msgFailed: 156,
    lastActive: new Date(Date.now() - 3600000).toISOString(), dataFormat: 'JSON',
    batchSize: 100, flushInterval: 5, compression: false, sparkline: makeSparkline(),
  },
  {
    id: 'n5', name: 'WebSocket Stream', protocolId: 'websocket',
    status: 'running',
    description: 'Потоковая передача данных через WebSocket',
    config: { url: 'wss://stream.example.com/ws', tls: true },
    devicesConnected: 1, msgSent: 32150, msgFailed: 5,
    lastActive: new Date().toISOString(), dataFormat: 'JSON',
    batchSize: 10, flushInterval: 1, compression: false, sparkline: makeSparkline(),
  },
  {
    id: 'n6', name: 'Azure IoT Hub', protocolId: 'azure-iot',
    status: 'stopped',
    description: 'Интеграция с Azure IoT Hub',
    config: { host: 'myhub.azure-devices.net', port: 8883, deviceId: 'neuron-edge-gw', tls: true },
    devicesConnected: 0, msgSent: 1200, msgFailed: 3,
    lastActive: new Date(Date.now() - 7200000).toISOString(), dataFormat: 'JSON',
    batchSize: 200, flushInterval: 8, compression: true, sparkline: [],
  },
  {
    id: 'n-blue-traktor', name: 'Blue Traktor MQTT', protocolId: 'mqtt-v5',
    status: 'stopped',
    description: 'Тестовый MQTT брокер blue-traktor.ru',
    config: { host: 'blue-traktor.ru', port: 1888, clientId: 'iot-edge-gw-01', username: '', password: '', qos: '1', keepAlive: 60, cleanSession: true, tls: false, topic: 'neuron/data/#' },
    devicesConnected: 0, msgSent: 0, msgFailed: 0,
    lastActive: '-', dataFormat: 'JSON',
    batchSize: 100, flushInterval: 5, compression: false, sparkline: [],
  },
  {
    id: 'n-pi', name: 'PI System Historian', protocolId: 'pi-system',
    status: 'stopped',
    description: 'OSIsoft PI System — хранение исторических данных',
    config: { host: 'piserver.local', port: 5450, serverName: 'DefaultPI', authMode: 'windows', dataMode: 'insert', piTagPrefix: 'IOT_', batchSize: 500, flushInterval: 5, timeout: 30000 },
    devicesConnected: 0, msgSent: 0, msgFailed: 0,
    lastActive: new Date(Date.now() - 86400000).toISOString(), dataFormat: 'JSON',
    batchSize: 500, flushInterval: 5, compression: false, sparkline: [],
  },
  {
    id: 'n-influxdb', name: 'InfluxDB Telemetry', protocolId: 'influxdb',
    status: 'stopped',
    description: 'InfluxDB — запись телеметрии',
    config: { host: 'influxdb.local', port: 8086, token: '', org: 'iot', bucket: 'telemetry', measurement: 'sensor_data', batchSize: 500, flushInterval: 5, tls: false },
    devicesConnected: 0, msgSent: 0, msgFailed: 0,
    lastActive: new Date(Date.now() - 43200000).toISOString(), dataFormat: 'JSON',
    batchSize: 500, flushInterval: 5, compression: false, sparkline: [],
  },
  {
    id: 'n-timescaledb', name: 'TimescaleDB Historian', protocolId: 'timescaledb',
    status: 'stopped',
    description: 'TimescaleDB — хранение исторических данных',
    config: { host: 'tsdb.local', port: 5432, database: 'iot_data', schema: 'public', table: 'tag_values', user: 'iot_writer', password: '', batchSize: 1000, flushInterval: 10, ssl: false },
    devicesConnected: 0, msgSent: 0, msgFailed: 0,
    lastActive: new Date(Date.now() - 43200000).toISOString(), dataFormat: 'JSON',
    batchSize: 1000, flushInterval: 10, compression: false, sparkline: [],
  },
];

// ============================================================
// Helper Components
// ============================================================
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-emerald-500',
    stopped: 'bg-gray-400',
    error: 'bg-red-500',
  };
  return (
    <span className={cn(
      'relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full',
      colors[status] || 'bg-gray-400'
    )}>
      {status === 'running' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    running: { label: 'Работает', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    stopped: { label: 'Остановлено', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30' },
    error: { label: 'Ошибка', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
  };
  const cfg = configs[status] || configs.stopped;
  return <Badge variant="outline" className={cn('text-xs', cfg.className)}>{cfg.label}</Badge>;
}

function ProtocolBadge({ protocolId }: { protocolId: string }) {
  const proto = getProtocol(protocolId);
  const name = PROTOCOL_TYPE_MAP[protocolId] || protocolId;
  const color = proto?.color || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30';
  return (
    <Badge variant="outline" className={cn('text-xs gap-1', color)}>
      {name}
    </Badge>
  );
}

function formatTime(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}с назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
    return date.toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DataFormatBadge({ format }: { format: string }) {
  const colors: Record<string, string> = {
    JSON: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    XML: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Protobuf: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', colors[format] || 'bg-gray-500/10 text-gray-500')}>
      {format}
    </Badge>
  );
}

// ============================================================
// Dynamic Field Renderer
// ============================================================
function ProtocolFieldControl({
  field, value, onChange
}: {
  field: ProtocolField;
  value: string | number | boolean;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1">
        <div className="space-y-0.5">
          <Label className="text-sm">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(field.key, v)}
        />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        <Select value={String(value ?? field.defaultValue)} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        <Input
          type="number"
          value={String(value ?? field.defaultValue)}
          placeholder={field.placeholder || String(field.defaultValue)}
          min={field.min}
          max={field.max}
          step={field.step || 1}
          onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
        />
      </div>
    );
  }

  // string
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      <Input
        type={field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('key') ? 'password' : 'text'}
        value={String(value ?? field.defaultValue)}
        placeholder={field.placeholder || String(field.defaultValue)}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </div>
  );
}

// ============================================================
// Connection Test Hook
// ============================================================
function useConnectionTest() {
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; latency: number; message: string }>>({});

  const testConnection = useCallback((appId: string) => {
    setTesting(appId);
    setResults(prev => ({ ...prev, [appId]: { success: false, latency: 0, message: 'Подключение...' } }));

    const start = Date.now();
    const timer = setTimeout(() => {
      const latency = Math.floor(Math.random() * 150) + 20;
      const success = Math.random() > 0.2;
      setResults(prev => ({
        ...prev,
        [appId]: {
          success,
          latency,
          message: success
            ? `Соединение установлено (${latency}мс)`
            : `Ошибка подключения: таймаут (${latency}мс)`,
        },
      }));
      setTesting(null);
    }, Math.floor(Math.random() * 2000) + 500);

    return () => clearTimeout(timer);
  }, []);

  return { testing, results, testConnection };
}

// ============================================================
// Add/Edit Dialog with Dynamic Protocol Fields
// ============================================================
interface FormState {
  name: string;
  description: string;
  protocolId: string;
  config: Record<string, string | number | boolean>;
  dataFormat: string;
  batchSize: string;
  flushInterval: string;
  compression: boolean;
}

const defaultFormState: FormState = {
  name: '', description: '', protocolId: 'mqtt-v5',
  config: {}, dataFormat: 'JSON', batchSize: '100', flushInterval: '5', compression: false,
};

function buildDefaultConfig(protocolId: string): Record<string, string | number | boolean> {
  const proto = getProtocol(protocolId);
  if (!proto) return {};
  const config: Record<string, string | number | boolean> = {};
  proto.fields.forEach(f => { config[f.key] = f.defaultValue; });
  return config;
}

function AppFormDialog({
  open, onOpenChange, app, onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  app: NorthApp | null;
  onSave: (data: FormState) => void;
}) {
  const isEdit = !!app;
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [activeTab, setActiveTab] = useState('general');

  const updateConfig = (key: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && app) {
      const proto = getProtocol(app.protocolId);
      const defaults = buildDefaultConfig(app.protocolId);
      setForm({
        name: app.name,
        description: app.description || '',
        protocolId: app.protocolId,
        config: { ...defaults, ...app.config },
        dataFormat: app.dataFormat || 'JSON',
        batchSize: String(app.batchSize || 100),
        flushInterval: String(app.flushInterval || 5),
        compression: app.compression || false,
      });
    } else if (isOpen) {
      const defaults = buildDefaultConfig('mqtt-v5');
      setForm({ ...defaultFormState, config: defaults });
    }
    setActiveTab('general');
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  const handleProtocolChange = (newProtocolId: string) => {
    const defaults = buildDefaultConfig(newProtocolId);
    setForm(prev => ({ ...prev, protocolId: newProtocolId, config: defaults }));
  };

  const currentProtocol = getProtocol(form.protocolId);
  const groupedFields = currentProtocol ? getGroupedFields(currentProtocol) : {};
  const groupOrder = ['connection', 'security', 'data', 'timing', 'advanced'];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать приложение' : 'Добавить приложение'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените параметры северного приложения' : 'Настройте новое северное приложение для отправки данных'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="general" className="text-xs">
              <Settings2 className="mr-1 h-3.5 w-3.5" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="connection" className="text-xs">
              <Globe className="mr-1 h-3.5 w-3.5" />
              Подключение
            </TabsTrigger>
            <TabsTrigger value="dataformat" className="text-xs">
              <FileJson className="mr-1 h-3.5 w-3.5" />
              Формат
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              <Gauge className="mr-1 h-3.5 w-3.5" />
              Дополн.
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[420px] mt-2 pr-1">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="app-name">Название</Label>
                <Input id="app-name" placeholder="Название приложения" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-desc">Описание</Label>
                <Textarea id="app-desc" placeholder="Описание приложения" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Протокол</Label>
                <Select value={form.protocolId} onValueChange={handleProtocolChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите протокол" />
                  </SelectTrigger>
                  <SelectContent>
                    {NORTH_PROTOCOL_IDS.map(id => {
                      const p = getProtocol(id);
                      return (
                        <SelectItem key={id} value={id}>
                          {p?.name || id} {p?.version ? `(${p.version})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {currentProtocol && (
                  <p className="text-xs text-muted-foreground">{currentProtocol.description}</p>
                )}
              </div>
            </TabsContent>

            {/* Connection Tab — Dynamic from protocol registry */}
            <TabsContent value="connection" className="space-y-4 mt-0">
              {currentProtocol ? (
                groupOrder.map(groupKey => {
                  const fields = groupedFields[groupKey];
                  if (!fields || fields.length === 0) return null;
                  return (
                    <div key={groupKey} className="space-y-3">
                      <div className="flex items-center gap-2">
                        {groupKey === 'security' && <Shield className="h-4 w-4 text-amber-500" />}
                        <h3 className="text-sm font-semibold text-foreground">
                          {GROUP_LABELS[groupKey] || groupKey}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fields.map(field => (
                          <ProtocolFieldControl
                            key={field.key}
                            field={field}
                            value={form.config[field.key] ?? field.defaultValue}
                            onChange={updateConfig}
                          />
                        ))}
                      </div>
                      <Separator />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Выберите протокол на вкладке &quot;Основное&quot;</p>
              )}
            </TabsContent>

            {/* Data Format Tab */}
            <TabsContent value="dataformat" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Формат данных</Label>
                <Select value={form.dataFormat} onValueChange={v => setForm(prev => ({ ...prev, dataFormat: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="XML">XML</SelectItem>
                    <SelectItem value="Protobuf">Protobuf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Размер пакета (мсг)
                  </Label>
                  <Input type="number" placeholder="100" value={form.batchSize} onChange={e => setForm(prev => ({ ...prev, batchSize: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Timer className="h-3.5 w-3.5" />
                    Интервал отправки (сек)
                  </Label>
                  <Input type="number" placeholder="5" value={form.flushInterval} onChange={e => setForm(prev => ({ ...prev, flushInterval: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Сжатие</Label>
                  <p className="text-xs text-muted-foreground">Сжимать пакеты перед отправкой</p>
                </div>
                <Switch checked={form.compression} onCheckedChange={v => setForm(prev => ({ ...prev, compression: v }))} />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Detail Panel
// ============================================================
function AppDetailPanel({
  app, open, onClose, testResult, testing, onTest
}: {
  app: NorthApp | null;
  open: boolean;
  onClose: () => void;
  testResult: { success: boolean; latency: number; message: string } | undefined;
  testing: boolean;
  onTest: () => void;
}) {
  if (!app) return null;
  const proto = getProtocol(app.protocolId);
  const hasTls = app.config.tls === true || app.config.ssl === true;
  const throughput = app.status === 'running' ? (Math.floor(Math.random() * 50) + 10) : 0;
  const uptime = app.status === 'running' ? `${Math.floor(Math.random() * 72) + 1}ч ${Math.floor(Math.random() * 60)}м` : '—';
  const health = app.status === 'running' ? 98.5 : app.status === 'stopped' ? 0 : 23.1;

  // Determine endpoint display
  const endpoint = (() => {
    const c = app.config;
    if (c.host) return c.port ? `${c.host}:${c.port}` : String(c.host);
    if (c.bootstrapServers) return String(c.bootstrapServers);
    if (c.endpoint) return String(c.endpoint);
    if (c.url) return String(c.url);
    return '—';
  })();

  return (
    <div className={cn(
      'border-l border-border bg-card/50 overflow-hidden transition-all duration-300',
      open ? 'w-[380px] shrink-0' : 'w-0'
    )}>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{app.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={app.status} />
                <ProtocolBadge protocolId={app.protocolId} />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {app.description && (
            <p className="text-xs text-muted-foreground">{app.description}</p>
          )}

          <Separator />

          {/* Connection Test */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Тест подключения</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={onTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wifi className="h-3 w-3" />
                )}
                Тест
              </Button>
            </div>
            {testResult && (
              <Alert className={cn('py-2', testResult.success ? 'border-emerald-500/30' : 'border-red-500/30')}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription className="text-xs">{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Connection Status */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Подключение</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="font-mono text-xs truncate max-w-[200px]">{endpoint}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  TLS/SSL
                  {hasTls ? <Lock className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-muted-foreground" />}
                </span>
                <Badge variant={hasTls ? 'default' : 'secondary'} className="text-xs">
                  {hasTls ? 'Включён' : 'Отключён'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uptime</span>
                <span className="text-sm font-medium">{uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Здоровье</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        health > 80 ? 'bg-emerald-500' : health > 50 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${health}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{health}%</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Throughput Sparkline */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Пропускная способность</h4>
            <div className="flex items-center gap-3">
              <MiniSparkline
                data={app.sparkline}
                color={app.status === 'running' ? '#10b981' : '#9ca3af'}
              />
              <div className="text-sm">
                <span className="font-bold">{throughput}</span>
                <span className="text-xs text-muted-foreground ml-0.5">мсг/с</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Message Stats */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Статистика сообщений</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Send className="h-3 w-3" />
                  Отправлено
                </div>
                <p className="text-lg font-bold">{formatNumber(app.msgSent)}</p>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <AlertCircle className="h-3 w-3" />
                  Ошибки
                </div>
                <p className="text-lg font-bold text-red-500">{formatNumber(app.msgFailed)}</p>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Package className="h-3 w-3" />
                  Batch
                </div>
                <p className="text-lg font-bold">{app.batchSize} <span className="text-xs font-normal text-muted-foreground">мсг</span></p>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <FileJson className="h-3 w-3" />
                  Формат
                </div>
                <DataFormatBadge format={app.dataFormat} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Batch/Flush Stats */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Пакетная обработка</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Размер пакета</span>
                <span>{app.batchSize} мсг</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Интервал отправки</span>
                <span>{app.flushInterval} сек</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Сжатие</span>
                <span>{app.compression ? 'Да' : 'Нет'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Connected Devices */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Подключённые устройства ({app.devicesConnected})
            </h4>
            {app.devicesConnected > 0 ? (
              <div className="space-y-1.5">
                {['PLC S7-1200', 'Flow Meter', 'Temp Sensor'].slice(0, app.devicesConnected).map((dev, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                    <StatusDot status="running" />
                    <span className="text-xs">{dev}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Нет подключённых устройств</p>
            )}
          </div>

          <Separator />

          {/* Last Activity */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Последняя активность: {formatTime(app.lastActive)}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================
// Template Icon Helper
// ============================================================
function TemplateIcon({ iconName, className }: { iconName: string; className?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    MessageSquare: <MessageSquare className={className || 'h-5 w-5'} />,
    Radio: <Radio className={className || 'h-5 w-5'} />,
    Zap: <Zap className={className || 'h-5 w-5'} />,
    Globe: <Globe className={className || 'h-5 w-5'} />,
    Cloud: <Cloud className={className || 'h-5 w-5'} />,
    Database: <Database className={className || 'h-5 w-5'} />,
    Lock: <Lock className={className || 'h-5 w-5'} />,
    Activity: <Activity className={className || 'h-5 w-5'} />,
    Server: <Server className={className || 'h-5 w-5'} />,
    Wifi: <Wifi className={className || 'h-5 w-5'} />,
    Send: <Send className={className || 'h-5 w-5'} />,
    Link: <Link className={className || 'h-5 w-5'} />,
    BarChart3: <BarChart3 className={className || 'h-5 w-5'} />,
    Cpu: <Cpu className={className || 'h-5 w-5'} />,
    HardDrive: <HardDrive className={className || 'h-5 w-5'} />,
    Layers: <Layers className={className || 'h-5 w-5'} />,
    BookmarkCheck: <BookmarkCheck className={className || 'h-5 w-5'} />,
    FileJson: <FileJson className={className || 'h-5 w-5'} />,
    ArrowUpDown: <ArrowUpDown className={className || 'h-5 w-5'} />,
  };
  return (<>{iconMap[iconName] || <Globe className={className || 'h-5 w-5'} />}</>);
}

// ============================================================
// Template Browser Dialog
// ============================================================
function TemplateBrowserDialog({
  open, onOpenChange, onSelectTemplate
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectTemplate: (template: NorthAppTemplate) => void;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredTemplates = useMemo(() => {
    let templates = searchTemplates(search);
    if (activeCategory !== 'all') {
      templates = templates.filter(t => t.category.id === activeCategory);
    }
    return templates;
  }, [search, activeCategory]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, NorthAppTemplate[]> = {};
    filteredTemplates.forEach(t => {
      if (!groups[t.category.id]) groups[t.category.id] = [];
      groups[t.category.id].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const handleSelect = (template: NorthAppTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
    setSearch('');
    setActiveCategory('all');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearch('');
      setActiveCategory('all');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-violet-500" />
            Шаблоны северных приложений
          </DialogTitle>
          <DialogDescription>
            Выберите шаблон для быстрого создания северного приложения с предустановленными настройками
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск шаблонов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setActiveCategory('all')}
          >
            <Filter className="h-3 w-3" />
            Все
          </Button>
          {TEMPLATE_CATEGORIES.map(cat => {
            const count = NORTH_APP_TEMPLATES.filter(t => t.category.id === cat.id).length;
            return (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className={cn('h-7 text-xs gap-1', activeCategory !== cat.id && cat.color)}
                onClick={() => setActiveCategory(cat.id)}
              >
                <TemplateIcon iconName={cat.icon} className="h-3 w-3" />
                {cat.name}
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{count}</Badge>
              </Button>
            );
          })}
        </div>

        {/* Template Grid */}
        <ScrollArea className="flex-1 min-h-0 pr-1">
          <div className="space-y-4 py-2">
            {Object.entries(groupedByCategory).map(([catId, templates]) => {
              const cat = TEMPLATE_CATEGORIES.find(c => c.id === catId);
              if (!cat || templates.length === 0) return null;
              return (
                <div key={catId}>
                  <div className="flex items-center gap-2 mb-2">
                    <TemplateIcon iconName={cat.icon} className={cn('h-4 w-4', cat.color)} />
                    <h3 className={cn('text-sm font-semibold', cat.color)}>{cat.name}</h3>
                    <Badge variant="secondary" className="text-[10px]">{templates.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templates.map(tpl => (
                      <Card
                        key={tpl.id}
                        className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
                        onClick={() => handleSelect(tpl)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                              cat.bgColor
                            )}>
                              <TemplateIcon iconName={tpl.icon} className={cn('h-4.5 w-4.5', cat.color)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {tpl.name}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {tpl.description}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <Badge variant="outline" className={cn('text-[10px] gap-0.5', cat.bgColor, cat.color)}>
                                  {tpl.category.name}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] gap-0.5">
                                  {tpl.protocolName}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {tpl.dataFormat}
                                </Badge>
                                {tpl.compression && (
                                  <Badge variant="secondary" className="text-[10px]">Сжатие</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Endpoint preview */}
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate">
                            {tpl.config.host ? (
                              <>
                                {String(tpl.config.host)}{tpl.config.port ? `:${tpl.config.port}` : ''}
                              </>
                            ) : tpl.config.endpoint ? (
                              <>{String(tpl.config.endpoint)}</>
                            ) : tpl.config.url ? (
                              <>{String(tpl.config.url)}</>
                            ) : tpl.config.bootstrapServers ? (
                              <>{String(tpl.config.bootstrapServers)}</>
                            ) : (
                              <>—</>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Шаблоны не найдены</p>
                <p className="text-xs text-muted-foreground mt-1">Попробуйте изменить поисковый запрос или категорию</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Main Component
// ============================================================
export function NorthAppsView() {
  const [apps, setApps] = usePersistentArray<NorthApp>('north-apps', initialNorthApps);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<NorthApp | null>(null);
  const [detailApp, setDetailApp] = useState<NorthApp | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ running: true, error: true, stopped: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { testing, results, testConnection } = useConnectionTest();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Simulate sparkline updates for running apps
  useEffect(() => {
    const interval = setInterval(() => {
      setApps(prev => prev.map(app => {
        if (app.status !== 'running') return app;
        const newSparkline = [...app.sparkline, Math.floor(Math.random() * 50) + 10];
        if (newSparkline.length > 10) newSparkline.shift();
        return { ...app, sparkline: newSparkline };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [setApps]);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(app.config).toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || app.protocolId === typeFilter;
      return matchSearch && matchType;
    });
  }, [apps, search, typeFilter]);

  const groupedApps = useMemo(() => {
    const groups: Record<string, NorthApp[]> = { running: [], error: [], stopped: [] };
    filteredApps.forEach(app => {
      const key = app.status;
      if (groups[key]) groups[key].push(app);
    });
    return groups;
  }, [filteredApps]);

  const runningApps = apps.filter(a => a.status === 'running').length;
  const totalMsgSent = apps.reduce((sum, a) => sum + a.msgSent, 0);
  const totalMsgFailed = apps.reduce((sum, a) => sum + a.msgFailed, 0);
  const totalDevices = apps.reduce((sum, a) => sum + a.devicesConnected, 0);

  const handleSave = (formState: FormState) => {
    if (editingApp) {
      setApps(prev => prev.map(a => a.id === editingApp.id ? {
        ...a,
        name: formState.name,
        description: formState.description,
        protocolId: formState.protocolId,
        config: formState.config,
        dataFormat: formState.dataFormat as NorthApp['dataFormat'],
        batchSize: parseInt(formState.batchSize) || 100,
        flushInterval: parseInt(formState.flushInterval) || 5,
        compression: formState.compression,
      } : a));
    } else {
      const newApp: NorthApp = {
        id: `n${Date.now()}`,
        name: formState.name,
        description: formState.description,
        protocolId: formState.protocolId,
        config: formState.config,
        status: 'stopped',
        devicesConnected: 0,
        msgSent: 0,
        msgFailed: 0,
        lastActive: new Date().toISOString(),
        dataFormat: formState.dataFormat as NorthApp['dataFormat'],
        batchSize: parseInt(formState.batchSize) || 100,
        flushInterval: parseInt(formState.flushInterval) || 5,
        compression: formState.compression,
        sparkline: [],
      };
      setApps(prev => [...prev, newApp]);
    }
    setEditingApp(null);
  };

  const handleDelete = (id: string) => {
    setApps(prev => prev.filter(a => a.id !== id));
    if (detailApp?.id === id) setDetailApp(null);
  };

  const handleTemplateSelect = (template: NorthAppTemplate) => {
    const defaults = buildDefaultConfig(template.protocolId);
    const newApp: NorthApp = {
      id: `n${Date.now()}`,
      name: template.name,
      description: template.description,
      protocolId: template.protocolId,
      config: { ...defaults, ...template.config },
      status: 'stopped',
      devicesConnected: 0,
      msgSent: 0,
      msgFailed: 0,
      lastActive: new Date().toISOString(),
      dataFormat: template.dataFormat,
      batchSize: template.batchSize,
      flushInterval: template.flushInterval,
      compression: template.compression,
      sparkline: [],
    };
    setApps(prev => [...prev, newApp]);
  };

  const handleToggle = (id: string) => {
    setApps(prev => prev.map(a => {
      if (a.id !== id) return a;
      const newStatus = a.status === 'running' ? 'stopped' : 'running';
      return {
        ...a,
        status: newStatus,
        lastActive: new Date().toISOString(),
        sparkline: newStatus === 'running' ? makeSparkline() : [],
      };
    }));
  };

  const handleExport = () => {
    const json = JSON.stringify(apps, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `north-apps-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as NorthApp[];
        if (Array.isArray(imported)) {
          setApps(() => imported);
        }
      } catch {
        // invalid JSON
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    setApps(() => initialNorthApps);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Всего приложений</p>
                <p className="text-2xl font-bold">{apps.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Cloud className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Активные</p>
                <p className="text-2xl font-bold text-emerald-500">{runningApps}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Сообщений отправлено</p>
                <p className="text-2xl font-bold">{formatNumber(totalMsgSent)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-sky-500" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Устройств подключено</p>
                <p className="text-2xl font-bold">{totalDevices}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button className="gap-1.5" onClick={() => { setEditingApp(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => setTemplateDialogOpen(true)}>
              <BookmarkCheck className="h-4 w-4" />
              Из шаблона
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск приложений..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Все протоколы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все протоколы</SelectItem>
                {NORTH_PROTOCOL_IDS.map(id => {
                  const p = getProtocol(id);
                  return (
                    <SelectItem key={id} value={id}>{p?.name || id}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Экспорт JSON</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Импорт JSON</TooltipContent>
            </Tooltip>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Сбросить по умолчанию</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('table')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Показано {filteredApps.length} из {apps.length}
        </p>

        {/* Content Area */}
        <div className="flex gap-0">
          <div className="flex-1 min-w-0">
            {viewMode === 'grid' ? (
              /* Grid View */
              <div className="space-y-3">
                {(['running', 'error', 'stopped'] as const).map(status => {
                  const groupApps = groupedApps[status];
                  if (!groupApps || groupApps.length === 0) return null;
                  const isExpanded = expandedGroups[status] !== false;
                  const groupLabel: Record<string, string> = { running: 'Активные', error: 'С ошибкой', stopped: 'Остановленные' };
                  return (
                    <Collapsible key={status} open={isExpanded} onOpenChange={() => toggleGroup(status)}>
                      <CollapsibleTrigger className="flex items-center gap-2 py-1 hover:underline">
                        <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                        <StatusDot status={status} />
                        <span className="text-sm font-medium">{groupLabel[status]}</span>
                        <Badge variant="secondary" className="text-xs">{groupApps.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
                          {groupApps.map(app => {
                            const hasTls = app.config.tls === true || app.config.ssl === true;
                            return (
                              <Card key={app.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setDetailApp(app)}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-sm truncate">{app.name}</h3>
                                        {hasTls && <Lock className="h-3 w-3 text-emerald-500 shrink-0" />}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <ProtocolBadge protocolId={app.protocolId} />
                                        <DataFormatBadge format={app.dataFormat} />
                                      </div>
                                    </div>
                                  </div>
                                  {/* Endpoint */}
                                  <div className="text-xs font-mono text-muted-foreground truncate mb-2">
                                    {(() => {
                                      const c = app.config;
                                      if (c.host) return c.port ? `${c.host}:${c.port}` : String(c.host);
                                      if (c.bootstrapServers) return String(c.bootstrapServers);
                                      if (c.endpoint) return String(c.endpoint);
                                      if (c.url) return String(c.url);
                                      return '—';
                                    })()}
                                  </div>
                                  {/* Sparkline */}
                                  {app.sparkline.length > 0 && (
                                    <div className="mb-2">
                                      <MiniSparkline data={app.sparkline} color="#10b981" />
                                    </div>
                                  )}
                                  {/* Stats */}
                                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Устр.</p>
                                      <p className="text-sm font-semibold">{app.devicesConnected}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Отправлено</p>
                                      <p className="text-sm font-semibold">{formatNumber(app.msgSent)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Ошибки</p>
                                      <p className={cn('text-sm font-semibold', app.msgFailed > 0 && 'text-red-500')}>{formatNumber(app.msgFailed)}</p>
                                    </div>
                                  </div>
                                  {/* Actions */}
                                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingApp(app); setDialogOpen(true); }}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Редактировать</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(app.id)}>
                                          {app.status === 'running' ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{app.status === 'running' ? 'Остановить' : 'Запустить'}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(app.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Удалить</TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(app.lastActive)}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
                {filteredApps.length === 0 && (
                  <Card className="p-8 text-center">
                    <CloudOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-sm">Нет приложений</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search || typeFilter !== 'all'
                        ? 'Измените параметры поиска или фильтра'
                        : 'Нажмите «Добавить» для создания первого приложения'}
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              /* Table View */
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Название</TableHead>
                      <TableHead>Протокол</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-center">TLS</TableHead>
                      <TableHead className="text-center">Устр.</TableHead>
                      <TableHead className="text-right">Отправлено</TableHead>
                      <TableHead className="text-right">Ошибки</TableHead>
                      <TableHead>Пропускн.</TableHead>
                      <TableHead>Формат</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="w-[100px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApps.map(app => {
                      const hasTls = app.config.tls === true || app.config.ssl === true;
                      const endpoint = (() => {
                        const c = app.config;
                        if (c.host) return c.port ? `${c.host}:${c.port}` : String(c.host);
                        if (c.bootstrapServers) return String(c.bootstrapServers);
                        if (c.endpoint) return String(c.endpoint);
                        if (c.url) return String(c.url);
                        return '—';
                      })();
                      return (
                        <TableRow key={app.id} className="cursor-pointer" onClick={() => setDetailApp(app)}>
                          <TableCell className="font-medium text-sm">{app.name}</TableCell>
                          <TableCell><ProtocolBadge protocolId={app.protocolId} /></TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[180px]">{endpoint}</TableCell>
                          <TableCell className="text-center">
                            {hasTls ? <Lock className="h-3.5 w-3.5 text-emerald-500 inline" /> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-center">{app.devicesConnected}</TableCell>
                          <TableCell className="text-right">{formatNumber(app.msgSent)}</TableCell>
                          <TableCell className={cn('text-right', app.msgFailed > 0 && 'text-red-500')}>{formatNumber(app.msgFailed)}</TableCell>
                          <TableCell>
                            {app.sparkline.length > 0 ? (
                              <MiniSparkline data={app.sparkline} color="#10b981" />
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><DataFormatBadge format={app.dataFormat} /></TableCell>
                          <TableCell><StatusBadge status={app.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingApp(app); setDialogOpen(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Редактировать</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(app.id)}>
                                    {app.status === 'running' ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{app.status === 'running' ? 'Остановить' : 'Запустить'}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(app.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Удалить</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredApps.length === 0 && (
                  <div className="p-8 text-center">
                    <CloudOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-sm">Нет приложений</h3>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Detail Panel */}
          <AppDetailPanel
            app={detailApp}
            open={!!detailApp}
            onClose={() => setDetailApp(null)}
            testResult={detailApp ? results[detailApp.id] : undefined}
            testing={testing === (detailApp?.id ?? '')}
            onTest={() => detailApp && testConnection(detailApp.id)}
          />
        </div>

        {/* Add/Edit Dialog */}
        <AppFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          app={editingApp}
          onSave={handleSave}
        />

        {/* Template Browser Dialog */}
        <TemplateBrowserDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          onSelectTemplate={handleTemplateSelect}
        />
      </div>
    </TooltipProvider>
  );
}

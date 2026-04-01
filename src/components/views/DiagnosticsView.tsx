'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Radio, Wifi, Server, RefreshCw, Send, Download, Upload,
  CheckCircle2, XCircle, Clock, Activity, Database, Wrench,
  ChevronRight, ChevronDown, Terminal, Gauge, Cpu, HardDrive,
  RadioTower, Plug, Play, Square, Copy, Trash2, Eye, Search,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface ServiceHealth {
  status: string;
  uptime: number;
  port: number;
  protocol?: string;
  version?: string;
  [key: string]: unknown;
}

interface ModbusHealth extends ServiceHealth {
  registers?: { holding: number; input: number; coils: number; discreteInputs: number };
  connections?: number;
}

interface WsBrokerHealth extends ServiceHealth {
  clients?: number;
  tags?: number;
}

interface MqttHealth extends ServiceHealth {
  messagesIn?: number;
  messagesOut?: number;
  bytesIn?: number;
  bytesOut?: number;
  retainedTopics?: number;
  activeSubscriptions?: number;
  historySize?: number;
}

interface RegisterValue {
  address: number;
  value: number;
  raw?: number;
}

interface CoilValue {
  address: number;
  value: boolean;
}

interface ActionLogEntry {
  id: string;
  timestamp: string;
  service: 'modbus' | 'mqtt' | 'ws' | 'system';
  action: string;
  status: 'success' | 'error' | 'info';
  duration: number;
  detail?: string;
}

interface TopicNode {
  name: string;
  children?: TopicNode[];
  retained?: string;
}

interface MqttMessage {
  topic: string;
  payload: string;
  qos: number;
  timestamp: string;
  retained?: boolean;
}

interface MqttSubscription {
  topic: string;
  clientId: string;
  qos: number;
}

interface WsMetrics {
  cpu?: number;
  memory?: number;
  disk?: number;
  networkIn?: number;
  networkOut?: number;
  tagsPerSecond?: number;
}

// ============================================================
// Proxy Fetch Helpers
// ============================================================

async function modbusFetch<T = unknown>(path: string): Promise<{ data: T; duration: number } | null> {
  const start = performance.now();
  try {
    const res = await fetch(`${path}?XTransformPort=8502`, { signal: AbortSignal.timeout(10000) });
    const duration = performance.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as T;
    return { data, duration };
  } catch (e) {
    const duration = performance.now() - start;
    throw Object.assign(e as object, { duration });
  }
}

async function wsFetch<T = unknown>(path: string): Promise<{ data: T; duration: number } | null> {
  const start = performance.now();
  try {
    const res = await fetch(`${path}?XTransformPort=8503`, { signal: AbortSignal.timeout(10000) });
    const duration = performance.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as T;
    return { data, duration };
  } catch (e) {
    const duration = performance.now() - start;
    throw Object.assign(e as object, { duration });
  }
}

async function mqttFetch<T = unknown>(path: string): Promise<{ data: T; duration: number } | null> {
  const start = performance.now();
  try {
    const res = await fetch(`${path}?XTransformPort=8504`, { signal: AbortSignal.timeout(10000) });
    const duration = performance.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as T;
    return { data, duration };
  } catch (e) {
    const duration = performance.now() - start;
    throw Object.assign(e as object, { duration });
  }
}

// ============================================================
// Format Helpers
// ============================================================

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  return `${m}м ${s}с`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDuration(ms: number): string {
  if (ms < 1) return '<1 мс';
  if (ms < 1000) return `${ms.toFixed(0)} мс`;
  return `${(ms / 1000).toFixed(2)} с`;
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function toHex(value: number): string {
  return '0x' + (value >>> 0).toString(16).toUpperCase().padStart(4, '0');
}

// ============================================================
// Status Dot Component
// ============================================================

function StatusDot({ status, size = 'sm' }: { status: string; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-3 w-3' : 'h-2 w-2';
  const isOk = status === 'ok' || status === 'healthy' || status === 'running' || status === 'online';
  const isWarn = status === 'warning' || status === 'degraded';

  return (
    <span className={cn('relative inline-flex items-center justify-center rounded-full', sizeClass)}>
      <span
        className={cn(
          'inline-flex rounded-full',
          sizeClass,
          isOk ? 'bg-emerald-500' : isWarn ? 'bg-amber-500' : 'bg-red-500'
        )}
      />
      {isOk && (
        <span className="absolute inline-flex animate-ping rounded-full bg-emerald-400 opacity-75" style={{ width: '100%', height: '100%' }} />
      )}
    </span>
  );
}

// ============================================================
// Spinner Component
// ============================================================

function Spinner({ className }: { className?: string }) {
  return <RefreshCw className={cn('h-3.5 w-3.5 animate-spin', className)} />;
}

// ============================================================
// Service Health Card
// ============================================================

function ServiceHealthCard({
  name,
  icon: Icon,
  port,
  health,
  loading,
  onRefresh,
  children,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  port: number;
  health: ServiceHealth | null;
  loading: boolean;
  onRefresh: () => void;
  children?: React.ReactNode;
}) {
  const isOk = health?.status === 'ok' || health?.status === 'healthy' || health?.status === 'running' || health?.status === 'online';

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? <Spinner /> : <StatusDot status={health?.status || 'offline'} size="lg" />}
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {name}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">:{port}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {health ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">Статус</div>
              <div className={cn('font-medium', isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {isOk ? 'Работает' : health.status}
              </div>
              {health.uptime != null && (
                <>
                  <div className="text-muted-foreground">Uptime</div>
                  <div className="font-mono">{formatUptime(health.uptime)}</div>
                </>
              )}
              {health.version && (
                <>
                  <div className="text-muted-foreground">Версия</div>
                  <div className="font-mono">{health.version}</div>
                </>
              )}
              {health.protocol && (
                <>
                  <div className="text-muted-foreground">Протокол</div>
                  <div className="font-mono">{health.protocol}</div>
                </>
              )}
            </div>
            {children}
          </>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            Служба недоступна
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tab 1: Modbus Tester
// ============================================================

function ModbusTesterTab({
  actionLog,
  addLog,
}: {
  actionLog: ActionLogEntry[];
  addLog: (service: ActionLogEntry['service'], action: string, status: ActionLogEntry['status'], duration: number, detail?: string) => void;
}) {
  // Health state
  const [modbusHealth, setModbusHealth] = useState<ModbusHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Register reader
  const [regStart, setRegStart] = useState('0');
  const [regCount, setRegCount] = useState('10');
  const [regType, setRegType] = useState<'holding' | 'input'>('holding');
  const [registers, setRegisters] = useState<RegisterValue[]>([]);
  const [regLoading, setRegLoading] = useState(false);

  // Register writer
  const [writeAddr, setWriteAddr] = useState('');
  const [writeVal, setWriteVal] = useState('');
  const [writeType, setWriteType] = useState<'holding' | 'input'>('holding');
  const [writeResult, setWriteResult] = useState<{ success: boolean; address: number; value: number; type: string } | null>(null);
  const [writeLoading, setWriteLoading] = useState(false);

  // Coil reader
  const [coilStart, setCoilStart] = useState('0');
  const [coilCount, setCoilCount] = useState('8');
  const [coils, setCoils] = useState<CoilValue[]>([]);
  const [coilLoading, setCoilLoading] = useState(false);

  // Coil writer
  const [coilWriteAddr, setCoilWriteAddr] = useState('');
  const [coilWriteVal, setCoilWriteVal] = useState<'true' | 'false'>('true');
  const [coilWriteResult, setCoilWriteResult] = useState<{ success: boolean; address: number; value: boolean } | null>(null);
  const [coilWriteLoading, setCoilWriteLoading] = useState(false);

  // Snapshot
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Register map
  const [regMap, setRegMap] = useState<Record<string, unknown> | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Fetch health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const result = await modbusFetch<ModbusHealth>('/api/health');
      if (result) {
        setModbusHealth(result.data);
        addLog('modbus', 'Проверка состояния', 'success', result.duration);
      }
    } catch (e: unknown) {
      setModbusHealth(null);
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Проверка состояния', 'error', dur, 'Служба недоступна');
    } finally {
      setHealthLoading(false);
    }
  }, [addLog]);

  // Read registers
  const readRegisters = useCallback(async () => {
    setRegLoading(true);
    setRegisters([]);
    try {
      const start = parseInt(regStart, 10) || 0;
      const count = Math.min(parseInt(regCount, 10) || 10, 100);
      const result = await modbusFetch<{ registers: RegisterValue[] }>(
        `/api/registers?start=${start}&count=${count}&type=${regType}`
      );
      if (result) {
        setRegisters(result.data.registers || []);
        addLog('modbus', `Чтение регистров: ${regType} [${start}..${start + count - 1}]`, 'success', result.duration, `${result.data.registers?.length || 0} регистров`);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Чтение регистров', 'error', dur, 'Ошибка запроса');
    } finally {
      setRegLoading(false);
    }
  }, [regStart, regCount, regType, addLog]);

  // Write register
  const writeRegister = useCallback(async () => {
    const addr = parseInt(writeAddr, 10);
    const val = parseInt(writeVal, 10);
    if (isNaN(addr) || isNaN(val)) return;
    setWriteLoading(true);
    setWriteResult(null);
    try {
      const result = await modbusFetch<{ success: boolean; address: number; value: number; type: string }>('/api/registers/write');
      // Actually we need a POST fetch - let's do it manually
      const start = performance.now();
      const res = await fetch(`/api/registers/write?XTransformPort=8502`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, value: val, type: writeType }),
        signal: AbortSignal.timeout(10000),
      });
      const duration = performance.now() - start;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { success: boolean; address: number; value: number; type: string };
      setWriteResult(data);
      addLog('modbus', `Запись регистра: ${writeType}[${addr}] = ${val}`, data.success ? 'success' : 'error', duration);
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Запись регистра', 'error', dur, 'Ошибка запроса');
    } finally {
      setWriteLoading(false);
    }
  }, [writeAddr, writeVal, writeType, addLog]);

  // Read coils
  const readCoils = useCallback(async () => {
    setCoilLoading(true);
    setCoils([]);
    try {
      const start = parseInt(coilStart, 10) || 0;
      const count = Math.min(parseInt(coilCount, 10) || 8, 100);
      const result = await modbusFetch<{ coils: CoilValue[] }>(
        `/api/coils?start=${start}&count=${count}`
      );
      if (result) {
        setCoils(result.data.coils || []);
        addLog('modbus', `Чтение катушек [${start}..${start + count - 1}]`, 'success', result.duration, `${result.data.coils?.length || 0} катушек`);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Чтение катушек', 'error', dur, 'Ошибка запроса');
    } finally {
      setCoilLoading(false);
    }
  }, [coilStart, coilCount, addLog]);

  // Write coil
  const writeCoil = useCallback(async () => {
    const addr = parseInt(coilWriteAddr, 10);
    if (isNaN(addr)) return;
    const val = coilWriteVal === 'true';
    setCoilWriteLoading(true);
    setCoilWriteResult(null);
    try {
      const start = performance.now();
      const res = await fetch(`/api/coils/write?XTransformPort=8502`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, value: val }),
        signal: AbortSignal.timeout(10000),
      });
      const duration = performance.now() - start;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { success: boolean; address: number; value: boolean };
      setCoilWriteResult(data);
      addLog('modbus', `Запись катушки: [${addr}] = ${val ? 'ВКЛ' : 'ВЫКЛ'}`, data.success ? 'success' : 'error', duration);
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Запись катушки', 'error', dur, 'Ошибка запроса');
    } finally {
      setCoilWriteLoading(false);
    }
  }, [coilWriteAddr, coilWriteVal, addLog]);

  // Load snapshot
  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshot(null);
    try {
      const result = await modbusFetch<Record<string, unknown>>('/api/snapshot');
      if (result) {
        setSnapshot(result.data);
        addLog('modbus', 'Загрузка снимка данных', 'success', result.duration);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Снимок данных', 'error', dur);
    } finally {
      setSnapshotLoading(false);
    }
  }, [addLog]);

  // Load register map
  const loadMap = useCallback(async () => {
    setMapLoading(true);
    setRegMap(null);
    try {
      const result = await modbusFetch<Record<string, unknown>>('/api/map');
      if (result) {
        setRegMap(result.data);
        addLog('modbus', 'Загрузка карты регистров', 'success', result.duration);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('modbus', 'Карта регистров', 'error', dur);
    } finally {
      setMapLoading(false);
    }
  }, [addLog]);

  // Auto-refresh health
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="space-y-4">
      {/* Health Card */}
      <ServiceHealthCard
        name="Modbus TCP Симулятор"
        icon={Zap}
        port={8502}
        health={modbusHealth}
        loading={healthLoading}
        onRefresh={fetchHealth}
      >
        {modbusHealth?.registers && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Holding', value: modbusHealth.registers.holding },
              { label: 'Input', value: modbusHealth.registers.input },
              { label: 'Coils', value: modbusHealth.registers.coils },
              { label: 'Discr. In', value: modbusHealth.registers.discreteInputs },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                <p className="text-sm font-bold tabular-nums">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </ServiceHealthCard>

      {/* Register Reader */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="h-4 w-4" />
            Чтение регистров
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Начальный адрес</label>
              <Input
                type="number"
                value={regStart}
                onChange={(e) => setRegStart(e.target.value)}
                className="h-8 text-sm font-mono"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Количество</label>
              <Input
                type="number"
                value={regCount}
                onChange={(e) => setRegCount(e.target.value)}
                className="h-8 text-sm font-mono"
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Тип</label>
              <Select value={regType} onValueChange={(v) => setRegType(v as 'holding' | 'input')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holding">Holding</SelectItem>
                  <SelectItem value="input">Input</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={readRegisters} disabled={regLoading} className="w-full h-8 gap-1.5 text-xs">
                {regLoading ? <Spinner /> : <Download className="h-3.5 w-3.5" />}
                Прочитать
              </Button>
            </div>
          </div>

          {registers.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-8 text-[10px]">Адрес</TableHead>
                    <TableHead className="h-8 text-[10px]">Значение</TableHead>
                    <TableHead className="h-8 text-[10px]">Сырое</TableHead>
                    <TableHead className="h-8 text-[10px]">Hex</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.map((reg) => (
                    <TableRow key={reg.address} className="text-xs">
                      <TableCell className="font-mono py-1.5">{reg.address}</TableCell>
                      <TableCell className="font-mono font-medium py-1.5">{reg.value}</TableCell>
                      <TableCell className="font-mono text-muted-foreground py-1.5">{reg.raw ?? reg.value}</TableCell>
                      <TableCell className="font-mono text-muted-foreground py-1.5">{toHex(reg.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {regLoading && (
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Writer */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Запись регистра
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Адрес</label>
              <Input
                type="number"
                value={writeAddr}
                onChange={(e) => setWriteAddr(e.target.value)}
                className="h-8 text-sm font-mono"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Значение</label>
              <Input
                type="number"
                value={writeVal}
                onChange={(e) => setWriteVal(e.target.value)}
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Тип</label>
              <Select value={writeType} onValueChange={(v) => setWriteType(v as 'holding' | 'input')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holding">Holding</SelectItem>
                  <SelectItem value="input">Input</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={writeRegister} disabled={writeLoading} className="w-full h-8 gap-1.5 text-xs">
                {writeLoading ? <Spinner /> : <Upload className="h-3.5 w-3.5" />}
                Записать
              </Button>
            </div>
          </div>

          {writeResult && (
            <div className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
              writeResult.success
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}>
              {writeResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {writeResult.success
                ? `Записано: ${writeResult.type}[${writeResult.address}] = ${writeResult.value}`
                : 'Ошибка записи'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coil Reader */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Чтение катушек
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Начальный адрес</label>
              <Input
                type="number"
                value={coilStart}
                onChange={(e) => setCoilStart(e.target.value)}
                className="h-8 text-sm font-mono"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Количество</label>
              <Input
                type="number"
                value={coilCount}
                onChange={(e) => setCoilCount(e.target.value)}
                className="h-8 text-sm font-mono"
                min={1}
                max={100}
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <Button onClick={readCoils} disabled={coilLoading} className="w-full h-8 gap-1.5 text-xs sm:w-auto">
                {coilLoading ? <Spinner /> : <Download className="h-3.5 w-3.5" />}
                Прочитать
              </Button>
            </div>
          </div>

          {coils.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {coils.map((coil) => (
                <div
                  key={coil.address}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md px-2 py-2 border transition-colors',
                    coil.value
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-muted/50 border-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full transition-colors',
                      coil.value ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'
                    )}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{coil.address}</span>
                  <span className={cn(
                    'text-[10px] font-medium',
                    coil.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                  )}>
                    {coil.value ? 'ВКЛ' : 'ВЫКЛ'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {coilLoading && (
            <div className="flex gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-md" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coil Writer */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Запись катушки
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Адрес</label>
              <Input
                type="number"
                value={coilWriteAddr}
                onChange={(e) => setCoilWriteAddr(e.target.value)}
                className="h-8 text-sm font-mono"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Значение</label>
              <Select value={coilWriteVal} onValueChange={(v) => setCoilWriteVal(v as 'true' | 'false')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">ВКЛ (ON)</SelectItem>
                  <SelectItem value="false">ВЫКЛ (OFF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <Button onClick={writeCoil} disabled={coilWriteLoading} className="w-full h-8 gap-1.5 text-xs sm:w-auto">
                {coilWriteLoading ? <Spinner /> : <Upload className="h-3.5 w-3.5" />}
                Записать
              </Button>
            </div>
          </div>

          {coilWriteResult && (
            <div className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
              coilWriteResult.success
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}>
              {coilWriteResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {coilWriteResult.success
                ? `Записано: катушка[${coilWriteResult.address}] = ${coilWriteResult.value ? 'ВКЛ' : 'ВЫКЛ'}`
                : 'Ошибка записи'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Map & Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Карта регистров
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadMap} disabled={mapLoading}>
                {mapLoading ? <Spinner /> : <RefreshCw className="h-3 w-3" />}
                Загрузить
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {regMap ? (
              <ScrollArea className="max-h-64">
                <pre className="text-[10px] font-mono bg-muted/50 rounded-md p-3 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(regMap, null, 2)}
                </pre>
              </ScrollArea>
            ) : mapLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Нажмите &quot;Загрузить&quot; для получения карты</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Полный снимок
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadSnapshot} disabled={snapshotLoading}>
                {snapshotLoading ? <Spinner /> : <RefreshCw className="h-3 w-3" />}
                Загрузить
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {snapshot ? (
              <ScrollArea className="max-h-64">
                <pre className="text-[10px] font-mono bg-muted/50 rounded-md p-3 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </ScrollArea>
            ) : snapshotLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Нажмите &quot;Загрузить&quot; для получения снимка</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Tab 2: MQTT Tester
// ============================================================

function MqttTesterTab({
  actionLog,
  addLog,
}: {
  actionLog: ActionLogEntry[];
  addLog: (service: ActionLogEntry['service'], action: string, status: ActionLogEntry['status'], duration: number, detail?: string) => void;
}) {
  // Health
  const [mqttHealth, setMqttHealth] = useState<MqttHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Publish
  const [pubTopic, setPubTopic] = useState('');
  const [pubPayload, setPubPayload] = useState('{\n  "value": 0\n}');
  const [pubQos, setPubQos] = useState('0');
  const [pubRetained, setPubRetained] = useState(false);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubResult, setPubResult] = useState<{ success: boolean; delivered?: number; messageId?: string } | null>(null);

  // Subscriptions
  const [subTopic, setSubTopic] = useState('');
  const [subClientId, setSubClientId] = useState('');
  const [subs, setSubs] = useState<MqttSubscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // Topics
  const [topics, setTopics] = useState<{ tree: Record<string, unknown>; topics: string[]; total: number } | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Messages
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgFilter, setMsgFilter] = useState('');

  // Stats
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const result = await mqttFetch<MqttHealth>('/api/health');
      if (result) {
        setMqttHealth(result.data);
        addLog('mqtt', 'Проверка состояния MQTT', 'success', result.duration);
      }
    } catch (e: unknown) {
      setMqttHealth(null);
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('mqtt', 'Проверка состояния MQTT', 'error', dur, 'Служба недоступна');
    } finally {
      setHealthLoading(false);
    }
  }, [addLog]);

  // Publish
  const publish = useCallback(async () => {
    if (!pubTopic.trim()) return;
    setPubLoading(true);
    setPubResult(null);
    try {
      const start = performance.now();
      const res = await fetch('/api/publish?XTransformPort=8504', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: pubTopic,
          payload: pubPayload,
          qos: parseInt(pubQos, 10),
          retained: pubRetained,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const duration = performance.now() - start;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { success: boolean; delivered?: number; messageId?: string };
      setPubResult(data);
      addLog('mqtt', `Публикация: ${pubTopic} (QoS ${pubQos})`, data.success ? 'success' : 'error', duration,
        data.success ? `Доставлено: ${data.delivered}, ID: ${data.messageId}` : undefined);
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('mqtt', 'Публикация', 'error', dur, 'Ошибка запроса');
    } finally {
      setPubLoading(false);
    }
  }, [pubTopic, pubPayload, pubQos, pubRetained, addLog]);

  // Load subscriptions
  const loadSubs = useCallback(async () => {
    setSubsLoading(true);
    try {
      const result = await mqttFetch<{ subscriptions: MqttSubscription[]; total: number }>('/api/subscriptions');
      if (result) {
        setSubs(result.data.subscriptions || []);
        addLog('mqtt', 'Загрузка подписок', 'success', result.duration, `${result.data.subscriptions?.length || 0} подписок`);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('mqtt', 'Загрузка подписок', 'error', dur);
    } finally {
      setSubsLoading(false);
    }
  }, [addLog]);

  // Load topics
  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const result = await mqttFetch<{ tree: Record<string, unknown>; topics: string[]; total: number }>('/api/topics');
      if (result) {
        setTopics(result.data);
        addLog('mqtt', 'Загрузка топиков', 'success', result.duration, `${result.data.total || 0} топиков`);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('mqtt', 'Загрузка топиков', 'error', dur);
    } finally {
      setTopicsLoading(false);
    }
  }, [addLog]);

  // Load messages
  const loadMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const params = new URLSearchParams();
      if (msgFilter) params.set('topic', msgFilter);
      params.set('limit', '50');
      const result = await mqttFetch<{ messages: MqttMessage[]; total: number }>(`/api/messages?${params.toString()}`);
      if (result) {
        setMessages(result.data.messages || []);
        addLog('mqtt', 'Загрузка сообщений', 'success', result.duration, `${result.data.messages?.length || 0} сообщений`);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('mqtt', 'Загрузка сообщений', 'error', dur);
    } finally {
      setMsgLoading(false);
    }
  }, [msgFilter, addLog]);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await mqttFetch<Record<string, unknown>>('/api/stats');
      if (result) {
        setStats(result.data);
        addLog('mqtt', 'Загрузка статистики', 'success', result.duration);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('mqtt', 'Загрузка статистики', 'error', dur);
    } finally {
      setStatsLoading(false);
    }
  }, [addLog]);

  // Toggle topic node expand
  const toggleTopic = useCallback((name: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Recursive topic tree render
  const renderTopicTree = useCallback((node: TopicNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedTopics.has(node.name);
    return (
      <div key={node.name}>
        <button
          onClick={() => node.children?.length ? toggleTopic(node.name) : undefined}
          className="flex items-center gap-1.5 w-full text-left text-xs hover:bg-muted/50 rounded px-1.5 py-1 transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.children?.length ? (
            isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <RadioTower className="h-3 w-3 text-orange-500 shrink-0" />
          <span className="font-mono truncate">{node.name}</span>
          {node.retained && <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0">R</Badge>}
        </button>
        {isExpanded && node.children?.map(child => renderTopicTree(child, depth + 1))}
      </div>
    );
  }, [expandedTopics, toggleTopic]);

  // Build flat topic list into tree
  const buildTopicTree = useCallback((topicList: string[]): TopicNode[] => {
    const root: TopicNode = { name: '', children: [] };
    topicList.sort().forEach(topic => {
      const parts = topic.split('/').filter(Boolean);
      let current = root;
      parts.forEach(part => {
        if (!current.children) current.children = [];
        let existing = current.children.find(c => c.name === part);
        if (!existing) {
          existing = { name: part, children: [] };
          current.children.push(existing);
        }
        current = existing;
      });
    });
    return root.children || [];
  }, []);

  // Auto-refresh health and subs
  useEffect(() => {
    fetchHealth();
    loadSubs();
    loadTopics();
    const interval = setInterval(() => {
      fetchHealth();
      loadSubs();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth, loadSubs, loadTopics]);

  return (
    <div className="space-y-4">
      {/* Health Card */}
      <ServiceHealthCard
        name="MQTT Bridge"
        icon={RadioTower}
        port={8504}
        health={mqttHealth}
        loading={healthLoading}
        onRefresh={fetchHealth}
      >
        {mqttHealth && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Входящие', value: mqttHealth.messagesIn ?? 0, icon: Download },
              { label: 'Исходящие', value: mqttHealth.messagesOut ?? 0, icon: Upload },
              { label: 'Подписки', value: mqttHealth.activeSubscriptions ?? 0, icon: Radio },
              { label: 'Retained', value: mqttHealth.retainedTopics ?? 0, icon: Database },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <item.icon className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm font-bold tabular-nums">{item.value.toLocaleString('ru-RU')}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </ServiceHealthCard>

      {/* Publish Panel */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4" />
            Публикация сообщения
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">Топик</label>
              <Input
                value={pubTopic}
                onChange={(e) => setPubTopic(e.target.value)}
                placeholder="neuron/sensor/temperature"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">QoS</label>
              <Select value={pubQos} onValueChange={setPubQos}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">QoS 0 — Максимум один раз</SelectItem>
                  <SelectItem value="1">QoS 1 — Минимум один раз</SelectItem>
                  <SelectItem value="2">QoS 2 — Ровно один раз</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium">Payload (JSON)</label>
            <Textarea
              value={pubPayload}
              onChange={(e) => setPubPayload(e.target.value)}
              className="min-h-[80px] text-xs font-mono"
              placeholder='{"value": 42.5}'
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={pubRetained} onCheckedChange={setPubRetained} className="scale-75" />
              <span className="text-xs">Retained сообщение</span>
            </div>
            <Button onClick={publish} disabled={pubLoading || !pubTopic.trim()} className="h-8 gap-1.5 text-xs">
              {pubLoading ? <Spinner /> : <Send className="h-3.5 w-3.5" />}
              Опубликовать
            </Button>
          </div>

          {pubResult && (
            <div className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
              pubResult.success
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}>
              {pubResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {pubResult.success
                ? `Опубликовано: доставлено ${pubResult.delivered ?? 0}, ID: ${pubResult.messageId ?? '—'}`
                : 'Ошибка публикации'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribe & Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscriptions */}
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Подписки
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{subs.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Топик</label>
                <Input
                  value={subTopic}
                  onChange={(e) => setSubTopic(e.target.value)}
                  placeholder="neuron/#"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">Client ID</label>
                <Input
                  value={subClientId}
                  onChange={(e) => setSubClientId(e.target.value)}
                  placeholder="diagnostics-client"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {subs.length > 0 ? (
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {subs.map((sub, i) => (
                    <div key={`${sub.topic}-${sub.clientId}-${i}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-muted/30 text-xs">
                      <span className="font-mono truncate flex-1">{sub.topic}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">QoS {sub.qos}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : subsLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Нет активных подписок</p>
            )}
          </CardContent>
        </Card>

        {/* Topic Browser */}
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Браузер топиков
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadTopics} disabled={topicsLoading}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {topics && topics.topics.length > 0 ? (
              <ScrollArea className="max-h-48">
                <div className="space-y-0.5">
                  {buildTopicTree(topics.topics).map(node => renderTopicTree(node))}
                </div>
              </ScrollArea>
            ) : topicsLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">
                {topics ? 'Нет топиков' : 'Нажмите обновить для загрузки'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message History */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              История сообщений
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                value={msgFilter}
                onChange={(e) => setMsgFilter(e.target.value)}
                placeholder="Фильтр по топику"
                className="h-7 text-xs font-mono w-48"
              />
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadMessages} disabled={msgLoading}>
                {msgLoading ? <Spinner /> : <RefreshCw className="h-3 w-3" />}
                Обновить
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {messages.length > 0 ? (
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-8 text-[10px]">Топик</TableHead>
                    <TableHead className="h-8 text-[10px]">Payload</TableHead>
                    <TableHead className="h-8 text-[10px] w-12">QoS</TableHead>
                    <TableHead className="h-8 text-[10px] w-16">Время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((msg, i) => (
                    <TableRow key={`${msg.topic}-${msg.timestamp}-${i}`} className="text-xs">
                      <TableCell className="font-mono py-1.5 max-w-[200px] truncate">{msg.topic}</TableCell>
                      <TableCell className="font-mono py-1.5 max-w-[250px] truncate text-muted-foreground">
                        {msg.payload.length > 60 ? msg.payload.slice(0, 60) + '...' : msg.payload}
                      </TableCell>
                      <TableCell className="py-1.5 text-center">{msg.qos}</TableCell>
                      <TableCell className="py-1.5 tabular-nums text-muted-foreground">
                        {formatTimestamp(msg.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : msgLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Нет сообщений</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Детальная статистика
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadStats} disabled={statsLoading}>
              {statsLoading ? <Spinner /> : <RefreshCw className="h-3 w-3" />}
              Загрузить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {stats ? (
            <ScrollArea className="max-h-48">
              <pre className="text-[10px] font-mono bg-muted/50 rounded-md p-3 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </ScrollArea>
          ) : statsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">Нажмите &quot;Загрузить&quot;</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tab 3: System Diagnostics
// ============================================================

function SystemDiagnosticsTab({
  actionLog,
  addLog,
}: {
  actionLog: ActionLogEntry[];
  addLog: (service: ActionLogEntry['service'], action: string, status: ActionLogEntry['status'], duration: number, detail?: string) => void;
}) {
  // All services health
  const [modbusHealth, setModbusHealth] = useState<ModbusHealth | null>(null);
  const [wsHealth, setWsHealth] = useState<WsBrokerHealth | null>(null);
  const [mqttHealth, setMqttHealth] = useState<MqttHealth | null>(null);
  const [allLoading, setAllLoading] = useState(false);

  // WS Broker metrics
  const [wsMetrics, setWsMetrics] = useState<WsMetrics | null>(null);
  const [wsMetricsLoading, setWsMetricsLoading] = useState(false);

  // Individual loading states
  const [modbusLoading, setModbusLoading] = useState(false);
  const [wsLoading, setWsLoading] = useState(false);
  const [mqttLoading, setMqttLoading] = useState(false);

  // Test all
  const [testResults, setTestResults] = useState<{
    modbus: { ok: boolean; duration: number } | null;
    ws: { ok: boolean; duration: number } | null;
    mqtt: { ok: boolean; duration: number } | null;
  }>({ modbus: null, ws: null, mqtt: null });
  const [testRunning, setTestRunning] = useState(false);

  // System info
  const [systemInfo, setSystemInfo] = useState<Record<string, unknown> | null>(null);

  // Fetch individual service
  const fetchModbus = useCallback(async () => {
    setModbusLoading(true);
    try {
      const result = await modbusFetch<ModbusHealth>('/api/health');
      if (result) setModbusHealth(result.data);
    } catch {
      setModbusHealth(null);
    } finally {
      setModbusLoading(false);
    }
  }, []);

  const fetchWs = useCallback(async () => {
    setWsLoading(true);
    try {
      const result = await wsFetch<WsBrokerHealth>('/api/health');
      if (result) setWsHealth(result.data);
    } catch {
      setWsHealth(null);
    } finally {
      setWsLoading(false);
    }
  }, []);

  const fetchMqtt = useCallback(async () => {
    setMqttLoading(true);
    try {
      const result = await mqttFetch<MqttHealth>('/api/health');
      if (result) setMqttHealth(result.data);
    } catch {
      setMqttHealth(null);
    } finally {
      setMqttLoading(false);
    }
  }, []);

  // Fetch WS metrics
  const fetchWsMetrics = useCallback(async () => {
    setWsMetricsLoading(true);
    try {
      const result = await wsFetch<WsMetrics>('/api/metrics');
      if (result) {
        setWsMetrics(result.data);
        addLog('ws', 'Загрузка метрик WS брокера', 'success', result.duration);
      }
    } catch (e: unknown) {
      const dur = (e as { duration?: number })?.duration ?? 0;
      addLog('ws', 'Загрузка метрик WS брокера', 'error', dur);
    } finally {
      setWsMetricsLoading(false);
    }
  }, [addLog]);

  // Test all services simultaneously
  const testAll = useCallback(async () => {
    setTestRunning(true);
    setTestResults({ modbus: null, ws: null, mqtt: null });

    const testService = async (
      name: ActionLogEntry['service'],
      port: number,
      path: string
    ): Promise<{ ok: boolean; duration: number }> => {
      const start = performance.now();
      try {
        const res = await fetch(`${path}?XTransformPort=${port}`, { signal: AbortSignal.timeout(5000) });
        const duration = performance.now() - start;
        const ok = res.ok;
        addLog(name, `Тест службы (:${port})`, ok ? 'success' : 'error', duration,
          ok ? `HTTP ${res.status}` : `HTTP ${res.status}`);
        return { ok, duration };
      } catch (e: unknown) {
        const duration = (e as { duration?: number })?.duration ?? (performance.now() - start);
        addLog(name, `Тест службы (:${port})`, 'error', duration, 'Недоступна');
        return { ok: false, duration };
      }
    };

    const [modbus, ws, mqtt] = await Promise.all([
      testService('modbus', 8502, '/api/health'),
      testService('ws', 8503, '/api/health'),
      testService('mqtt', 8504, '/api/health'),
    ]);

    setTestResults({ modbus, ws, mqtt });
    setTestRunning(false);
  }, [addLog]);

  // Auto-refresh all health
  useEffect(() => {
    const fetchAll = () => {
      fetchModbus();
      fetchWs();
      fetchMqtt();
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchModbus, fetchWs, fetchMqtt]);

  // System info
  useEffect(() => {
    setSystemInfo({
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'unknown',
      online: typeof navigator !== 'undefined' ? navigator.onLine : false,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const serviceStatusColor = (health: ServiceHealth | null) => {
    const isOk = health?.status === 'ok' || health?.status === 'healthy' || health?.status === 'running' || health?.status === 'online';
    return isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* All Services Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ServiceHealthCard
          name="Modbus Симулятор"
          icon={Zap}
          port={8502}
          health={modbusHealth}
          loading={modbusLoading}
          onRefresh={fetchModbus}
        />
        <ServiceHealthCard
          name="WS Брокер"
          icon={Wifi}
          port={8503}
          health={wsHealth}
          loading={wsLoading}
          onRefresh={fetchWs}
        />
        <ServiceHealthCard
          name="MQTT Bridge"
          icon={RadioTower}
          port={8504}
          health={mqttHealth}
          loading={mqttLoading}
          onRefresh={fetchMqtt}
        />
      </div>

      {/* Test All Services */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Тест всех служб
            </CardTitle>
            <Button onClick={testAll} disabled={testRunning} className="h-8 gap-1.5 text-xs">
              {testRunning ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Тест всех служб
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'modbus' as const, name: 'Modbus', port: 8502, icon: Zap },
              { key: 'ws' as const, name: 'WS Брокер', port: 8503, icon: Wifi },
              { key: 'mqtt' as const, name: 'MQTT Bridge', port: 8504, icon: RadioTower },
            ].map(svc => {
              const result = testResults[svc.key];
              return (
                <div key={svc.key} className="flex flex-col items-center gap-2 rounded-md border p-3">
                  <svc.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">{svc.name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">:{svc.port}</Badge>
                  {testRunning && !result ? (
                    <Spinner />
                  ) : result ? (
                    <div className="flex items-center gap-1.5">
                      {result.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={cn('text-xs font-mono', serviceStatusColor(result.ok ? { status: 'ok', uptime: 0, port: 0 } : { status: 'error', uptime: 0, port: 0 }))}>
                        {formatDuration(result.duration)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* WS Broker Details & MQTT Bridge Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WS Broker Details */}
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                WS Брокер — Детали
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchWsMetrics} disabled={wsMetricsLoading}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* WS Health summary */}
            {wsHealth && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Клиенты', value: wsHealth.clients ?? 0 },
                  { label: 'Теги', value: wsHealth.tags ?? 0 },
                ].map(item => (
                  <div key={item.label} className="rounded-md bg-muted/50 px-3 py-2 text-center">
                    <p className="text-lg font-bold tabular-nums">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {wsMetrics ? (
              <div className="space-y-2">
                {[
                  { label: 'CPU', value: wsMetrics.cpu, unit: '%' },
                  { label: 'Память', value: wsMetrics.memory, unit: '%' },
                  { label: 'Диск', value: wsMetrics.disk, unit: '%' },
                  { label: 'Входящая сеть', value: wsMetrics.networkIn, unit: ' Б/с', format: formatBytes },
                  { label: 'Исходящая сеть', value: wsMetrics.networkOut, unit: ' Б/с', format: formatBytes },
                  { label: 'Теги/сек', value: wsMetrics.tagsPerSecond, unit: '' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono tabular-nums">
                      {item.format ? item.format(item.value ?? 0) : `${(item.value ?? 0).toFixed(1)}${item.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : wsMetricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Нажмите обновить для загрузки метрик</p>
            )}
          </CardContent>
        </Card>

        {/* MQTT Bridge Details */}
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4" />
              MQTT Bridge — Детали
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {mqttHealth ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Входящие', value: mqttHealth.messagesIn ?? 0, icon: Download, color: 'text-sky-500' },
                  { label: 'Исходящие', value: mqttHealth.messagesOut ?? 0, icon: Upload, color: 'text-emerald-500' },
                  { label: 'Байт вход.', value: mqttHealth.bytesIn ?? 0, icon: ArrowDownIcon, color: 'text-sky-500', format: formatBytes },
                  { label: 'Байт исход.', value: mqttHealth.bytesOut ?? 0, icon: ArrowUpIcon, color: 'text-emerald-500', format: formatBytes },
                  { label: 'Retained', value: mqttHealth.retainedTopics ?? 0, icon: Database, color: 'text-orange-500' },
                  { label: 'Подписки', value: mqttHealth.activeSubscriptions ?? 0, icon: Radio, color: 'text-violet-500' },
                ].map(item => (
                  <div key={item.label} className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <item.icon className="h-3 w-3 text-muted-foreground" />
                      <p className={cn('text-sm font-bold tabular-nums', item.color)}>
                        {item.format ? item.format(item.value) : item.value.toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : mqttLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">MQTT Bridge недоступен</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4" />
            Информация о системе
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {systemInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(systemInfo).map(([key, value]) => (
                <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">{key}</p>
                  <p className="text-xs font-mono mt-0.5 truncate">{String(value)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Icon aliases
function ArrowDownIcon({ className }: { className?: string }) {
  return <Download className={className} />;
}
function ArrowUpIcon({ className }: { className?: string }) {
  return <Upload className={className} />;
}

// ============================================================
// Action Log Component
// ============================================================

function ActionLog({ entries }: { entries: ActionLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll to top on new entry
  useEffect(() => {
    if (entries.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevCountRef.current = entries.length;
  }, [entries.length]);

  const serviceIcon = (service: string) => {
    switch (service) {
      case 'modbus': return <Zap className="h-3 w-3" />;
      case 'mqtt': return <Radio className="h-3 w-3" />;
      case 'ws': return <Wifi className="h-3 w-3" />;
      default: return <Server className="h-3 w-3" />;
    }
  };

  const serviceLabel = (service: string) => {
    switch (service) {
      case 'modbus': return 'Modbus';
      case 'mqtt': return 'MQTT';
      case 'ws': return 'WS';
      default: return service;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'error': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <Activity className="h-3 w-3 text-sky-500" />;
    }
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Журнал действий
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground text-center py-3">Нет записей</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Журнал действий
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">{entries.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                entry.status === 'error' ? 'bg-red-500/5' : 'bg-muted/30'
              )}
            >
              {statusIcon(entry.status)}
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {formatTimestamp(entry.timestamp)}
              </span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0 gap-0.5">
                {serviceIcon(entry.service)}
                {serviceLabel(entry.service)}
              </Badge>
              <span className="truncate flex-1">{entry.action}</span>
              {entry.detail && (
                <span className="text-muted-foreground truncate max-w-[200px] text-[10px] shrink-0">
                  {entry.detail}
                </span>
              )}
              <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0 tabular-nums">
                {formatDuration(entry.duration)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export function DiagnosticsView() {
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);

  const addLog = useCallback((
    service: ActionLogEntry['service'],
    action: string,
    status: ActionLogEntry['status'],
    duration: number,
    detail?: string,
  ) => {
    const entry: ActionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      service,
      action,
      status,
      duration,
      detail,
    };
    setActionLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-orange-500/10">
            <Wrench className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Диагностика</h2>
            <p className="text-xs text-muted-foreground">Тестирование подключений и отладка служб</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
            <Server className="h-3 w-3" />
            3 службы
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
            <Zap className="h-3 w-3" />
            :8502
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
            <Wifi className="h-3 w-3" />
            :8503
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
            <Radio className="h-3 w-3" />
            :8504
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="modbus" className="flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modbus" className="text-xs gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Modbus</span>
            <span className="sm:hidden">MB</span>
            <span className="text-muted-foreground">Тестер</span>
          </TabsTrigger>
          <TabsTrigger value="mqtt" className="text-xs gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            MQTT
            <span className="text-muted-foreground">Тестер</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Система
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto mt-4">
          <TabsContent value="modbus" className="mt-0">
            <ModbusTesterTab actionLog={actionLog} addLog={addLog} />
          </TabsContent>

          <TabsContent value="mqtt" className="mt-0">
            <MqttTesterTab actionLog={actionLog} addLog={addLog} />
          </TabsContent>

          <TabsContent value="system" className="mt-0">
            <SystemDiagnosticsTab actionLog={actionLog} addLog={addLog} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Action Log */}
      <ActionLog entries={actionLog} />
    </div>
  );
}

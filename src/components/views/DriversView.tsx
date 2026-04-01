'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Cpu, Cable, FileText, Link, Factory, Building, Zap, Network, Cloud, Code,
  Monitor, Radio, Server, Globe, Wifi, Settings, Play, Square, Download, Trash2,
  ChevronRight, Clock, AlertTriangle, CheckCircle, XCircle, Package,
  RefreshCw, Activity, ArrowDownToLine, ArrowUpFromLine, BarChart3, X,
  ToggleLeft, ToggleRight, Info, Search, Filter, Shield, Timer, Wrench,
  Home, Lightbulb, Database, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PROTOCOLS, PROTOCOL_CATEGORIES, getProtocol, getGroupedFields, GROUP_LABELS,
  COMPLIANCE_LABELS, OPA_S_CATEGORIES,
  type ProtocolDef, type ProtocolField
} from '@/lib/protocol-registry';
import { usePersistentState, saveToStorage, loadFromStorage } from '@/lib/use-persistent-state';

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Cpu, Cable, FileText, Link, Factory, Building, Zap, Network, Cloud, Code,
  Monitor, Radio, Server, Globe, Wifi, Home, Lightbulb, Database,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Cpu;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface DriverMetrics {
  tagsPerSec: number;
  bytesIn: number;
  bytesOut: number;
  errorCount: number;
  uptime: number; // seconds
}

interface DriverState {
  id: string;
  enabled: boolean;
  running: boolean;
  installed: boolean;
  config: Record<string, string | number | boolean>;
  metrics: DriverMetrics;
  lastError: string | null;
  startedAt: number | null;
}

type DriverStatus = 'running' | 'stopped' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDriverStatus(d: DriverState): DriverStatus {
  if (d.lastError && d.running) return 'error';
  if (d.running) return 'running';
  return 'stopped';
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} ч ${m} мин`;
  }
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${days} д ${h} ч`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

const STATUS_CONFIG: Record<DriverStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  running: { label: 'Запущен', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600 dark:text-emerald-400' },
  stopped: { label: 'Остановлен', dotColor: 'bg-zinc-400', bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-500 dark:text-zinc-400' },
  error: { label: 'Ошибка', dotColor: 'bg-red-500', bgColor: 'bg-red-500/10', textColor: 'text-red-600 dark:text-red-400' },
};

const PROTOCOL_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  stable: { label: 'Стабильный', variant: 'default' },
  beta: { label: 'Бета', variant: 'secondary' },
  experimental: { label: 'Экспериментальный', variant: 'outline' },
};

// ─── Initial mock data ──────────────────────────────────────────────────────
function buildDefaultConfig(protocol: ProtocolDef): Record<string, string | number | boolean> {
  const config: Record<string, string | number | boolean> = {};
  protocol.fields.forEach(f => { config[f.key] = f.defaultValue; });
  if (protocol.serialFields) {
    protocol.serialFields.forEach(f => { config[f.key] = f.defaultValue; });
  }
  return config;
}

function createInitialDrivers(): Record<string, DriverState> {
  const states: Record<string, DriverState> = {};
  const installedIds = [
    'modbus-tcp', 'modbus-rtu', 'modbus-ascii', 'opcua', 'siemens-s7',
    'allen-bradley', 'iec104', 'iec61850', 'bacnet-ip', 'snmp-v3', 'mqtt-v5',
    'kafka', 'dnp3', 'iec61850'
  ];
  const runningIds = ['modbus-tcp', 'opcua', 'siemens-s7', 'iec104', 'mqtt-v5'];
  const errorIds = ['iec61850'];

  PROTOCOLS.forEach(p => {
    const installed = installedIds.includes(p.id);
    const running = installed && runningIds.includes(p.id);
    states[p.id] = {
      id: p.id,
      enabled: installed,
      running,
      installed,
      config: buildDefaultConfig(p),
      metrics: running
        ? {
            tagsPerSec: Math.floor(Math.random() * 200) + 50,
            bytesIn: Math.floor(Math.random() * 50000) + 10000,
            bytesOut: Math.floor(Math.random() * 30000) + 5000,
            errorCount: errorIds.includes(p.id) ? Math.floor(Math.random() * 20) + 1 : 0,
            uptime: Math.floor(Math.random() * 86400 * 3) + 3600,
          }
        : { tagsPerSec: 0, bytesIn: 0, bytesOut: 0, errorCount: 0, uptime: 0 },
      lastError: errorIds.includes(p.id) ? 'Connection refused: ETIMEDOUT 192.168.2.30:102' : null,
      startedAt: running ? Date.now() - Math.floor(Math.random() * 86400000 * 3) : null,
    };
  });
  return states;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function DriversView() {
  const [drivers, setDrivers] = usePersistentState<Record<string, DriverState>>('drivers-state', {});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'available' | 'running' | 'stopped'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [detailProtocolId, setDetailProtocolId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string | number | boolean> | null>(null);
  const [uninstallId, setUninstallId] = useState<string | null>(null);
  const [uptimeTick, setUptimeTick] = useState(0);
  const [metricsTick, setMetricsTick] = useState(0);

  const initialized = useRef(false);

  // Initialize drivers on mount (only once)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const existing = loadFromStorage<Record<string, DriverState>>('drivers-state', {});
      if (Object.keys(existing).length === 0) {
        const defaults = createInitialDrivers();
        setDrivers(defaults);
        saveToStorage('drivers-state', defaults);
      }
    }
  }, [setDrivers]);

  // Uptime counter for running drivers
  useEffect(() => {
    const interval = setInterval(() => {
      setUptimeTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Metrics simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setMetricsTick(t => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Apply metrics simulation
  useEffect(() => {
    setDrivers(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(id => {
        if (next[id].running) {
          const d = { ...next[id] };
          d.metrics = {
            tagsPerSec: d.metrics.tagsPerSec + Math.floor(Math.random() * 10) - 5,
            bytesIn: d.metrics.bytesIn + Math.floor(Math.random() * 1000),
            bytesOut: d.metrics.bytesOut + Math.floor(Math.random() * 500),
            errorCount: d.metrics.errorCount + (Math.random() < 0.02 ? 1 : 0),
            uptime: d.metrics.uptime + 3,
          };
          if (d.metrics.tagsPerSec < 0) d.metrics.tagsPerSec = 0;
          next[id] = d;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [metricsTick, setDrivers]);

  const driverList = useMemo(() => Object.values(drivers), [drivers]);

  // Filter
  const filteredCategories = useMemo(() => {
    return PROTOCOL_CATEGORIES
      .map(cat => {
        const protocols = PROTOCOLS.filter(p => p.category === cat.id);
        const catDrivers = protocols.map(p => drivers[p.id]).filter(Boolean);
        const filtered = catDrivers.filter(d => {
          const protocol = getProtocol(d.id);
          if (!protocol) return false;
          // Search
          if (search) {
            const s = search.toLowerCase();
            const match = protocol.name.toLowerCase().includes(s) ||
              protocol.nameEn.toLowerCase().includes(s) ||
              protocol.description.toLowerCase().includes(s);
            if (!match) return false;
          }
          // Status filter
          if (statusFilter === 'installed' && !d.installed) return false;
          if (statusFilter === 'available' && d.installed) return false;
          if (statusFilter === 'running' && !d.running) return false;
          if (statusFilter === 'stopped' && d.running) return false;
          return true;
        });
        return { ...cat, protocols, drivers: filtered };
      })
      .filter(cat => categoryFilter === 'all' || cat.id === categoryFilter)
      .filter(cat => cat.drivers.length > 0);
  }, [drivers, search, statusFilter, categoryFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = driverList.length;
    const installed = driverList.filter(d => d.installed).length;
    const running = driverList.filter(d => d.running).length;
    const errors = driverList.filter(d => d.lastError).length;
    return { total, installed, running, errors };
  }, [driverList]);

  // ─── Actions ────────────────────────────────────────────────────────────
  const handleToggleEnabled = useCallback((id: string) => {
    setDrivers(prev => {
      const d = prev[id];
      if (!d) return prev;
      const next = {
        ...prev,
        [id]: {
          ...d,
          enabled: !d.enabled,
          running: d.running ? false : d.running,
          metrics: d.running ? { tagsPerSec: 0, bytesIn: 0, bytesOut: 0, errorCount: 0, uptime: 0 } : d.metrics,
          lastError: d.running ? null : d.lastError,
          startedAt: null,
        }
      };
      return next;
    });
  }, [setDrivers]);

  const handleToggleRunning = useCallback((id: string) => {
    setDrivers(prev => {
      const d = prev[id];
      if (!d) return prev;
      if (!d.enabled) return prev;
      const nowRunning = !d.running;
      return {
        ...prev,
        [id]: {
          ...d,
          running: nowRunning,
          startedAt: nowRunning ? Date.now() : null,
          lastError: nowRunning ? null : d.lastError,
          metrics: nowRunning
            ? { tagsPerSec: Math.floor(Math.random() * 100) + 50, bytesIn: 0, bytesOut: 0, errorCount: 0, uptime: 0 }
            : { tagsPerSec: 0, bytesIn: d.metrics.bytesIn, bytesOut: d.metrics.bytesOut, errorCount: d.metrics.errorCount, uptime: d.metrics.uptime },
        }
      };
    });
  }, [setDrivers]);

  const handleInstall = useCallback((id: string) => {
    const protocol = getProtocol(id);
    if (!protocol) return;
    setDrivers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        installed: true,
        enabled: true,
        config: buildDefaultConfig(protocol),
        metrics: { tagsPerSec: 0, bytesIn: 0, bytesOut: 0, errorCount: 0, uptime: 0 },
        lastError: null,
        startedAt: null,
      }
    }));
  }, [setDrivers]);

  const handleUninstall = useCallback((id: string) => {
    setDrivers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        installed: false,
        enabled: false,
        running: false,
        metrics: { tagsPerSec: 0, bytesIn: 0, bytesOut: 0, errorCount: 0, uptime: 0 },
        lastError: null,
        startedAt: null,
      }
    }));
    setUninstallId(null);
  }, [setDrivers]);

  const handleOpenDetail = useCallback((id: string) => {
    setDetailProtocolId(id);
    setEditConfig(null);
  }, []);

  const handleStartEdit = useCallback((driver: DriverState) => {
    setEditConfig({ ...driver.config });
  }, []);

  const handleSaveConfig = useCallback((id: string) => {
    if (!editConfig) return;
    setDrivers(prev => ({
      ...prev,
      [id]: { ...prev[id], config: editConfig }
    }));
    setEditConfig(null);
  }, [editConfig, setDrivers]);

  const detailProtocol = detailProtocolId ? getProtocol(detailProtocolId) : null;
  const detailDriver = detailProtocolId ? drivers[detailProtocolId] : null;

  // Force uptimeTick to be used in render to trigger re-renders
  const _uptime = uptimeTick;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Драйверы протоколов</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Управление OPA-S драйверами — плагинами протоколов Юг
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {stats.installed} / {stats.total}
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <Activity className="h-3.5 w-3.5" />
            {stats.running} активных
          </Badge>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Всего драйверов', value: stats.total, icon: Package, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Установлено', value: stats.installed, icon: Download, color: 'text-violet-600 dark:text-violet-400' },
          { label: 'Запущено', value: stats.running, icon: Play, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'С ошибками', value: stats.errors, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск драйвера..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[170px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все драйверы</SelectItem>
              <SelectItem value="installed">Установленные</SelectItem>
              <SelectItem value="available">Доступные</SelectItem>
              <SelectItem value="running">Запущенные</SelectItem>
              <SelectItem value="stopped">Остановленные</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {PROTOCOL_CATEGORIES.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Driver Grid by Category */}
      <div className="space-y-8">
        {filteredCategories.length === 0 && (
          <Card className="p-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Драйверы не найдены</p>
          </Card>
        )}
        {filteredCategories.map(cat => {
          const CatIcon = getIcon(cat.icon);
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-muted">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{cat.name}</h3>
                <Badge variant="secondary" className="text-xs">{cat.drivers.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cat.drivers.map(driver => {
                  const protocol = getProtocol(driver.id);
                  if (!protocol) return null;
                  const ProtoIcon = getIcon(protocol.icon);
                  const status = getDriverStatus(driver);
                  const statusCfg = STATUS_CONFIG[status];
                  const protoStatus = PROTOCOL_STATUS_CONFIG[protocol.status];

                  return (
                    <Card
                      key={driver.id}
                      className={cn(
                        'transition-all hover:shadow-md cursor-pointer',
                        !driver.installed && 'opacity-70',
                        driver.running && 'border-emerald-500/30 dark:border-emerald-500/20',
                        status === 'error' && 'border-red-500/30 dark:border-red-500/20',
                      )}
                      onClick={() => handleOpenDetail(driver.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn('p-2 rounded-lg shrink-0', protocol.color)}>
                              <ProtoIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">{protocol.name}</div>
                              <div className="text-xs text-muted-foreground">v{protocol.version}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Status badge */}
                            <Badge
                              variant="secondary"
                              className={cn('gap-1.5 text-xs px-2 py-0.5', statusCfg.bgColor, statusCfg.textColor)}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dotColor)} />
                              {statusCfg.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs gap-1">
                            <CatIcon className="h-3 w-3" />
                            {cat.name}
                          </Badge>
                          <Badge variant={protoStatus.variant} className="text-xs">
                            {protoStatus.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            {protocol.transport.toUpperCase()}
                            {protocol.defaultPort > 0 && ` :${protocol.defaultPort}`}
                          </Badge>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {protocol.description}
                        </p>

                        {/* Running metrics */}
                        {driver.running && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatUptime(driver.metrics.uptime)}
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Activity className="h-3 w-3" />
                              {driver.metrics.tagsPerSec} тег/с
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {driver.lastError && (
                          <div className="flex items-start gap-1.5 text-xs text-red-500 dark:text-red-400 bg-red-500/5 rounded-md p-2">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="truncate">{driver.lastError}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                          {/* Enable/Disable toggle */}
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={driver.enabled}
                              onCheckedChange={() => handleToggleEnabled(driver.id)}
                              disabled={!driver.installed}
                            />
                            <span className="text-xs text-muted-foreground">
                              {driver.enabled ? 'Вкл' : 'Выкл'}
                            </span>
                          </div>

                          <div className="flex-1" />

                          {/* Install/Uninstall */}
                          {!driver.installed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={e => { e.stopPropagation(); handleInstall(driver.id); }}
                            >
                              <Download className="h-3 w-3" />
                              Установить
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1"
                              onClick={e => { e.stopPropagation(); setUninstallId(driver.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Start/Stop */}
                          {driver.installed && (
                            <Button
                              size="sm"
                              variant={driver.running ? 'destructive' : 'default'}
                              className="h-7 text-xs gap-1"
                              disabled={!driver.enabled}
                              onClick={e => { e.stopPropagation(); handleToggleRunning(driver.id); }}
                            >
                              {driver.running ? (
                                <>
                                  <Square className="h-3 w-3" />
                                  Стоп
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3" />
                                  Запуск
                                </>
                              )}
                            </Button>
                          )}

                          {/* Settings */}
                          {driver.installed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1"
                              onClick={e => { e.stopPropagation(); handleOpenDetail(driver.id); }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Driver Detail Dialog ────────────────────────────────────────── */}
      <Dialog open={!!detailProtocol} onOpenChange={() => { setDetailProtocolId(null); setEditConfig(null); }}>
        {detailProtocol && detailDriver && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-lg', detailProtocol.color)}>
                  {(() => {
                    const Icon = getIcon(detailProtocol.icon);
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <DialogTitle className="text-lg">{detailProtocol.name}</DialogTitle>
                  <DialogDescription className="text-xs">
                    v{detailProtocol.version} · {detailProtocol.description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="config" className="flex-1 min-h-0">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="config" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  Конфигурация
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-1.5 text-xs" disabled={!detailDriver.running}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  Метрики
                </TabsTrigger>
                {detailProtocol.isSerial && (
                  <TabsTrigger value="serial" className="gap-1.5 text-xs">
                    <Cable className="h-3.5 w-3.5" />
                    Послед. порт
                  </TabsTrigger>
                )}
                {detailProtocol.defaultTags && (
                  <TabsTrigger value="tags" className="gap-1.5 text-xs">
                    <Activity className="h-3.5 w-3.5" />
                    Шаблоны тегов
                  </TabsTrigger>
                )}
              </TabsList>

              <ScrollArea className="flex-1 min-h-0 mt-4">
                {/* Config tab */}
                <TabsContent value="config" className="space-y-4 pr-3">
                  {(() => {
                    const grouped = getGroupedFields(detailProtocol);
                    const groups = Object.entries(grouped);
                    if (editConfig) {
                      return groups.map(([groupKey, fields]) => {
                        const groupLabel = GROUP_LABELS[groupKey] || groupKey;
                        const GroupIcon = groupKey === 'connection' ? Link
                          : groupKey === 'security' ? Shield
                          : groupKey === 'timing' ? Timer
                          : groupKey === 'advanced' ? Wrench
                          : Info;
                        return (
                          <div key={groupKey}>
                            <div className="flex items-center gap-2 mb-3">
                              <GroupIcon className="h-4 w-4 text-muted-foreground" />
                              <h4 className="text-sm font-medium">{groupLabel}</h4>
                              <Separator className="flex-1" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {fields.map(field => (
                                <div key={field.key} className="space-y-1.5">
                                  <Label className="text-xs flex items-center gap-1">
                                    {field.label}
                                    {field.required && <span className="text-red-500">*</span>}
                                  </Label>
                                  {field.type === 'boolean' ? (
                                    <Switch
                                      checked={!!editConfig[field.key]}
                                      onCheckedChange={v => setEditConfig(prev => prev ? { ...prev, [field.key]: v } : prev)}
                                    />
                                  ) : field.type === 'select' && field.options ? (
                                    <Select
                                      value={String(editConfig[field.key] ?? field.defaultValue)}
                                      onValueChange={v => setEditConfig(prev => prev ? { ...prev, [field.key]: v } : prev)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      type={field.type === 'number' ? 'number' : field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret') || field.key === 'password' || field.key === 'authPassword' || field.key === 'privPassword' || field.key === 'saslPassword' || field.key === 'sharedAccessKey' ? 'password' : 'text'}
                                      value={String(editConfig[field.key] ?? field.defaultValue)}
                                      onChange={e => {
                                        const val = field.type === 'number' ? Number(e.target.value) : e.target.value;
                                        setEditConfig(prev => prev ? { ...prev, [field.key]: val } : prev);
                                      }}
                                      placeholder={field.placeholder}
                                      min={field.min}
                                      max={field.max}
                                      step={field.step}
                                      className="h-8 text-xs font-mono"
                                    />
                                  )}
                                  {field.description && (
                                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    }
                    // Read-only view
                    return groups.map(([groupKey, fields]) => {
                      const groupLabel = GROUP_LABELS[groupKey] || groupKey;
                      const GroupIcon = groupKey === 'connection' ? Link
                        : groupKey === 'security' ? Shield
                        : groupKey === 'timing' ? Timer
                        : groupKey === 'advanced' ? Wrench
                        : Info;
                      return (
                        <div key={groupKey}>
                          <div className="flex items-center gap-2 mb-3">
                            <GroupIcon className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-medium">{groupLabel}</h4>
                            <Separator className="flex-1" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {fields.map(field => {
                              const val = detailDriver.config[field.key] ?? field.defaultValue;
                              const display = field.type === 'boolean'
                                ? (val ? 'Да' : 'Нет')
                                : field.type === 'select' && field.options
                                  ? field.options.find(o => o.value === String(val))?.label || String(val)
                                  : String(val);
                              return (
                                <div key={field.key} className="flex items-start justify-between gap-2 bg-muted/50 rounded-md px-3 py-2">
                                  <span className="text-xs text-muted-foreground shrink-0">{field.label}</span>
                                  <span className={cn('text-xs font-mono text-right break-all', field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret') || field.key === 'password' || field.key === 'authPassword' || field.key === 'privPassword' || field.key === 'saslPassword' || field.key === 'sharedAccessKey' ? 'text-muted-foreground' : '')}>
                                    {field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret') || field.key === 'password' || field.key === 'authPassword' || field.key === 'privPassword' || field.key === 'saslPassword' || field.key === 'sharedAccessKey'
                                      ? '••••••••'
                                      : display}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </TabsContent>

                {/* Metrics tab */}
                <TabsContent value="metrics" className="space-y-4 pr-3">
                  {detailDriver.running && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3.5 w-3.5" />
                            Время работы
                          </div>
                          <div className="text-lg font-bold">{formatUptime(detailDriver.metrics.uptime)}</div>
                        </Card>
                        <Card className="p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Activity className="h-3.5 w-3.5" />
                            Тегов/сек
                          </div>
                          <div className="text-lg font-bold">{detailDriver.metrics.tagsPerSec}</div>
                        </Card>
                        <Card className="p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                            Входящих данных
                          </div>
                          <div className="text-lg font-bold">{formatBytes(detailDriver.metrics.bytesIn)}</div>
                        </Card>
                        <Card className="p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <ArrowUpFromLine className="h-3.5 w-3.5" />
                            Исходящих данных
                          </div>
                          <div className="text-lg font-bold">{formatBytes(detailDriver.metrics.bytesOut)}</div>
                        </Card>
                      </div>
                      <Card className="p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Ошибки
                        </div>
                        <div className={cn(
                          'text-lg font-bold',
                          detailDriver.metrics.errorCount > 0 ? 'text-red-500' : 'text-emerald-500'
                        )}>
                          {detailDriver.metrics.errorCount}
                        </div>
                      </Card>
                      {detailDriver.lastError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-red-500 font-medium mb-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Последняя ошибка
                          </div>
                          <p className="text-xs text-red-400 font-mono">{detailDriver.lastError}</p>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Serial port tab */}
                {detailProtocol.isSerial && detailProtocol.serialFields && (
                  <TabsContent value="serial" className="space-y-4 pr-3">
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2 text-xs">
                      <Cable className="h-4 w-4 text-orange-500" />
                      <span className="text-muted-foreground">
                        Настройки последовательного порта для {detailProtocol.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editConfig
                        ? detailProtocol.serialFields.map(field => (
                            <div key={field.key} className="space-y-1.5">
                              <Label className="text-xs">{field.label}</Label>
                              {field.type === 'select' && field.options ? (
                                <Select
                                  value={String(editConfig[field.key] ?? field.defaultValue)}
                                  onValueChange={v => setEditConfig(prev => prev ? { ...prev, [field.key]: v } : prev)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={String(editConfig[field.key] ?? field.defaultValue)}
                                  onChange={e => setEditConfig(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                                  className="h-8 text-xs font-mono"
                                />
                              )}
                            </div>
                          ))
                        : detailProtocol.serialFields.map(field => {
                            const val = detailDriver.config[field.key] ?? field.defaultValue;
                            const display = field.type === 'select' && field.options
                              ? field.options.find(o => o.value === String(val))?.label || String(val)
                              : String(val);
                            return (
                              <div key={field.key} className="flex items-start justify-between gap-2 bg-muted/50 rounded-md px-3 py-2">
                                <span className="text-xs text-muted-foreground">{field.label}</span>
                                <span className="text-xs font-mono">{display}</span>
                              </div>
                            );
                          })
                      }
                    </div>
                  </TabsContent>
                )}

                {/* Tags template tab */}
                {detailProtocol.defaultTags && (
                  <TabsContent value="tags" className="space-y-3 pr-3">
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2 text-xs">
                      <Activity className="h-4 w-4 text-sky-500" />
                      <span className="text-muted-foreground">
                        Шаблоны тегов по умолчанию ({detailProtocol.defaultTags.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {detailProtocol.defaultTags.map((tag, i) => (
                        <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-md px-3 py-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{tag.name}</div>
                            {tag.description && (
                              <div className="text-[10px] text-muted-foreground">{tag.description}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {tag.address}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {tag.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>

            {/* Footer */}
            {detailDriver.installed && (
              <DialogFooter className="flex-shrink-0 pt-3 border-t">
                {editConfig ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditConfig(null)}
                    >
                      Отмена
                    </Button>
                    <Button size="sm" onClick={() => handleSaveConfig(detailDriver.id)}>
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Сохранить
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1"
                      onClick={() => { setDetailProtocolId(null); setUninstallId(detailDriver.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </Button>
                    <Button
                      size="sm"
                      variant={detailDriver.running ? 'destructive' : 'default'}
                      disabled={!detailDriver.enabled}
                      onClick={() => handleToggleRunning(detailDriver.id)}
                      className="gap-1"
                    >
                      {detailDriver.running ? (
                        <><Square className="h-3.5 w-3.5" /> Остановить</>
                      ) : (
                        <><Play className="h-3.5 w-3.5" /> Запустить</>
                      )}
                    </Button>
                    <Button size="sm" onClick={() => handleStartEdit(detailDriver)} className="gap-1">
                      <Settings className="h-3.5 w-3.5" />
                      Редактировать
                    </Button>
                  </>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* ─── Uninstall confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!uninstallId} onOpenChange={() => setUninstallId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить драйвер?</AlertDialogTitle>
            <AlertDialogDescription>
              {uninstallId && (() => {
                const p = getProtocol(uninstallId);
                return p
                  ? `Драйвер "${p.name}" будет удалён. Все настройки и конфигурация будут потеряны.`
                  : 'Драйвер будет удалён.';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => uninstallId && handleUninstall(uninstallId)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

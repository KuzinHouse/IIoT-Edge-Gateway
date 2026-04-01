'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Wifi, WifiOff, Activity, Cpu, HardDrive, Zap, AlertTriangle, RefreshCw, Gauge, Radio,
  Clock, Server, TrendingUp, ChevronRight, ChevronDown, Circle, XCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface TagValue {
  name: string;
  address: string;
  value: number | string | boolean;
  quality: 'good' | 'bad' | 'uncertain';
  unit: string;
  timestamp: string;
  deviceId: string;
  groupName: string;
  dataType: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  tagsPerSecond: number;
  connections: { total: number; active: number; errors: number };
  uptime: number;
  timestamp: string;
}

interface AlarmEvent {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  tag: string;
  event: 'triggered' | 'cleared';
  timestamp: string;
  message: string;
}

interface ConnectionInfo {
  id: string;
  name: string;
  status: string;
  protocol: string;
}

interface StatusData {
  connections: ConnectionInfo[];
  devicesOnline: number;
  totalTags: number;
  activeAlarms: number;
  timestamp: string;
}

interface WSMessage {
  channel: string;
  data: any;
  timestamp: string;
}

interface MetricPoint {
  time: number;
  value: number;
}

// ============================================================
// Sparkline Component
// ============================================================

function Sparkline({ data, color }: { data: MetricPoint[]; color: string }) {
  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Throughput Sparkline with Tooltip
// ============================================================

function ThroughputSparkline({ data }: { data: MetricPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-lg">
                <span className="font-mono tabular-nums">{payload[0].value} тег/с</span>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// Circular Gauge Component (SVG-based)
// ============================================================

function CircularGauge({
  value,
  label,
  icon: Icon,
  color,
  max = 100,
}: {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  max?: number;
}) {
  const radius = 40;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const percent = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - percent);

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center">
          <svg width={radius * 2} height={radius * 2} className="-rotate-90">
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted-foreground/30"
            />
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-lg font-bold tabular-nums leading-tight">{Math.round(value)}%</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Quality Helpers
// ============================================================

function QualityDot({ quality }: { quality: string }) {
  const colors: Record<string, string> = {
    good: 'bg-emerald-500',
    bad: 'bg-red-500',
    uncertain: 'bg-amber-500',
  };
  return (
    <span
      className={cn(
        'relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full',
        colors[quality] || 'bg-gray-400'
      )}
    >
      {quality === 'good' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      )}
    </span>
  );
}

function qualityColor(quality: string): string {
  if (quality === 'good') return 'text-emerald-500 dark:text-emerald-400';
  if (quality === 'bad') return 'text-red-500 dark:text-red-400';
  return 'text-amber-500 dark:text-amber-400';
}

function qualityStroke(quality: string): string {
  if (quality === 'good') return '#10b981';
  if (quality === 'bad') return '#ef4444';
  return '#f59e0b';
}

function qualityBorder(quality: string): string {
  if (quality === 'bad') return 'border-red-500/30';
  if (quality === 'uncertain') return 'border-amber-500/30';
  return '';
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

function formatTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 5) return 'только что';
    if (diff < 60) return `${diff}с назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
    return `${Math.floor(diff / 3600)}ч назад`;
  } catch {
    return '—';
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ============================================================
// Simulation Data (fallback when WebSocket unavailable)
// ============================================================

const SIMULATED_BASE_TAGS: TagValue[] = [
  { name: 'Температура подшипника 1', address: '40001', value: 62.5, quality: 'good', unit: '°C', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Температуры', dataType: 'FLOAT' },
  { name: 'Температура подшипника 2', address: '40003', value: 58.3, quality: 'good', unit: '°C', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Температуры', dataType: 'FLOAT' },
  { name: 'Давление масла', address: '40005', value: 4.2, quality: 'good', unit: 'бар', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Давления', dataType: 'FLOAT' },
  { name: 'Расход воды', address: '40007', value: 12.8, quality: 'good', unit: 'м³/ч', timestamp: '', deviceId: 'ПЛК-2', groupName: 'Расход', dataType: 'FLOAT' },
  { name: 'Уровень бака', address: '40009', value: 75.0, quality: 'good', unit: '%', timestamp: '', deviceId: 'ПЛК-2', groupName: 'Уровни', dataType: 'FLOAT' },
  { name: 'Скорость двигателя', address: '40011', value: 1480, quality: 'good', unit: 'об/мин', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Двигатели', dataType: 'INT' },
  { name: 'Насос', address: '00001', value: true, quality: 'good', unit: '', timestamp: '', deviceId: 'ПЛК-2', groupName: 'Управление', dataType: 'BOOL' },
  { name: 'Вибрация', address: '40015', value: 2.3, quality: 'uncertain', unit: 'мм/с', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Вибрация', dataType: 'FLOAT' },
  { name: 'Ток статора', address: '40017', value: 15.6, quality: 'good', unit: 'А', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Энергия', dataType: 'FLOAT' },
  { name: 'Мощность', address: '40019', value: 8.5, quality: 'good', unit: 'кВт', timestamp: '', deviceId: 'ПЛК-1', groupName: 'Энергия', dataType: 'FLOAT' },
];

// ============================================================
// Loading Skeleton
// ============================================================

function MonitoringSkeleton() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Status bar skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />
      {/* Metrics row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
      {/* Tags grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
      {/* Alarm ticker skeleton */}
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

// ============================================================
// Status Bar
// ============================================================

function StatusBar({
  connectionStatus,
  messageCount,
  lastUpdate,
  onReconnect,
  isSimulating,
}: {
  connectionStatus: ConnectionStatus;
  messageCount: number;
  lastUpdate: string;
  onReconnect: () => void;
  isSimulating: boolean;
}) {
  const statusConfig: Record<ConnectionStatus, { color: string; label: string; dotClass: string }> = {
    connected: {
      color: 'text-emerald-600 dark:text-emerald-400',
      label: 'Подключено к потоку данных',
      dotClass: 'bg-emerald-500',
    },
    disconnected: {
      color: 'text-red-600 dark:text-red-400',
      label: 'Отключено',
      dotClass: 'bg-red-500',
    },
    reconnecting: {
      color: 'text-amber-600 dark:text-amber-400',
      label: 'Переподключение...',
      dotClass: 'bg-amber-500 animate-pulse',
    },
  };

  const cfg = statusConfig[connectionStatus];

  return (
    <Card className="py-2 px-4">
      <CardContent className="flex items-center justify-between gap-4 py-1 flex-wrap">
        <div className="flex items-center gap-3">
          {connectionStatus === 'connected' ? (
            <Wifi className={cn('h-4 w-4', cfg.color)} />
          ) : connectionStatus === 'reconnecting' ? (
            <RefreshCw className={cn('h-4 w-4 animate-spin', cfg.color)} />
          ) : (
            <WifiOff className={cn('h-4 w-4', cfg.color)} />
          )}
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', cfg.dotClass)} />
            <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
            {isSimulating && (
              <Badge variant="outline" className="text-[10px] h-5 border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1">
                <Activity className="h-3 w-3" />
                Симуляция
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {messageCount.toLocaleString('ru-RU')} сообщений
            </span>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Обновлено: {formatTimestamp(lastUpdate)}</span>
            </div>
          )}
          {connectionStatus === 'disconnected' && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onReconnect}>
              <RefreshCw className="h-3 w-3" />
              Подключить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Uptime Counter Card
// ============================================================

function UptimeCard({ uptime }: { uptime: number }) {
  const uptimeRef = useRef(uptime);
  const [displayedUptime, setDisplayedUptime] = useState(uptime);

  // Keep ref in sync with prop
  useEffect(() => {
    uptimeRef.current = uptime;
  }, [uptime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedUptime(prev => {
        const next = prev + 1;
        // Re-sync if server uptime changed (e.g., reconnect)
        if (Math.abs(next - uptimeRef.current) > 10) {
          return uptimeRef.current;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col items-center gap-2">
        <Clock className="h-5 w-5 text-sky-500" />
        <span className="text-lg font-bold tabular-nums">{formatUptime(displayedUptime)}</span>
        <span className="text-xs text-muted-foreground font-medium">Время работы</span>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tags/sec Throughput Card
// ============================================================

function ThroughputCard({ data, currentValue }: { data: MetricPoint[]; currentValue: number }) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-orange-500" />
          <span className="text-xs text-muted-foreground font-medium">Теги/сек</span>
        </div>
        <span className="text-2xl font-bold tabular-nums text-orange-500">{Math.round(currentValue)}</span>
        <div className="w-full h-12 mt-1">
          <ThroughputSparkline data={data} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Tag Card
// ============================================================

function TagCard({
  tag,
  sparklineData,
  expanded,
  onToggleExpand,
}: {
  tag: TagValue;
  sparklineData: MetricPoint[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const numericValue = typeof tag.value === 'number' ? tag.value : null;
  const boolValue = typeof tag.value === 'boolean' ? tag.value : null;
  const displayValue = boolValue !== null
    ? (boolValue ? 'ВКЛ' : 'ВЫКЛ')
    : numericValue !== null
      ? numericValue.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
      : String(tag.value);

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        qualityBorder(tag.quality)
      )}
    >
      <CardContent className="p-4 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{tag.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                {tag.groupName}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <QualityDot quality={tag.quality} />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleExpand}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums tracking-tight',
              qualityColor(tag.quality)
            )}
          >
            {displayValue}
          </span>
          {tag.unit && (
            <span className="text-sm text-muted-foreground">{tag.unit}</span>
          )}
        </div>

        {/* BOOL indicator */}
        {boolValue !== null && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-3 w-3 rounded-full transition-colors',
                boolValue ? 'bg-emerald-500' : 'bg-gray-400'
              )}
            />
            <span className="text-xs text-muted-foreground">
              {boolValue ? 'Включено' : 'Выключено'}
            </span>
          </div>
        )}

        {/* Sparkline */}
        {numericValue !== null && sparklineData.length >= 2 && (
          <div className="w-full">
            <Sparkline data={sparklineData} color={qualityStroke(tag.quality)} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatTimeAgo(tag.timestamp)}</span>
          {tag.dataType && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {tag.dataType}
            </Badge>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Адрес:</span>
                <p className="font-mono text-foreground">{tag.address}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Устройство:</span>
                <p className="text-foreground truncate">{tag.deviceId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Тип данных:</span>
                <p className="text-foreground">{tag.dataType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Группа:</span>
                <p className="text-foreground">{tag.groupName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Последнее обновление:</span>
                <p className="text-foreground">{formatTimestamp(tag.timestamp)}</p>
              </div>
              {/* Mini history */}
              {sparklineData.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Последние значения:</span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {sparklineData.slice(-8).map((p, i) => (
                      <span key={i} className="font-mono text-[10px] bg-muted px-1 rounded">
                        {p.value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Alarm Ticker
// ============================================================

function AlarmTicker({ alarms }: { alarms: AlarmEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (alarms.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            События аварийных сигналов
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex items-center justify-center h-12 text-sm text-muted-foreground">
            Нет активных событий
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            События аварийных сигналов
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {alarms.length} событий
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div ref={scrollRef} className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
          {alarms.map((alarm) => {
            const isCritical = alarm.severity === 'critical';
            const isTriggered = alarm.event === 'triggered';
            return (
              <div
                key={`${alarm.id}-${alarm.timestamp}`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
                  isCritical
                    ? 'bg-red-500/10 dark:bg-red-500/5'
                    : 'bg-amber-500/10 dark:bg-amber-500/5'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    isCritical ? 'bg-red-500' : 'bg-amber-500'
                  )}
                />
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] h-5 shrink-0',
                      isTriggered
                        ? 'border-red-500/30 text-red-600 dark:text-red-400'
                        : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {isTriggered ? 'Сработка' : 'Сброс'}
                  </Badge>
                  <span className="font-medium truncate">{alarm.name}</span>
                  <span className="text-muted-foreground shrink-0">→</span>
                  <span className="text-muted-foreground truncate">{alarm.tag}</span>
                </div>
                <span className="text-muted-foreground shrink-0 tabular-nums text-[10px]">
                  {formatTimestamp(alarm.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Connection Status Panel
// ============================================================

function ConnectionStatusPanel({
  connections,
  devicesOnline,
  totalTags,
  activeAlarms,
  visible,
  onToggle,
}: {
  connections: ConnectionInfo[];
  devicesOnline: number;
  totalTags: number;
  activeAlarms: number;
  visible: boolean;
  onToggle: () => void;
}) {
  const statusDotClass = (status: string) => {
    if (status === 'connected' || status === 'online' || status === 'running')
      return 'bg-emerald-500';
    if (status === 'error' || status === 'failed') return 'bg-red-500';
    if (status === 'connecting' || status === 'reconnecting') return 'bg-amber-500 animate-pulse';
    return 'bg-gray-400';
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      connected: 'Подключено',
      online: 'Онлайн',
      running: 'Работает',
      error: 'Ошибка',
      failed: 'Ошибка',
      disconnected: 'Отключено',
      offline: 'Офлайн',
      stopped: 'Остановлено',
      connecting: 'Подключение...',
      reconnecting: 'Переподключение...',
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between lg:hidden"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2 text-xs">
          <Server className="h-3.5 w-3.5" />
          Подключения
        </span>
        {visible ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </Button>

      <Card className={cn('transition-all', !visible && 'hidden lg:block')}>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Статус подключений
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-bold tabular-nums text-emerald-500">{devicesOnline}</p>
              <p className="text-[10px] text-muted-foreground">Устройств онлайн</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-bold tabular-nums">{totalTags}</p>
              <p className="text-[10px] text-muted-foreground">Всего тегов</p>
            </div>
            <div className="col-span-2 rounded-md bg-muted/50 px-3 py-2 text-center">
              <p className={cn(
                'text-lg font-bold tabular-nums',
                activeAlarms > 0 ? 'text-red-500' : 'text-emerald-500'
              )}>
                {activeAlarms}
              </p>
              <p className="text-[10px] text-muted-foreground">Активных аварий</p>
            </div>
          </div>

          <Separator />

          {/* Connection list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {connections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Нет данных о подключениях</p>
            ) : (
              connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-muted/50 transition-colors"
                >
                  <span className={cn('h-2 w-2 rounded-full shrink-0', statusDotClass(conn.status))} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{conn.name}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {conn.protocol}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {statusLabel(conn.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function MonitoringView() {
  // --- State ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messageCount, setMessageCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [tags, setTags] = useState<TagValue[]>([]);
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [showConnectionPanel, setShowConnectionPanel] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // --- Refs ---
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const metricHistoryRef = useRef<MetricPoint[]>([]);
  const tagSparklinesRef = useRef<Map<string, MetricPoint[]>>(new Map());
  const [metricHistory, setMetricHistory] = useState<MetricPoint[]>([]);
  const [tagSparklines, setTagSparklines] = useState<Map<string, MetricPoint[]>>(new Map());
  const mountedRef = useRef(true);
  const lastSparklineFlushRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const connectFnRef = useRef<() => void>(() => {});
  const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectedAtRef = useRef(0);
  const simTagsRef = useRef<TagValue[]>([]);
  const simMetricBaseRef = useRef<{ cpu: number; memory: number; tps: number; uptime: number }>({
    cpu: 35, memory: 52, tps: 55, uptime: 86400,
  });

  // --- Update metric sparkline ---
  const pushMetricHistory = useCallback((tps: number) => {
    const point: MetricPoint = { time: Date.now(), value: tps };
    metricHistoryRef.current = [...metricHistoryRef.current, point].slice(-30);
    if (mountedRef.current) {
      setMetricHistory([...metricHistoryRef.current]);
    }
  }, []);

  // --- Update tag sparklines ---
  const pushTagSparkline = useCallback((tagName: string, value: number) => {
    const map = tagSparklinesRef.current;
    const history = map.get(tagName) || [];
    const point: MetricPoint = { time: Date.now(), value };
    const newHistory = [...history, point].slice(-20);
    map.set(tagName, newHistory);
    // Throttle state flush to max once per second to prevent excessive re-renders
    const now = Date.now();
    if (mountedRef.current && now - lastSparklineFlushRef.current >= 1000) {
      lastSparklineFlushRef.current = now;
      setTagSparklines(new Map(map));
    }
  }, []);

  // --- Schedule reconnect with exponential backoff ---
  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    reconnectAttemptRef.current = attempt + 1;
    setConnectionStatus('reconnecting');
    reconnectTimeoutRef.current = setTimeout(() => {
      connectFnRef.current();
    }, delay);
  }, []);

  // --- Connect ---
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

    setIsConnecting(true);
    setConnectionStatus('reconnecting');

    try {
      const ws = new WebSocket('/?XTransformPort=8503');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connected');
        setIsConnecting(false);
        setIsSimulating(false);
        disconnectedAtRef.current = 0;
        reconnectAttemptRef.current = 0;
        if (simulationTimerRef.current) {
          clearInterval(simulationTimerRef.current);
          simulationTimerRef.current = null;
        }

        // Subscribe to all channels
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['tags', 'metrics', 'alarms', 'status'],
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const raw = JSON.parse(event.data);

          // Handle system message
          if (raw.type === 'connected') {
            setConnectionStatus('connected');
            setIsConnecting(false);
            return;
          }

          // Handle channel messages
          if (raw.channel && raw.data) {
            const msg: WSMessage = raw;
            setMessageCount(prev => prev + 1);
            setLastUpdate(msg.timestamp || new Date().toISOString());

            switch (msg.channel) {
              case 'tags': {
                const tagData = msg.data;
                if (tagData.type === 'snapshot') {
                  const tagArr: TagValue[] = tagData.tags || [];
                  setTags(tagArr);
                  // Initialize sparklines for each tag
                  tagArr.forEach(t => {
                    if (typeof t.value === 'number') {
                      pushTagSparkline(t.name, t.value);
                    }
                  });
                } else if (tagData.type === 'update') {
                  const updatedTags: TagValue[] = tagData.tags || [];
                  setTags(prev => {
                    const existingMap = new Map(prev.map(t => [t.name, t]));
                    updatedTags.forEach(ut => {
                      existingMap.set(ut.name, ut);
                      if (typeof ut.value === 'number') {
                        pushTagSparkline(ut.name, ut.value);
                      }
                    });
                    return Array.from(existingMap.values());
                  });
                } else if (tagData.type === 'write') {
                  // Handle write confirmation — update the specific tag
                  const writtenTags: TagValue[] = tagData.tags || [];
                  setTags(prev => {
                    const existingMap = new Map(prev.map(t => [t.name, t]));
                    writtenTags.forEach(ut => existingMap.set(ut.name, ut));
                    return Array.from(existingMap.values());
                  });
                }
                break;
              }

              case 'metrics': {
                const m: SystemMetrics = msg.data;
                setMetrics(m);
                pushMetricHistory(m.tagsPerSecond || 0);
                break;
              }

              case 'alarms': {
                const alarm: AlarmEvent = msg.data;
                setAlarms(prev => [alarm, ...prev].slice(0, 100));
                break;
              }

              case 'status': {
                const s: StatusData = msg.data;
                setStatusData(s);
                break;
              }
            }
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;
        setIsConnecting(false);
        setConnectionStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will handle the reconnect
      };
    } catch {
      setIsConnecting(false);
      setConnectionStatus('disconnected');
      scheduleReconnect();
    }
  }, [pushMetricHistory, pushTagSparkline, scheduleReconnect]);

  // Keep the ref updated
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  // --- Manual reconnect ---
  const handleReconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  // --- Toggle tag expand ---
  const toggleTagExpand = useCallback((tagName: string) => {
    setExpandedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagName)) {
        next.delete(tagName);
      } else {
        next.add(tagName);
      }
      return next;
    });
  }, []);

  // --- Lifecycle ---
  useEffect(() => {
    mountedRef.current = true;
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;

    // Defer initial connect to avoid synchronous setState in effect
    const initTimer = setTimeout(() => {
      connectFnRef.current();
    }, 0);

    return () => {
      clearTimeout(initTimer);
      mountedRef.current = false;
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // --- Simulation fallback when WebSocket unavailable for >5s ---
  useEffect(() => {
    if (connectionStatus === 'connected') {
      // State cleanup is handled in ws.onopen; here we only clear the timer
      disconnectedAtRef.current = 0;
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return;
    }

    // Record disconnect time (only on first disconnect)
    if (disconnectedAtRef.current === 0) {
      disconnectedAtRef.current = Date.now();
    }

    const elapsed = Date.now() - disconnectedAtRef.current;
    const remainingDelay = Math.max(0, 5000 - elapsed);

    const checkTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      if (simulationTimerRef.current) return; // Already simulating

      setIsSimulating(true);

      // Initialize simulated tags
      simTagsRef.current = SIMULATED_BASE_TAGS.map(t => ({
        ...t,
        timestamp: new Date().toISOString(),
      }));
      setTags([...simTagsRef.current]);

      // Initialize metrics
      const base = simMetricBaseRef.current;
      setMetrics(prev => prev ?? {
        cpu: base.cpu,
        memory: base.memory,
        disk: 38,
        networkIn: 2500,
        networkOut: 1200,
        tagsPerSecond: base.tps,
        connections: { total: 8, active: 6, errors: 0 },
        uptime: base.uptime,
        timestamp: new Date().toISOString(),
      });

      // Push initial sparklines
      simTagsRef.current.forEach(t => {
        if (typeof t.value === 'number') {
          pushTagSparkline(t.name, t.value);
        }
      });

      // Start periodic simulation updates
      simulationTimerRef.current = setInterval(() => {
        if (!mountedRef.current) return;

        const b = simMetricBaseRef.current;

        // Fluctuate tags
        simTagsRef.current = simTagsRef.current.map(t => {
          if (typeof t.value === 'number') {
            const drift = (Math.random() - 0.5) * (t.value > 100 ? 5 : 1);
            return { ...t, value: Math.round((t.value + drift) * 100) / 100, timestamp: new Date().toISOString() };
          }
          if (typeof t.value === 'boolean' && Math.random() > 0.95) {
            return { ...t, value: !t.value, timestamp: new Date().toISOString() };
          }
          return t;
        });
        setTags([...simTagsRef.current]);

        // Push sparklines
        simTagsRef.current.forEach(t => {
          if (typeof t.value === 'number') {
            pushTagSparkline(t.name, t.value);
          }
        });

        // Fluctuate metrics with smooth random walk
        b.cpu = Math.max(10, Math.min(85, b.cpu + (Math.random() - 0.5) * 6));
        b.memory = Math.max(40, Math.min(80, b.memory + (Math.random() - 0.5) * 3));
        b.tps = Math.max(20, Math.min(120, b.tps + (Math.random() - 0.5) * 15));
        b.uptime += 2;

        setMetrics({
          cpu: Math.round(b.cpu * 10) / 10,
          memory: Math.round(b.memory * 10) / 10,
          disk: 38 + Math.random() * 2,
          networkIn: 1500 + Math.random() * 4000,
          networkOut: 800 + Math.random() * 2000,
          tagsPerSecond: Math.round(b.tps),
          connections: { total: 8, active: 6, errors: Math.random() > 0.92 ? 1 : 0 },
          uptime: b.uptime,
          timestamp: new Date().toISOString(),
        });

        pushMetricHistory(Math.round(b.tps));
      }, 2000);
    }, remainingDelay);

    return () => {
      clearTimeout(checkTimer);
    };
  }, [connectionStatus, pushMetricHistory, pushTagSparkline]);

  // --- Computed ---
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      // Sort by quality: bad first, then uncertain, then good
      const qualityOrder: Record<string, number> = { bad: 0, uncertain: 1, good: 2 };
      const qDiff = (qualityOrder[a.quality] ?? 2) - (qualityOrder[b.quality] ?? 2);
      if (qDiff !== 0) return qDiff;
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [tags]);

  // --- Render ---
  // Show loading skeleton while initially connecting
  if (isConnecting && tags.length === 0 && !metrics) {
    return <MonitoringSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 p-4 lg:p-6">
        {/* 1. Status Bar */}
        <StatusBar
          connectionStatus={connectionStatus}
          messageCount={messageCount}
          lastUpdate={lastUpdate}
          onReconnect={handleReconnect}
          isSimulating={isSimulating}
        />

        {/* 2. System Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CircularGauge
            value={metrics?.cpu ?? 0}
            label="Процессор"
            icon={Cpu}
            color={metrics && metrics.cpu > 80 ? '#ef4444' : metrics && metrics.cpu > 60 ? '#f59e0b' : '#10b981'}
          />
          <CircularGauge
            value={metrics?.memory ?? 0}
            label="Память"
            icon={HardDrive}
            color={metrics && metrics.memory > 85 ? '#ef4444' : metrics && metrics.memory > 70 ? '#f59e0b' : '#6366f1'}
          />
          <ThroughputCard
            data={metricHistory}
            currentValue={metrics?.tagsPerSecond ?? 0}
          />
          <UptimeCard uptime={metrics?.uptime ?? 0} />
        </div>

        {/* Stats summary row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            <span>Тегов: <strong className="text-foreground tabular-nums">{tags.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>Сообщений: <strong className="text-foreground tabular-nums">{messageCount.toLocaleString('ru-RU')}</strong></span>
          </div>
          {metrics?.connections && (
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" />
              <span>
                Подключений: <strong className="text-foreground tabular-nums">{metrics.connections.active}/{metrics.connections.total}</strong>
                {metrics.connections.errors > 0 && (
                  <span className="text-red-500 ml-1">({metrics.connections.errors} ошибок)</span>
                )}
              </span>
            </div>
          )}
          {metrics?.networkIn != null && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>
                Сеть: ↓{(metrics.networkIn / 1024).toFixed(1)} КБ/с ↑{(metrics.networkOut / 1024).toFixed(1)} КБ/с
              </span>
            </div>
          )}
        </div>

        {/* Tags + Connection Panel Layout */}
        <div className="flex gap-4">
          {/* 3. Live Tag Values Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Значения тегов в реальном времени
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {tags.length} тегов
              </Badge>
            </div>

            {tags.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Radio className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Ожидание данных от WebSocket брокера...</p>
                  <p className="text-xs mt-1">
                    {connectionStatus === 'connected'
                      ? 'Подключение установлено, ожидается поток данных'
                      : 'Подключение к потоку данных ещё не установлено'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedTags.map((tag) => (
                  <TagCard
                    key={tag.name}
                    tag={tag}
                    sparklineData={tagSparklines.get(tag.name) || []}
                    expanded={expandedTags.has(tag.name)}
                    onToggleExpand={() => toggleTagExpand(tag.name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 5. Connection Status Panel (Right Sidebar on Desktop) */}
          <div className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-4">
              <ConnectionStatusPanel
                connections={statusData?.connections || []}
                devicesOnline={statusData?.devicesOnline ?? 0}
                totalTags={statusData?.totalTags ?? tags.length}
                activeAlarms={statusData?.activeAlarms ?? alarms.filter(a => a.event === 'triggered').length}
                visible={true}
                onToggle={() => setShowConnectionPanel(p => !p)}
              />
            </div>
          </div>
        </div>

        {/* Mobile Connection Panel */}
        <div className="lg:hidden">
          <ConnectionStatusPanel
            connections={statusData?.connections || []}
            devicesOnline={statusData?.devicesOnline ?? 0}
            totalTags={statusData?.totalTags ?? tags.length}
            activeAlarms={statusData?.activeAlarms ?? alarms.filter(a => a.event === 'triggered').length}
            visible={showConnectionPanel}
            onToggle={() => setShowConnectionPanel(p => !p)}
          />
        </div>

        {/* 4. Alarm Ticker */}
        <AlarmTicker alarms={alarms} />
      </div>
    </div>
  );
}

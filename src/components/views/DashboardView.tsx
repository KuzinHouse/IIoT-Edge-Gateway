'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Cpu, HardDrive, Info, Layers, Monitor,
  Radio, Server, TrendingUp, TrendingDown, Minus, Wifi,
  Zap, Clock, XCircle, Database, Gauge, Bell, WifiOff,
  RefreshCw, Eye, GitBranch, Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis,
  AreaChart, Area,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  onNavigate?: (section: string) => void;
}

interface LiveTag {
  name: string;
  value: number;
  unit: string;
  quality: string;
  groupName: string;
  dataType: string;
  history: { time: number; value: number }[];
}

interface LiveMetrics {
  cpu: number;
  memory: number;
  disk: number;
  tagsPerSecond: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
}

interface LiveAlarm {
  id: string;
  name: string;
  severity: string;
  event: string;
  message: string;
  timestamp: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return d.toLocaleDateString('ru-RU');
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}д ${h}ч ${m}м`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  // WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [msgCount, setMsgCount] = useState(0);

  // Live data
  const [metrics, setMetrics] = useState<LiveMetrics>({
    cpu: 34, memory: 62, disk: 45, tagsPerSecond: 125,
    networkIn: 0, networkOut: 0, uptime: 864000,
  });
  const [liveTags, setLiveTags] = useState<Map<string, LiveTag>>(new Map());
  const [liveAlarms, setLiveAlarms] = useState<LiveAlarm[]>([]);

  // Metrics history for sparklines
  const metricsHistory = useRef<{ time: number; cpu: number; memory: number; tps: number }[]>([]);

  // Fallback simulation when WS not connected
  useEffect(() => {
    if (wsStatus === 'connected') return;
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.max(30, Math.min(90, prev.memory + (Math.random() - 0.5) * 4)),
        tagsPerSecond: Math.max(50, Math.min(300, prev.tagsPerSecond + (Math.random() - 0.5) * 20)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [wsStatus]);

  // WebSocket connection
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    let reconnectAttempts = 0;

    function connect() {
      try {
        const ws = new WebSocket('/?XTransformPort=8503');
        wsRef.current = ws;
        setWsStatus('connecting');

        ws.onopen = () => {
          setWsStatus('connected');
          reconnectAttempts = 0;
          ws.send(JSON.stringify({ type: 'subscribe', channels: ['tags', 'metrics', 'alarms', 'status'] }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            setMsgCount(prev => prev + 1);

            if (msg.channel === 'metrics' && msg.data) {
              const m = msg.data;
              setMetrics({
                cpu: m.cpu ?? 34,
                memory: m.memory ?? 62,
                disk: m.disk ?? 45,
                tagsPerSecond: m.tagsPerSecond ?? 125,
                networkIn: m.networkIn ?? 0,
                networkOut: m.networkOut ?? 0,
                uptime: m.uptime ?? 864000,
              });
              metricsHistory.current.push({
                time: Date.now(),
                cpu: m.cpu ?? 34,
                memory: m.memory ?? 62,
                tps: m.tagsPerSecond ?? 125,
              });
              if (metricsHistory.current.length > 60) metricsHistory.current.shift();
            }

            if (msg.channel === 'tags' && msg.data) {
              const tags = msg.data.tags || [];
              setLiveTags(prev => {
                const next = new Map(prev);
                tags.forEach((tag: any) => {
                  const existing = next.get(tag.name);
                  const history = existing ? [...existing.history, { time: Date.now(), value: tag.value }] : [{ time: Date.now(), value: tag.value }];
                  if (history.length > 30) history.shift();
                  next.set(tag.name, { ...tag, history });
                });
                return next;
              });
            }

            if (msg.channel === 'alarms' && msg.data) {
              setLiveAlarms(prev => [msg.data, ...prev].slice(0, 20));
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          reconnectAttempts++;
          const delay = Math.min(reconnectAttempts * 1000, 30000);
          reconnectTimer = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // Top tags for live display (use WS data or fallback to first N tags)
  const topTagNames = [
    'Температура подшипника', 'Давление', 'Расход',
    'Скорость двигателя', 'Вибрация', 'Ток',
  ];

  const topTags = useMemo(() => {
    if (liveTags.size === 0) return [];
    // Try prefix matching against preferred names
    const matched: LiveTag[] = [];
    const usedKeys = new Set<string>();
    for (const prefix of topTagNames) {
      for (const [key, tag] of liveTags.entries()) {
        if (!usedKeys.has(key) && key.toLowerCase().startsWith(prefix.toLowerCase())) {
          matched.push(tag);
          usedKeys.add(key);
          break;
        }
      }
    }
    // Fill remaining slots from unselected tags
    if (matched.length < 6) {
      for (const [key, tag] of liveTags.entries()) {
        if (!usedKeys.has(key) && matched.length < 6) {
          matched.push(tag);
          usedKeys.add(key);
        }
      }
    }
    return matched;
  }, [liveTags]);

  // Recent alarms (use live alarms if available, else fallback)
  const recentAlarms = liveAlarms.length > 0
    ? liveAlarms.slice(0, 5).map((a, i) => ({
        id: a.id || `ws-alarm-${i}-${a.timestamp}`,
        name: a.name,
        severity: a.severity || 'info',
        ts: a.timestamp,
        event: a.event,
      }))
    : [
        { id: 'a1', name: 'Высокая температура насоса', severity: 'critical' as const, ts: new Date(Date.now() - 1800000).toISOString(), event: 'triggered' },
        { id: 'a2', name: 'Потеря связи с OPC UA', severity: 'critical' as const, ts: new Date(Date.now() - 7200000).toISOString(), event: 'triggered' },
        { id: 'a3', name: 'Низкое давление в линии', severity: 'warning' as const, ts: new Date(Date.now() - 3600000).toISOString(), event: 'triggered' },
        { id: 'a4', name: 'Высокая вибрация двигателя', severity: 'warning' as const, ts: new Date(Date.now() - 5400000).toISOString(), event: 'triggered' },
        { id: 'a5', name: 'Обновление прошивки доступно', severity: 'info' as const, ts: new Date(Date.now() - 86400000).toISOString(), event: 'triggered' },
      ];

  const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    critical: { color: 'border-red-500/30 bg-red-500/5', icon: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" /> },
    warning: { color: 'border-amber-500/30 bg-amber-500/5', icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> },
    info: { color: 'border-sky-500/30 bg-sky-500/5', icon: <Info className="h-4 w-4 text-sky-500 shrink-0" /> },
  };

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const configs: Record<string, { label: string; cls: string }> = {
      critical: { label: 'Критично', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
      warning: { label: 'Внимание', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
      info: { label: 'Инфо', cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' },
    };
    const cfg = configs[severity] || configs.info;
    return <Badge variant="outline" className={cn('text-xs', cfg.cls)}>{cfg.label}</Badge>;
  };

  const connections = [
    { id: 'c1', name: 'Modbus TCP - Цех 1', type: 'Modbus TCP', status: 'connected', host: '192.168.1.10:502', msg: 15230 },
    { id: 'c2', name: 'Modbus RTU - Линия 2', type: 'Modbus RTU', status: 'connected', host: '/dev/ttyUSB0', msg: 8400 },
    { id: 'c3', name: 'OPC UA Server', type: 'OPC UA', status: 'disconnected', host: '192.168.1.100:4840', msg: 0 },
    { id: 'c4', name: 'SNMP Switch', type: 'SNMP v2c', status: 'connected', host: '192.168.1.1:161', msg: 3200 },
    { id: 'c5', name: 'MQTT Cloud', type: 'MQTT v5', status: 'running', host: 'mqtt.eclipseprojects.io:1883', msg: 15230 },
    { id: 'c6', name: 'Kafka Pipeline', type: 'Kafka', status: 'running', host: 'kafka.local:9092', msg: 84200 },
    { id: 'c7', name: 'HTTP API Push', type: 'HTTP', status: 'stopped', host: 'api.example.com', msg: 0 },
  ];

  const components = [
    { name: 'Database', status: 'healthy', icon: <Database className="h-4 w-4" /> },
    { name: 'Modbus Engine', status: 'healthy', icon: <Gauge className="h-4 w-4" /> },
    { name: 'MQTT Broker', status: 'healthy', icon: <Radio className="h-4 w-4" /> },
    { name: 'Flow Engine', status: 'healthy', icon: <Activity className="h-4 w-4" /> },
    { name: 'WS Stream', status: wsStatus === 'connected' ? 'healthy' : 'error', icon: <Wifi className="h-4 w-4" /> },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected': case 'running': return 'bg-emerald-500';
      case 'disconnected': case 'stopped': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'connected': case 'running': return 'Активно';
      case 'disconnected': case 'stopped': return 'Остановлено';
      case 'error': return 'Ошибка';
      default: return status;
    }
  };

  const wsStatusConfig = {
    connecting: { color: 'bg-amber-500', label: 'Подключение...', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
    connected: { color: 'bg-emerald-500', label: 'Live', icon: <Wifi className="h-3 w-3" /> },
    disconnected: { color: 'bg-gray-400', label: 'Офлайн', icon: <WifiOff className="h-3 w-3" /> },
  };

  const qualityColor = (q: string) => {
    switch (q) {
      case 'good': return 'text-emerald-500';
      case 'bad': return 'text-red-500';
      case 'uncertain': return 'text-amber-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Stream Status Bar */}
      <div className={cn(
        'flex items-center gap-3 rounded-lg border p-3 text-sm',
        wsStatus === 'connected'
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : wsStatus === 'connecting'
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-muted bg-muted/30'
      )}>
        <span className={cn('relative flex h-2.5 w-2.5 shrink-0 rounded-full', wsStatusConfig[wsStatus].color)}>
          {wsStatus === 'connected' && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
        </span>
        {wsStatusConfig[wsStatus].icon}
        <span className="font-medium">{wsStatusConfig[wsStatus].label}</span>
        <span className="text-muted-foreground hidden sm:inline">
          {wsStatus === 'connected' ? 'Поток данных в реальном времени' : 'Моделирование данных'}
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatNumber(msgCount)} сообщений</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate?.('monitoring')}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Полный мониторинг</TooltipContent>
          </Tooltip>
          {liveAlarms.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 relative" onClick={() => onNavigate?.('alarms')}>
                  <Bell className="h-3.5 w-3.5" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {liveAlarms.length}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Аварии ({liveAlarms.length})</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Устройства', value: 5, sub: '3 онлайн', icon: <Monitor className="h-5 w-5 text-emerald-500" />, bg: 'bg-emerald-500/10', onClick: () => onNavigate?.('south') },
          { label: 'Соединения', value: 7, sub: '5 активно', icon: <Wifi className="h-5 w-5 text-sky-500" />, bg: 'bg-sky-500/10', onClick: () => onNavigate?.('north') },
          { label: 'Теги', value: liveTags.size || 18, sub: `${Math.max(liveTags.size - 1, 15)} хороших`, icon: <Layers className="h-5 w-5 text-violet-500" />, bg: 'bg-violet-500/10', onClick: () => onNavigate?.('tags') },
          { label: 'Аварии', value: liveAlarms.filter(a => a.event === 'triggered').length || 4, sub: '1 критичная', icon: <AlertCircle className="h-5 w-5 text-red-500" />, bg: 'bg-red-500/10', onClick: () => onNavigate?.('alarms') },
        ].map(s => (
          <Card key={s.label} className="gap-4 py-4 cursor-pointer transition-colors hover:bg-accent/50" onClick={s.onClick}>
            <CardContent className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', s.bg)}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                <div className="flex items-center gap-1 text-xs text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>{s.sub}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health + Alarms + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Системное здоровье
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Статус</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Норма</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="text-sm font-medium">{formatUptime(metrics.uptime)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Версия</span>
              <Badge variant="outline" className="text-xs">v2.1.0</Badge>
            </div>
            <Separator />
            <div className="space-y-3">
              {[
                { label: 'CPU', value: metrics.cpu, icon: <Cpu className="h-3.5 w-3.5" />, color: metrics.cpu > 80 ? 'text-red-500' : metrics.cpu > 60 ? 'text-amber-500' : '' },
                { label: 'RAM', value: metrics.memory, icon: <HardDrive className="h-3.5 w-3.5" />, color: metrics.memory > 85 ? 'text-red-500' : metrics.memory > 70 ? 'text-amber-500' : '' },
                { label: 'Диск', value: metrics.disk, icon: <Zap className="h-3.5 w-3.5" />, color: '' },
              ].map(item => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">{item.icon} {item.label}</span>
                    <span className={cn('font-medium', item.color)}>{Math.round(item.value)}%</span>
                  </div>
                  <Progress value={item.value} className="h-2" />
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Компоненты</p>
              {components.map(c => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">{c.icon} {c.name}</span>
                  <span className={cn('h-2 w-2 rounded-full', c.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500')} />
                </div>
              ))}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Теги/сек</p>
                <p className="text-lg font-bold">{Math.round(metrics.tagsPerSecond)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Сеть</p>
                <div className="flex items-center justify-center gap-1 text-xs">
                  <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                  <span>{formatNumber(metrics.networkIn)}</span>
                  <ArrowUpRight className="h-3 w-3 text-sky-500 ml-1" />
                  <span>{formatNumber(metrics.networkOut)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alarms */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Последние аварии
                {wsStatus === 'connected' && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Live</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate?.('alarms')}>
                Все <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentAlarms.map(alarm => {
                const cfg = severityConfig[alarm.severity] || severityConfig.info;
                return (
                  <div key={alarm.id} className={cn('flex items-start gap-3 rounded-lg border p-2.5 text-sm', cfg?.color)}>
                    {cfg?.icon}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{alarm.name}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(alarm.ts)}</p>
                    </div>
                    <SeverityBadge severity={alarm.severity} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions + Live TPS Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              Быстрые действия
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Мониторинг', icon: <Activity className="h-4 w-4" />, section: 'monitoring', color: 'text-emerald-600 bg-emerald-500/10' },
                { label: 'Пайплайны', icon: <GitBranch className="h-4 w-4" />, section: 'pipeline', color: 'text-violet-600 bg-violet-500/10' },
                { label: 'Диагностика', icon: <Wrench className="h-4 w-4" />, section: 'diagnostics', color: 'text-amber-600 bg-amber-500/10' },
                { label: 'Теги', icon: <Layers className="h-4 w-4" />, section: 'tags', color: 'text-sky-600 bg-sky-500/10' },
              ].map(action => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto flex-col gap-2 py-3 hover:bg-accent/50"
                  onClick={() => onNavigate?.(action.section)}
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', action.color)}>
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              ))}
            </div>

            <Separator />

            {/* Mini TPS chart */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Пропускная способность</span>
                <span className="font-bold">{Math.round(metrics.tagsPerSecond)} <span className="text-xs text-muted-foreground font-normal">тег/с</span></span>
              </div>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsHistory.current.slice(-30)}>
                    <defs>
                      <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="tps" stroke="hsl(var(--primary))" fill="url(#tpsGrad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Separator />

            {/* Mini CPU chart */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">CPU нагрузка</span>
                <span className={cn('font-bold', metrics.cpu > 80 ? 'text-red-500' : '')}>{Math.round(metrics.cpu)}%</span>
              </div>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricsHistory.current.slice(-30)}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metrics.cpu > 80 ? '#ef4444' : metrics.cpu > 60 ? '#f59e0b' : '#10b981'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={metrics.cpu > 80 ? '#ef4444' : metrics.cpu > 60 ? '#f59e0b' : '#10b981'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="cpu" stroke={metrics.cpu > 80 ? '#ef4444' : metrics.cpu > 60 ? '#f59e0b' : '#10b981'} fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Tag Values with Sparklines */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Live теги
              {wsStatus === 'connected' && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse">
                  ● Live
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate?.('monitoring')}>
                Мониторинг <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate?.('diagnostics')}>
                Тестер <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {topTags.length > 0 ? (topTags.map(tag => {
              const prevVal = tag.history.length >= 2 ? tag.history[tag.history.length - 2].value : tag.value;
              const trend = tag.value > prevVal ? 'up' : tag.value < prevVal ? 'down' : 'stable';
              const trendIcon = trend === 'up'
                ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                : trend === 'down'
                  ? <TrendingDown className="h-3 w-3 text-red-500" />
                  : <Minus className="h-3 w-3 text-gray-400" />;

              return (
                <div key={tag.name} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{tag.name}</span>
                    {trendIcon}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-xl font-bold', qualityColor(tag.quality))}>
                      {tag.dataType === 'BOOL'
                        ? (tag.value ? 'ВКЛ' : 'ВЫКЛ')
                        : typeof tag.value === 'number' ? tag.value.toFixed(1) : tag.value}
                    </span>
                    {tag.unit && <span className="text-xs text-muted-foreground">{tag.unit}</span>}
                  </div>
                  <div className="h-8">
                    {tag.history.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tag.history}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={tag.quality === 'good' ? '#10b981' : tag.quality === 'uncertain' ? '#f59e0b' : '#ef4444'}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        Ожидание данных...
                      </div>
                    )}
                  </div>
                </div>
              );
            })  ) : (
              <div className="col-span-full flex items-center justify-center h-32 text-sm text-muted-foreground">
                Нет данных тегов
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connections Status Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Server className="h-4 w-4 text-primary" />
              Статус соединений
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate?.('south')}>
              Управление <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30">
                <span className={cn('relative flex h-2.5 w-2.5 shrink-0 rounded-full', statusColor(conn.status))}>
                  {(conn.status === 'connected' || conn.status === 'running') && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'currentColor' }} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{conn.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{conn.host}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{conn.type}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{statusLabel(conn.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

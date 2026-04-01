'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Search, Trash2, Edit, AlertCircle, AlertTriangle,
  Info, CheckCircle2, Clock, XCircle, Filter, History,
  Bell, Shield, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ==================== Types ====================
interface ActiveAlarm {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  device: string;
  tag: string;
  value: string;
  setpoint: string;
  triggeredAt: string;
  state: 'active' | 'acknowledged';
  acknowledged: boolean;
}

interface AlarmRule {
  id: string;
  name: string;
  tag: string;
  condition: string;
  setpoint: number;
  severity: 'critical' | 'warning' | 'info';
  device: string;
  enabled: boolean;
  lastTriggered: string | null;
  deadband?: number;
  delay?: number;
}

interface HistoryEntry {
  id: string;
  eventType: 'triggered' | 'acknowledged' | 'cleared';
  alarmName: string;
  severity: 'critical' | 'warning' | 'info';
  value: string;
  user: string | null;
  timestamp: string;
}

// ==================== Mock Data ====================
const initialActiveAlarms: ActiveAlarm[] = [
  { id: 'a1', name: 'Высокая температура насоса', severity: 'critical', device: 'PLC S7-1200', tag: 'Температура насоса', value: '87.3°C', setpoint: '85°C', triggeredAt: new Date(Date.now() - 1800000).toISOString(), state: 'active', acknowledged: false },
  { id: 'a2', name: 'Потеря связи с OPC UA', severity: 'critical', device: 'OPC UA Server', tag: '—', value: '—', setpoint: '—', triggeredAt: new Date(Date.now() - 7200000).toISOString(), state: 'active', acknowledged: false },
  { id: 'a3', name: 'Низкое давление в линии', severity: 'warning', device: 'PLC S7-1200', tag: 'Давление линии', value: '2.1 бар', setpoint: '2.5 бар', triggeredAt: new Date(Date.now() - 3600000).toISOString(), state: 'active', acknowledged: true },
  { id: 'a4', name: 'Высокая вибрация двигателя', severity: 'warning', device: 'Motor Drive ABB', tag: 'Вибрация', value: '4.8 мм/с', setpoint: '4.0 мм/с', triggeredAt: new Date(Date.now() - 5400000).toISOString(), state: 'active', acknowledged: false },
  { id: 'a5', name: 'Обновление прошивки доступно', severity: 'info', device: '—', tag: '—', value: '—', setpoint: '—', triggeredAt: new Date(Date.now() - 86400000).toISOString(), state: 'acknowledged', acknowledged: true },
];

const initialAlarmRules: AlarmRule[] = [
  { id: 'r1', name: 'Температура насоса > 85°C', tag: 'Температура насоса', condition: '>', setpoint: 85, severity: 'critical', device: 'PLC S7-1200', enabled: true, lastTriggered: new Date(Date.now() - 1800000).toISOString(), deadband: 0.5, delay: 5 },
  { id: 'r2', name: 'Давление < 2.5 бар', tag: 'Давление линии', condition: '<', setpoint: 2.5, severity: 'warning', device: 'PLC S7-1200', enabled: true, lastTriggered: new Date(Date.now() - 3600000).toISOString(), deadband: 0.1, delay: 10 },
  { id: 'r3', name: 'Вибрация > 4.0 мм/с', tag: 'Вибрация', condition: '>', setpoint: 4.0, severity: 'warning', device: 'Motor Drive ABB', enabled: true, lastTriggered: new Date(Date.now() - 5400000).toISOString(), deadband: 0.2, delay: 3 },
  { id: 'r4', name: 'Скорость > 3000 об/мин', tag: 'Скорость двигателя', condition: '>', setpoint: 3000, severity: 'critical', device: 'Motor Drive ABB', enabled: false, lastTriggered: null, deadband: 50, delay: 0 },
  { id: 'r5', name: 'Уровень < 200 мм', tag: 'Уровень бака', condition: '<', setpoint: 200, severity: 'warning', device: 'PLC S7-1200', enabled: true, lastTriggered: new Date(Date.now() - 172800000).toISOString(), deadband: 5, delay: 15 },
  { id: 'r6', name: 'Температура подшипника > 80°C', tag: 'Температура подшипника', condition: '>', setpoint: 80, severity: 'critical', device: 'Motor Drive ABB', enabled: true, lastTriggered: new Date(Date.now() - 432000000).toISOString(), deadband: 1.0, delay: 2 },
];

const initialHistory: HistoryEntry[] = [
  { id: 'h1', eventType: 'triggered', alarmName: 'Температура насоса > 85°C', severity: 'critical', value: '87.3°C', user: null, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'h2', eventType: 'acknowledged', alarmName: 'Низкое давление в линии', severity: 'warning', value: '2.1 бар', user: 'admin', timestamp: new Date(Date.now() - 2700000).toISOString() },
  { id: 'h3', eventType: 'triggered', alarmName: 'Вибрация > 4.0 мм/с', severity: 'warning', value: '4.8 мм/с', user: null, timestamp: new Date(Date.now() - 5400000).toISOString() },
  { id: 'h4', eventType: 'cleared', alarmName: 'Высокий ток фазы A', severity: 'warning', value: '12.5A', user: 'admin', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'h5', eventType: 'triggered', alarmName: 'Потеря связи с OPC UA', severity: 'critical', value: '—', user: null, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'h6', eventType: 'acknowledged', alarmName: 'Температура насоса > 85°C', severity: 'critical', value: '86.1°C', user: 'admin', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'h7', eventType: 'cleared', alarmName: 'Температура насоса > 85°C', severity: 'critical', value: '84.2°C', user: null, timestamp: new Date(Date.now() - 90000000).toISOString() },
  { id: 'h8', eventType: 'triggered', alarmName: 'Обновление прошивки', severity: 'info', value: 'v2.2.0', user: null, timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'h9', eventType: 'triggered', alarmName: 'Уровень < 200 мм', severity: 'warning', value: '185 мм', user: null, timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: 'h10', eventType: 'cleared', alarmName: 'Уровень < 200 мм', severity: 'warning', value: '210 мм', user: null, timestamp: new Date(Date.now() - 172700000).toISOString() },
];

const AVAILABLE_TAGS = ['Температура насоса', 'Давление линии', 'Расход воды', 'Уровень бака', 'Скорость двигателя', 'Включение насоса', 'Влажность', 'Ток фазы A', 'Вибрация', 'Температура подшипника', 'Давление воздуха', 'Мощность'];
const OPERATORS = ['>', '<', '==', '!=', '>=', '<='];
const DEVICES = ['PLC S7-1200', 'Motor Drive ABB', 'Flow Meter', 'Temp Sensor', 'Pressure Transmitter'];

// ==================== Helpers ====================
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

// ==================== Component ====================
export function AlarmsView() {
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>(initialActiveAlarms);
  const [alarmRules, setAlarmRules] = useState<AlarmRule[]>(initialAlarmRules);
  const [history] = useState<HistoryEntry[]>(initialHistory);

  const [alarmSearch, setAlarmSearch] = useState('');
  const [alarmSeverityFilter, setAlarmSeverityFilter] = useState('all');
  const [ruleSearch, setRuleSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyEventFilter, setHistoryEventFilter] = useState('all');

  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<AlarmRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '', tag: '', condition: '>', setpoint: 0, severity: 'warning' as 'critical' | 'warning' | 'info',
    device: '', deadband: 0, delay: 0, enabled: true,
  });

  // Acknowledge alarm
  const ackAlarm = (id: string) => {
    setActiveAlarms(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true, state: 'acknowledged' as const } : a));
  };

  const ackAllAlarms = () => {
    setActiveAlarms(prev => prev.map(a => ({ ...a, acknowledged: true, state: 'acknowledged' as const })));
  };

  // Save rule
  const openAddRule = () => {
    setEditRule(null);
    setRuleForm({ name: '', tag: '', condition: '>', setpoint: 0, severity: 'warning', device: '', deadband: 0, delay: 0, enabled: true });
    setRuleDialogOpen(true);
  };

  const openEditRule = (rule: AlarmRule) => {
    setEditRule(rule);
    setRuleForm({
      name: rule.name, tag: rule.tag, condition: rule.condition, setpoint: rule.setpoint,
      severity: rule.severity, device: rule.device, deadband: rule.deadband || 0, delay: rule.delay || 0, enabled: rule.enabled,
    });
    setRuleDialogOpen(true);
  };

  const saveRule = () => {
    if (editRule) {
      setAlarmRules(prev => prev.map(r => r.id === editRule.id ? { ...r, ...ruleForm, lastTriggered: editRule.lastTriggered } : r));
    } else {
      setAlarmRules(prev => [...prev, { id: `r${Date.now()}`, ...ruleForm, lastTriggered: null }]);
    }
    setRuleDialogOpen(false);
  };

  const deleteRule = (id: string) => {
    setAlarmRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleRule = (id: string) => {
    setAlarmRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  // Filters
  const filteredAlarms = useMemo(() => activeAlarms.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(alarmSearch.toLowerCase());
    const matchSeverity = alarmSeverityFilter === 'all' || a.severity === alarmSeverityFilter;
    return matchSearch && matchSeverity;
  }), [activeAlarms, alarmSearch, alarmSeverityFilter]);

  const filteredRules = useMemo(() => alarmRules.filter(r => r.name.toLowerCase().includes(ruleSearch.toLowerCase())), [alarmRules, ruleSearch]);
  const filteredHistory = useMemo(() => history.filter(h => {
    const matchSearch = h.alarmName.toLowerCase().includes(historySearch.toLowerCase());
    const matchEvent = historyEventFilter === 'all' || h.eventType === historyEventFilter;
    return matchSearch && matchEvent;
  }), [history, historySearch, historyEventFilter]);

  const severityCounts = {
    total: activeAlarms.length,
    active: activeAlarms.filter(a => !a.acknowledged).length,
    critical: activeAlarms.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    warning: activeAlarms.filter(a => a.severity === 'warning' && !a.acknowledged).length,
  };

  const severityConfig = {
    critical: { icon: <AlertCircle className="h-4 w-4 text-red-500" />, badgeCls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', label: 'Критично' },
    warning: { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Внимание' },
    info: { icon: <Info className="h-4 w-4 text-sky-500" />, badgeCls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30', label: 'Инфо' },
  };

  const eventConfig = {
    triggered: { icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />, label: 'Сработала', color: 'text-red-600 dark:text-red-400' },
    acknowledged: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />, label: 'Квитирована', color: 'text-amber-600 dark:text-amber-400' },
    cleared: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, label: 'Сброшена', color: 'text-emerald-600 dark:text-emerald-400' },
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <Bell className="h-4 w-4" />
            Активные
            {severityCounts.active > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] rounded-full px-1 text-[10px]">{severityCounts.active}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Правила
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] rounded-full px-1 text-[10px]">{alarmRules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            Журнал
          </TabsTrigger>
        </TabsList>

        {/* ===== ACTIVE ALARMS TAB ===== */}
        <TabsContent value="active" className="space-y-4 mt-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="py-3"><CardContent className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><div><p className="text-xs text-muted-foreground">Всего</p><p className="text-xl font-bold">{severityCounts.total}</p></div></CardContent></Card>
            <Card className="py-3"><CardContent className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><div><p className="text-xs text-muted-foreground">Активных</p><p className="text-xl font-bold">{severityCounts.active}</p></div></CardContent></Card>
            <Card className="py-3"><CardContent className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-500" /><div><p className="text-xs text-muted-foreground">Критичных</p><p className="text-xl font-bold text-red-500">{severityCounts.critical}</p></div></CardContent></Card>
            <Card className="py-3"><CardContent className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-500" /><div><p className="text-xs text-muted-foreground">Внимание</p><p className="text-xl font-bold text-amber-500">{severityCounts.warning}</p></div></CardContent></Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={ackAllAlarms} disabled={severityCounts.active === 0}>
              <CheckCircle2 className="h-4 w-4" /> Квитировать все
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск аварий..." value={alarmSearch} onChange={e => setAlarmSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={alarmSeverityFilter} onValueChange={setAlarmSeverityFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Все важности" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все важности</SelectItem>
                <SelectItem value="critical">Критичные</SelectItem>
                <SelectItem value="warning">Внимание</SelectItem>
                <SelectItem value="info">Инфо</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alarm List */}
          <div className="space-y-2">
            {filteredAlarms.map(alarm => {
              const sc = severityConfig[alarm.severity];
              return (
                <div key={alarm.id} className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  alarm.acknowledged ? 'opacity-60' : '',
                  alarm.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                  alarm.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                  'border-sky-500/30 bg-sky-500/5'
                )}>
                  {sc.icon}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{alarm.name}</p>
                      <Badge variant="outline" className={cn('text-[10px]', sc.badgeCls)}>{sc.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Устройство: {alarm.device}</span>
                      {alarm.tag !== '—' && <span>Тег: {alarm.tag}</span>}
                      {alarm.value !== '—' && <span>Значение: <span className="font-medium text-foreground">{alarm.value}</span></span>}
                      {alarm.setpoint !== '—' && <span>Порог: {alarm.setpoint}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(alarm.triggeredAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alarm.state === 'active' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => ackAlarm(alarm.id)}>
                        <CheckCircle2 className="h-3 w-3" /> Квитировать
                      </Button>
                    )}
                    {alarm.acknowledged && (
                      <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Квитирована</Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredAlarms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-500 opacity-50" />
                <p>Нет активных аварий</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== ALARM RULES TAB ===== */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" className="gap-1.5" onClick={openAddRule}>
              <Plus className="h-4 w-4" /> Добавить правило
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск правил..." value={ruleSearch} onChange={e => setRuleSearch(e.target.value)} className="pl-8" />
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тег</TableHead>
                  <TableHead>Условие</TableHead>
                  <TableHead>Важность</TableHead>
                  <TableHead>Устройство</TableHead>
                  <TableHead>Последнее срабатывание</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map(rule => {
                  const sc = severityConfig[rule.severity];
                  return (
                    <TableRow key={rule.id} className={cn(!rule.enabled && 'opacity-50')}>
                      <TableCell>
                        <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} className="scale-75" />
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="font-mono text-sm">{rule.tag}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {rule.condition} {rule.setpoint}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', sc.badgeCls)}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rule.device}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rule.lastTriggered ? formatTime(rule.lastTriggered) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRule(rule)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск в журнале..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={historyEventFilter} onValueChange={setHistoryEventFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Все события" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все события</SelectItem>
                <SelectItem value="triggered">Сработала</SelectItem>
                <SelectItem value="acknowledged">Квитирована</SelectItem>
                <SelectItem value="cleared">Сброшена</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Событие</TableHead>
                  <TableHead>Авария</TableHead>
                  <TableHead>Важность</TableHead>
                  <TableHead>Значение</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Время</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map(entry => {
                  const ec = eventConfig[entry.eventType];
                  const sc = severityConfig[entry.severity];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{ec.icon}</TableCell>
                      <TableCell className={cn('text-xs font-medium', ec.color)}>{ec.label}</TableCell>
                      <TableCell className="text-sm font-medium">{entry.alarmName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', sc.badgeCls)}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.value}</TableCell>
                      <TableCell className="text-sm">{entry.user || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRule ? 'Редактировать правило' : 'Добавить правило'}</DialogTitle>
            <DialogDescription>Настройка правила мониторинга аварийных ситуаций</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder="Температура > 85°C" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Устройство</Label>
                <Select value={ruleForm.device} onValueChange={v => setRuleForm(f => ({ ...f, device: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>{DEVICES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тег</Label>
                <Select value={ruleForm.tag} onValueChange={v => setRuleForm(f => ({ ...f, tag: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите тег" /></SelectTrigger>
                  <SelectContent>{AVAILABLE_TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Оператор</Label>
                <Select value={ruleForm.condition} onValueChange={v => setRuleForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Порог</Label>
                <Input type="number" value={ruleForm.setpoint} onChange={e => setRuleForm(f => ({ ...f, setpoint: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Важность</Label>
                <Select value={ruleForm.severity} onValueChange={v => setRuleForm(f => ({ ...f, severity: v as AlarmRule['severity'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Критично</SelectItem>
                    <SelectItem value="warning">Внимание</SelectItem>
                    <SelectItem value="info">Инфо</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Гистерезис (Deadband)</Label>
                <Input type="number" step="0.1" value={ruleForm.deadband} onChange={e => setRuleForm(f => ({ ...f, deadband: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Задержка (сек)</Label>
                <Input type="number" value={ruleForm.delay} onChange={e => setRuleForm(f => ({ ...f, delay: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Включено</Label>
              <Switch checked={ruleForm.enabled} onCheckedChange={v => setRuleForm(f => ({ ...f, enabled: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveRule} disabled={!ruleForm.name || !ruleForm.tag}>{editRule ? 'Сохранить' : 'Добавить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Trash2, Pencil, TrendingUp, TrendingDown, Minus,
  Eye, PenLine, ChevronRight, ChevronDown, Layers, Tag,
  Activity, Filter, LayoutGrid, List, XCircle,
  AlertTriangle, CheckCircle2, HelpCircle, Play, Square,
  ArrowUpDown, Settings2, Bell, Gauge, Clock, Database,
  Info, ScanLine
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================
interface Tag {
  id: string;
  name: string;
  address: string;
  group: string;
  dataType: 'BOOL' | 'INT16' | 'UINT16' | 'INT32' | 'UINT32' | 'FLOAT' | 'DOUBLE' | 'STRING';
  value: number;
  unit: string;
  quality: 'good' | 'bad' | 'uncertain';
  access: 'read' | 'write' | 'readWrite';
  device: string;
  trend: 'up' | 'down' | 'stable';
  min?: number;
  max?: number;
  description?: string;
  scaleFactor?: number;
  offset?: number;
  scanRate?: number;
  alarmEnabled?: boolean;
  alarmCondition?: string;
  alarmSetpoint?: number;
  alarmDeadband?: number;
  alarmDelay?: number;
  lastUpdate: Date;
}

// ============================================================
// Mock Data
// ============================================================
const initialTags: Tag[] = [
  { id: 't1', name: 'Температура насоса', address: '40001', group: 'Температура', dataType: 'FLOAT', value: 23.5, unit: '°C', quality: 'good', access: 'read', device: 'PLC S7-1200', trend: 'up', min: 0, max: 100, description: 'Температура корпуса насоса', scaleFactor: 1, offset: 0, scanRate: 1000, lastUpdate: new Date() },
  { id: 't2', name: 'Давление линии', address: '40002', group: 'Давление', dataType: 'FLOAT', value: 101.3, unit: 'kPa', quality: 'good', access: 'readWrite', device: 'PLC S7-1200', trend: 'stable', min: 0, max: 200, description: 'Давление в напорной линии', scaleFactor: 1, offset: 0, scanRate: 500, lastUpdate: new Date() },
  { id: 't3', name: 'Расход воды', address: '40003', group: 'Расход', dataType: 'FLOAT', value: 125.4, unit: 'м³/ч', quality: 'good', access: 'read', device: 'Flow Meter', trend: 'down', min: 0, max: 500, description: 'Объёмный расход воды', scaleFactor: 1, offset: 0, scanRate: 2000, lastUpdate: new Date() },
  { id: 't4', name: 'Уровень бака', address: '30001', group: 'Уровень', dataType: 'INT16', value: 678, unit: 'мм', quality: 'good', access: 'read', device: 'PLC S7-1200', trend: 'up', min: 0, max: 1000, description: 'Уровень жидкости в накопительном баке', scaleFactor: 1, offset: 0, scanRate: 1000, lastUpdate: new Date() },
  { id: 't5', name: 'Скорость двигателя', address: '40004', group: 'Двигатели', dataType: 'UINT16', value: 1450, unit: 'об/мин', quality: 'bad', access: 'readWrite', device: 'Motor Drive', trend: 'down', min: 0, max: 3000, description: 'Текущая скорость вращения двигателя', scaleFactor: 1, offset: 0, scanRate: 500, alarmEnabled: true, alarmCondition: '>', alarmSetpoint: 2800, alarmDeadband: 50, alarmDelay: 5, lastUpdate: new Date() },
  { id: 't6', name: 'Включение насоса', address: '00001', group: 'Управление', dataType: 'BOOL', value: 1, unit: '', quality: 'good', access: 'readWrite', device: 'PLC S7-1200', trend: 'stable', description: 'Команда включения/выключения насоса', scaleFactor: 1, offset: 0, scanRate: 100, lastUpdate: new Date() },
  { id: 't7', name: 'Влажность', address: '40005', group: 'Окружающая среда', dataType: 'FLOAT', value: 45.2, unit: '%', quality: 'good', access: 'read', device: 'Temp Sensor', trend: 'up', min: 0, max: 100, description: 'Относительная влажность воздуха', scaleFactor: 1, offset: 0, scanRate: 5000, lastUpdate: new Date() },
  { id: 't8', name: 'Ток фазы A', address: '40006', group: 'Электричество', dataType: 'FLOAT', value: 12.7, unit: 'A', quality: 'good', access: 'read', device: 'Motor Drive', trend: 'stable', min: 0, max: 50, description: 'Сила тока фазы A', scaleFactor: 1, offset: 0, scanRate: 250, lastUpdate: new Date() },
  { id: 't9', name: 'Вибрация', address: '40007', group: 'Вибрация', dataType: 'FLOAT', value: 4.2, unit: 'мм/с', quality: 'uncertain', access: 'read', device: 'Motor Drive', trend: 'up', min: 0, max: 10, description: 'Вибрация подшипника двигателя', scaleFactor: 1, offset: 0, scanRate: 100, alarmEnabled: true, alarmCondition: '>', alarmSetpoint: 4.0, alarmDeadband: 0.5, alarmDelay: 2, lastUpdate: new Date() },
  { id: 't10', name: 'Температура подшипника', address: '40008', group: 'Температура', dataType: 'FLOAT', value: 52.1, unit: '°C', quality: 'good', access: 'read', device: 'Motor Drive', trend: 'stable', min: 0, max: 120, description: 'Температура подшипника двигателя', scaleFactor: 1, offset: 0, scanRate: 1000, alarmEnabled: true, alarmCondition: '>', alarmSetpoint: 80, alarmDeadband: 2, alarmDelay: 10, lastUpdate: new Date() },
  { id: 't11', name: 'Давление воздуха', address: '40009', group: 'Давление', dataType: 'FLOAT', value: 6.2, unit: 'бар', quality: 'good', access: 'readWrite', device: 'PLC S7-1200', trend: 'stable', min: 0, max: 10, description: 'Давление сжатого воздуха', scaleFactor: 1, offset: 0, scanRate: 1000, lastUpdate: new Date() },
  { id: 't12', name: 'Мощность', address: '40010', group: 'Электричество', dataType: 'FLOAT', value: 15.3, unit: 'кВт', quality: 'good', access: 'read', device: 'Motor Drive', trend: 'up', min: 0, max: 30, description: 'Потребляемая мощность', scaleFactor: 1, offset: 0, scanRate: 500, lastUpdate: new Date() },
];

// ============================================================
// Helpers
// ============================================================
function QualityDot({ quality }: { quality: string }) {
  const colors: Record<string, string> = {
    good: 'bg-emerald-500',
    bad: 'bg-red-500',
    uncertain: 'bg-amber-500',
  };
  return (
    <span className={cn(
      'relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full',
      colors[quality] || 'bg-gray-400'
    )}>
      {quality === 'good' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      )}
    </span>
  );
}

function QualityBadge({ quality }: { quality: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    good: { label: 'Хорошее', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    bad: { label: 'Плохое', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    uncertain: { label: 'Неопределённое', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  };
  const cfg = configs[quality] || configs.good;
  return <Badge variant="outline" className={cn('text-xs gap-1', cfg.className)}><QualityDot quality={quality} />{cfg.label}</Badge>;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getRegisterType(address: string): string {
  const prefix = address.substring(0, 1);
  switch (prefix) {
    case '0': return 'Coil (0xxxx)';
    case '1': return 'Discrete (1xxxx)';
    case '3': return 'Input (3xxxx)';
    case '4': return 'Holding (4xxxx)';
    default: return 'Holding (4xxxx)';
  }
}

// ============================================================
// Tag Value Card (Grid View)
// ============================================================
function TagValueCard({ tag, onRead, onWrite }: { tag: Tag; onRead: (tag: Tag) => void; onWrite: (tag: Tag) => void }) {
  const rangeMin = tag.min ?? 0;
  const rangeMax = tag.max ?? 100;
  const percent = rangeMax > rangeMin ? ((tag.value - rangeMin) / (rangeMax - rangeMin)) * 100 : 50;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      tag.quality === 'bad' && 'border-red-500/30',
      tag.quality === 'uncertain' && 'border-amber-500/30'
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{tag.name}</p>
            <p className="text-xs text-muted-foreground">{tag.group}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <QualityDot quality={tag.quality} />
            <TrendIcon trend={tag.trend} />
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            'text-3xl font-bold tabular-nums tracking-tight',
            tag.quality === 'bad' && 'text-red-500',
            tag.quality === 'uncertain' && 'text-amber-500'
          )}>
            {tag.dataType === 'BOOL' ? (tag.value ? 'ВКЛ' : 'ВЫКЛ') : tag.value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
          </span>
          {tag.unit && <span className="text-sm text-muted-foreground">{tag.unit}</span>}
        </div>

        {/* Range bar */}
        {tag.dataType !== 'BOOL' && tag.max !== undefined && tag.min !== undefined && (
          <div className="space-y-1">
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'absolute h-full rounded-full transition-all duration-500',
                  tag.quality === 'good' ? 'bg-emerald-500' : tag.quality === 'bad' ? 'bg-red-500' : 'bg-amber-500'
                )}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{rangeMin}</span>
              <span>{rangeMax}</span>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{tag.address}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{tag.dataType}</Badge>
            <span>{tag.device}</span>
          </div>
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRead(tag)}>
                  <ScanLine className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Прочитать</TooltipContent>
            </Tooltip>
            {tag.access !== 'read' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onWrite(tag)}>
                    <PenLine className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Записать</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1">
            {tag.alarmEnabled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Bell className="h-3.5 w-3.5 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>Аварийная сигнализация включена</TooltipContent>
              </Tooltip>
            )}
            <span className="text-[10px] text-muted-foreground">{formatTime(tag.lastUpdate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Add/Edit Tag Dialog
// ============================================================
interface TagFormData {
  name: string;
  description: string;
  device: string;
  registerType: string;
  address: string;
  dataType: Tag['dataType'];
  unit: string;
  scaleFactor: string;
  offset: string;
  scanRate: string;
  access: Tag['access'];
  group: string;
  alarmEnabled: boolean;
  alarmCondition: string;
  alarmSetpoint: string;
  alarmDeadband: string;
  alarmDelay: string;
  min: string;
  max: string;
}

const defaultTagForm: TagFormData = {
  name: '', description: '', device: 'PLC S7-1200',
  registerType: '4', address: '40001', dataType: 'FLOAT',
  unit: '', scaleFactor: '1', offset: '0', scanRate: '1000',
  access: 'read', group: '',
  alarmEnabled: false, alarmCondition: '>', alarmSetpoint: '', alarmDeadband: '0', alarmDelay: '0',
  min: '0', max: '100'
};

const deviceOptions = ['PLC S7-1200', 'Flow Meter', 'Temp Sensor', 'Motor Drive'];
const dataTypeOptions: Tag['dataType'][] = ['BOOL', 'INT16', 'UINT16', 'INT32', 'UINT32', 'FLOAT', 'DOUBLE', 'STRING'];

function TagFormDialog({
  open, onOpenChange, tag, onSave
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tag: Tag | null;
  onSave: (data: TagFormData) => void;
}) {
  const isEdit = !!tag;
  const [form, setForm] = useState<TagFormData>(defaultTagForm);
  const [activeTab, setActiveTab] = useState('general');

  const updateField = (field: keyof TagFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOpen = (open: boolean) => {
    if (open && tag) {
      setForm({
        name: tag.name,
        description: tag.description || '',
        device: tag.device,
        registerType: tag.address.substring(0, 1) || '4',
        address: tag.address,
        dataType: tag.dataType,
        unit: tag.unit,
        scaleFactor: String(tag.scaleFactor || 1),
        offset: String(tag.offset || 0),
        scanRate: String(tag.scanRate || 1000),
        access: tag.access,
        group: tag.group,
        alarmEnabled: tag.alarmEnabled || false,
        alarmCondition: tag.alarmCondition || '>',
        alarmSetpoint: String(tag.alarmSetpoint || ''),
        alarmDeadband: String(tag.alarmDeadband || 0),
        alarmDelay: String(tag.alarmDelay || 0),
        min: String(tag.min ?? 0),
        max: String(tag.max ?? 100),
      });
    } else if (open) {
      setForm(defaultTagForm);
    }
    setActiveTab('general');
    onOpenChange(open);
  };

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  const handleRegisterTypeChange = (type: string) => {
    const currentAddr = parseInt(form.address.substring(1)) || 1;
    setForm(prev => ({ ...prev, registerType: type, address: `${type}${String(currentAddr).padStart(4, '0')}` }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать тег' : 'Добавить тег'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените параметры тега данных' : 'Настройте новый тег для чтения/записи данных устройства'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="general" className="text-xs">
              <Tag className="mr-1 h-3.5 w-3.5" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="address" className="text-xs">
              <Database className="mr-1 h-3.5 w-3.5" />
              Адрес
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              <Settings2 className="mr-1 h-3.5 w-3.5" />
              Параметры
            </TabsTrigger>
            <TabsTrigger value="alarm" className="text-xs">
              <Bell className="mr-1 h-3.5 w-3.5" />
              Авария
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-2 pr-1">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Название</Label>
                <Input id="tag-name" placeholder="Название тега" value={form.name} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-desc">Описание</Label>
                <Textarea id="tag-desc" placeholder="Описание тега" value={form.description} onChange={e => updateField('description', e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Устройство</Label>
                  <Select value={form.device} onValueChange={v => updateField('device', v)}>
                    <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>
                      {deviceOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Группа</Label>
                  <Input placeholder="Группа" value={form.group} onChange={e => updateField('group', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Тип регистра</Label>
                <Select value={form.registerType} onValueChange={handleRegisterTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Coil (0xxxx) — Чтение/Запись</SelectItem>
                    <SelectItem value="1">Discrete Input (1xxxx) — Только чтение</SelectItem>
                    <SelectItem value="3">Input Register (3xxxx) — Только чтение</SelectItem>
                    <SelectItem value="4">Holding Register (4xxxx) — Чтение/Запись</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Адрес</Label>
                  <Input placeholder="40001" value={form.address} onChange={e => updateField('address', e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">{getRegisterType(form.address)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Тип данных</Label>
                  <Select value={form.dataType} onValueChange={v => updateField('dataType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dataTypeOptions.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Единицы</Label>
                  <Input placeholder="°C, bar..." value={form.unit} onChange={e => updateField('unit', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Масштаб</Label>
                  <Input type="number" step="0.1" placeholder="1.0" value={form.scaleFactor} onChange={e => updateField('scaleFactor', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Смещение</Label>
                  <Input type="number" step="0.1" placeholder="0" value={form.offset} onChange={e => updateField('offset', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Скорость опроса (мс)</Label>
                <Input type="number" placeholder="1000" value={form.scanRate} onChange={e => updateField('scanRate', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Режим доступа</Label>
                <Select value={form.access} onValueChange={v => updateField('access', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Только чтение</SelectItem>
                    <SelectItem value="write">Только запись</SelectItem>
                    <SelectItem value="readWrite">Чтение и запись</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Диапазон значений</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Минимум</Label>
                    <Input type="number" step="any" placeholder="0" value={form.min} onChange={e => updateField('min', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Максимум</Label>
                    <Input type="number" step="any" placeholder="100" value={form.max} onChange={e => updateField('max', e.target.value)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Alarm Tab */}
            <TabsContent value="alarm" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Аварийная сигнализация</Label>
                  <p className="text-xs text-muted-foreground">Включить проверку аварийных условий</p>
                </div>
                <Switch checked={form.alarmEnabled} onCheckedChange={v => updateField('alarmEnabled', v)} />
              </div>

              {form.alarmEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Условие</Label>
                    <Select value={form.alarmCondition} onValueChange={v => updateField('alarmCondition', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">Больше (&gt;)</SelectItem>
                        <SelectItem value="<">Меньше (&lt;)</SelectItem>
                        <SelectItem value="==">Равно (==)</SelectItem>
                        <SelectItem value=">=">Больше или равно (&gt;=)</SelectItem>
                        <SelectItem value="<=">Меньше или равно (&lt;=)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Уставка</Label>
                      <Input type="number" step="any" placeholder="0" value={form.alarmSetpoint} onChange={e => updateField('alarmSetpoint', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Зона нечувствительности</Label>
                      <Input type="number" step="any" placeholder="0" value={form.alarmDeadband} onChange={e => updateField('alarmDeadband', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Задержка (сек)</Label>
                      <Input type="number" placeholder="0" value={form.alarmDelay} onChange={e => updateField('alarmDelay', e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Write Tag Dialog
// ============================================================
function WriteTagDialog({
  open, onOpenChange, tag, onConfirm
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tag: Tag | null;
  onConfirm: (tagId: string, value: number) => void;
}) {
  const [writeValue, setWriteValue] = useState('');

  const handleOpen = (open: boolean) => {
    if (open) {
      setWriteValue(tag?.dataType === 'BOOL' ? '1' : String(tag?.value ?? ''));
    }
    onOpenChange(open);
  };

  const handleConfirm = () => {
    if (!tag) return;
    const val = tag.dataType === 'BOOL'
      ? (writeValue === '1' || writeValue.toLowerCase() === 'true' ? 1 : 0)
      : parseFloat(writeValue);
    if (!isNaN(val)) {
      onConfirm(tag.id, val);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Записать значение тега
          </DialogTitle>
          <DialogDescription>Записать новое значение в тег устройства</DialogDescription>
        </DialogHeader>

        {tag && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Тег</span>
                <span className="font-medium">{tag.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Адрес</span>
                <span className="font-mono text-xs">{tag.address}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Устройство</span>
                <span className="text-xs">{tag.device}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Текущее значение</span>
                <span className="font-bold text-lg">
                  {tag.dataType === 'BOOL' ? (tag.value ? 'ВКЛ' : 'ВЫКЛ') : `${tag.value} ${tag.unit}`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="write-value">Новое значение</Label>
              {tag.dataType === 'BOOL' ? (
                <Select value={writeValue} onValueChange={setWriteValue}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">ВКЛ (1)</SelectItem>
                    <SelectItem value="0">ВЫКЛ (0)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="write-value"
                  type="number"
                  step="any"
                  placeholder={`Введите значение (${tag.unit || tag.dataType})`}
                  value={writeValue}
                  onChange={e => setWriteValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleConfirm} className="gap-1.5" disabled={!writeValue || isNaN(parseFloat(writeValue))}>
            <CheckCircle2 className="h-4 w-4" />
            Записать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Main Component
// ============================================================
export function TagsView() {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [dataTypeFilter, setDataTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [writingTag, setWritingTag] = useState<Tag | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Simulate tag value changes
  useEffect(() => {
    const interval = setInterval(() => {
      setTags(prev => prev.map(tag => {
        if (tag.dataType === 'BOOL') return { ...tag, lastUpdate: new Date() };
        const range = tag.max && tag.min ? (tag.max - tag.min) : 10;
        const delta = (Math.random() - 0.5) * range * 0.02;
        const newVal = Math.round((tag.value + delta) * 100) / 100;
        return {
          ...tag,
          value: Math.max(tag.min ?? 0, Math.min(tag.max ?? 9999, newVal)),
          trend: delta > 0.01 ? 'up' as const : delta < -0.01 ? 'down' as const : 'stable' as const,
          lastUpdate: new Date(),
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Get unique groups
  const groups = useMemo(() => {
    const groupMap = new Map<string, number>();
    tags.forEach(t => groupMap.set(t.group, (groupMap.get(t.group) || 0) + 1));
    return Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tags]);

  // Filtered tags
  const filteredTags = useMemo(() => {
    return tags.filter(tag => {
      const matchSearch = tag.name.toLowerCase().includes(search.toLowerCase()) ||
        tag.address.includes(search) ||
        tag.device.toLowerCase().includes(search.toLowerCase());
      const matchGroup = groupFilter === 'all' || tag.group === groupFilter;
      const matchQuality = qualityFilter === 'all' || tag.quality === qualityFilter;
      const matchDataType = dataTypeFilter === 'all' || tag.dataType === dataTypeFilter;
      return matchSearch && matchGroup && matchQuality && matchDataType;
    });
  }, [tags, search, groupFilter, qualityFilter, dataTypeFilter]);

  // Stats
  const totalTags = tags.length;
  const goodTags = tags.filter(t => t.quality === 'good').length;
  const badTags = tags.filter(t => t.quality === 'bad').length;
  const uncertainTags = tags.filter(t => t.quality === 'uncertain').length;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleSaveTag = useCallback((formData: TagFormData) => {
    if (editingTag) {
      setTags(prev => prev.map(t => t.id === editingTag.id ? {
        ...t,
        name: formData.name,
        description: formData.description,
        device: formData.device,
        address: formData.address,
        dataType: formData.dataType,
        unit: formData.unit,
        scaleFactor: parseFloat(formData.scaleFactor) || 1,
        offset: parseFloat(formData.offset) || 0,
        scanRate: parseInt(formData.scanRate) || 1000,
        access: formData.access,
        group: formData.group,
        alarmEnabled: formData.alarmEnabled,
        alarmCondition: formData.alarmCondition,
        alarmSetpoint: parseFloat(formData.alarmSetpoint) || undefined,
        alarmDeadband: parseFloat(formData.alarmDeadband) || 0,
        alarmDelay: parseInt(formData.alarmDelay) || 0,
        min: parseFloat(formData.min) || undefined,
        max: parseFloat(formData.max) || undefined,
      } : t));
    } else {
      const newTag: Tag = {
        id: `t${Date.now()}`,
        name: formData.name,
        description: formData.description,
        device: formData.device,
        address: formData.address,
        group: formData.group,
        dataType: formData.dataType,
        value: 0,
        unit: formData.unit,
        quality: 'good',
        access: formData.access,
        trend: 'stable',
        scaleFactor: parseFloat(formData.scaleFactor) || 1,
        offset: parseFloat(formData.offset) || 0,
        scanRate: parseInt(formData.scanRate) || 1000,
        alarmEnabled: formData.alarmEnabled,
        alarmCondition: formData.alarmCondition,
        alarmSetpoint: parseFloat(formData.alarmSetpoint) || undefined,
        alarmDeadband: parseFloat(formData.alarmDeadband) || 0,
        alarmDelay: parseInt(formData.alarmDelay) || 0,
        min: parseFloat(formData.min) || undefined,
        max: parseFloat(formData.max) || undefined,
        lastUpdate: new Date(),
      };
      setTags(prev => [...prev, newTag]);
    }
    setEditingTag(null);
  }, [editingTag]);

  const handleWriteTag = useCallback((tagId: string, value: number) => {
    setTags(prev => prev.map(t =>
      t.id === tagId ? { ...t, value, lastUpdate: new Date() } : t
    ));
    setWritingTag(null);
  }, []);

  const handleDeleteTag = useCallback((tagId: string) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
  }, []);

  const handleReadTag = useCallback((tag: Tag) => {
    // Simulate a read by slightly changing the value
    setTags(prev => prev.map(t =>
      t.id === tag.id
        ? { ...t, value: Math.round((t.value + (Math.random() - 0.5) * 0.1) * 100) / 100, lastUpdate: new Date() }
        : t
    ));
  }, []);

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Tag Groups */}
      <div className="w-[220px] shrink-0 border-r border-border bg-card/30 hidden md:block">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Группы тегов
            </h3>
            <button
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                groupFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => setGroupFilter('all')}
            >
              <Layers className="h-4 w-4" />
              <span>Все теги</span>
              <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-[20px] justify-center">{totalTags}</Badge>
            </button>
            <Separator className="my-2" />
            {groups.map(([group, count]) => (
              <Collapsible
                key={group}
                open={expandedGroups[group] !== false}
                onOpenChange={() => toggleGroup(group)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      groupFilter === group ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={(e) => { e.stopPropagation(); setGroupFilter(group === groupFilter ? 'all' : group); }}
                  >
                    <ChevronRight className={cn('h-3.5 w-3.5 transition-transform shrink-0', expandedGroups[group] !== false && 'rotate-90')} />
                    <span className="truncate">{group}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-[20px] justify-center">{count}</Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-0.5 mt-0.5">
                    {tags.filter(t => t.group === group).slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground rounded-sm hover:bg-muted">
                        <QualityDot quality={t.quality} />
                        <span className="truncate">{t.name}</span>
                      </div>
                    ))}
                    {tags.filter(t => t.group === group).length > 5 && (
                      <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                        +{tags.filter(t => t.group === group).length - 5} ещё
                      </span>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 p-4 lg:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="py-3">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                <Tag className="h-5 w-5 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Всего тегов</p>
                <p className="text-xl font-bold">{totalTags}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Хорошие</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{goodTags}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Плохие</p>
                <p className="text-xl font-bold text-red-500">{badTags}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <HelpCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Неопределённые</p>
                <p className="text-xl font-bold text-amber-500">{uncertainTags}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingTag(null); setFormDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Добавить тег
          </Button>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск тегов..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={qualityFilter} onValueChange={setQualityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Качество" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всё качество</SelectItem>
              <SelectItem value="good">Хорошее</SelectItem>
              <SelectItem value="bad">Плохое</SelectItem>
              <SelectItem value="uncertain">Неопределённое</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Тип данных" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {dataTypeOptions.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[36px]" />
                      <TableHead>Название</TableHead>
                      <TableHead>Адрес</TableHead>
                      <TableHead>Группа</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Значение</TableHead>
                      <TableHead>Качество</TableHead>
                      <TableHead>Доступ</TableHead>
                      <TableHead>Устройство</TableHead>
                      <TableHead>Обновлено</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTags.map(tag => (
                      <TableRow key={tag.id}>
                        <TableCell><TrendIcon trend={tag.trend} /></TableCell>
                        <TableCell className="font-medium text-sm">{tag.name}</TableCell>
                        <TableCell className="font-mono text-xs">{tag.address}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{tag.group}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{tag.dataType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'font-bold tabular-nums',
                              tag.quality === 'bad' && 'text-red-500',
                              tag.quality === 'uncertain' && 'text-amber-500'
                            )}>
                              {tag.dataType === 'BOOL' ? (tag.value ? 'ВКЛ' : 'ВЫКЛ') : tag.value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                            </span>
                            {tag.unit && <span className="text-xs text-muted-foreground">{tag.unit}</span>}
                          </div>
                        </TableCell>
                        <TableCell><QualityBadge quality={tag.quality} /></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {tag.access === 'read' ? 'Чтение' : tag.access === 'write' ? 'Запись' : 'Чт/Зап'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{tag.device}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(tag.lastUpdate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReadTag(tag)}>
                                  <ScanLine className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Прочитать</TooltipContent>
                            </Tooltip>
                            {tag.access !== 'read' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWritingTag(tag); setWriteDialogOpen(true); }}>
                                    <PenLine className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Записать</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTag(tag); setFormDialogOpen(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Редактировать</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteTag(tag.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Удалить</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTags.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                          <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>Теги не найдены</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTags.map(tag => (
              <TagValueCard
                key={tag.id}
                tag={tag}
                onRead={handleReadTag}
                onWrite={(t) => { setWritingTag(t); setWriteDialogOpen(true); }}
              />
            ))}
            {filteredTags.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Tag className="h-8 w-8 mb-2 opacity-30" />
                <p>Теги не найдены</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <TagFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        tag={editingTag}
        onSave={handleSaveTag}
      />

      {/* Write Dialog */}
      <WriteTagDialog
        open={writeDialogOpen}
        onOpenChange={setWriteDialogOpen}
        tag={writingTag}
        onConfirm={handleWriteTag}
      />
    </div>
  );
}

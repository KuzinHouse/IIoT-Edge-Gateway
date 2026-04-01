'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, BarChart3, ArrowDownToLine, ArrowUpFromLine, Layers,
  AlertCircle, Settings, Activity, GitBranch, Wrench, X, Monitor,
  Radio, Database, Cpu, Gauge, Zap, Wifi,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface CommandPaletteAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  shortcut?: string;
  section?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (section: string) => void;
}

const ALL_ACTIONS: CommandPaletteAction[] = [
  // Navigation
  { id: 'nav-dashboard', label: 'Панель управления', description: 'Обзор системы и метрики', icon: <BarChart3 className="h-4 w-4" />, category: 'Навигация', section: 'dashboard' },
  { id: 'nav-south', label: 'Южные устройства', description: 'Управление устройствами и протоколами', icon: <ArrowDownToLine className="h-4 w-4" />, category: 'Навигация', section: 'south' },
  { id: 'nav-north', label: 'Северные приложения', description: 'MQTT, Kafka, HTTP и другие', icon: <ArrowUpFromLine className="h-4 w-4" />, category: 'Навигация', section: 'north' },
  { id: 'nav-tags', label: 'Теги данных', description: 'Управление тегами и группами', icon: <Layers className="h-4 w-4" />, category: 'Навигация', section: 'tags' },
  { id: 'nav-alarms', label: 'Аварии', description: 'Мониторинг и управление авариями', icon: <AlertCircle className="h-4 w-4" />, category: 'Навигация', section: 'alarms' },
  { id: 'nav-pipeline', label: 'Пайплайны данных', description: 'Визуальный редактор потоков данных', icon: <GitBranch className="h-4 w-4" />, category: 'Навигация', section: 'pipeline' },
  { id: 'nav-monitoring', label: 'Мониторинг', description: 'Реальное время, графики, live данные', icon: <Activity className="h-4 w-4" />, category: 'Навигация', section: 'monitoring' },
  { id: 'nav-diagnostics', label: 'Диагностика', description: 'Тестирование соединений и протоколов', icon: <Wrench className="h-4 w-4" />, category: 'Навигация', section: 'diagnostics' },
  { id: 'nav-settings', label: 'Настройки', description: 'Системные настройки и безопасность', icon: <Settings className="h-4 w-4" />, category: 'Навигация', section: 'settings' },

  // Quick Actions
  { id: 'action-add-device', label: 'Добавить устройство', description: 'Создать новое южное устройство', icon: <Monitor className="h-4 w-4" />, category: 'Действия' },
  { id: 'action-add-tag', label: 'Добавить тег', description: 'Создать новый тег данных', icon: <Layers className="h-4 w-4" />, category: 'Действия' },
  { id: 'action-add-pipeline', label: 'Создать пайплайн', description: 'Новый поток данных', icon: <GitBranch className="h-4 w-4" />, category: 'Действия' },
  { id: 'action-add-north-app', label: 'Добавить приложение', description: 'Новое северное приложение', icon: <ArrowUpFromLine className="h-4 w-4" />, category: 'Действия' },
  { id: 'action-ack-all-alarms', label: 'Подтвердить все аварии', description: 'Квитировать все активные аварии', icon: <AlertCircle className="h-4 w-4" />, category: 'Действия' },
  { id: 'action-export-config', label: 'Экспорт конфигурации', description: 'Скачать конфигурацию в JSON', icon: <Database className="h-4 w-4" />, category: 'Действия' },
  { id: 'action-restart-services', label: 'Перезапуск служб', description: 'Перезапустить все службы шлюза', icon: <Zap className="h-4 w-4" />, category: 'Действия' },

  // Protocols
  { id: 'proto-modbus-tcp', label: 'Modbus TCP', description: 'Подключение к PLC по TCP/IP', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-modbus-rtu', label: 'Modbus RTU', description: 'Последовательное соединение RS-485', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-opcua', label: 'OPC UA', description: 'Unified Architecture сервер', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-s7', label: 'Siemens S7', description: 'Siemens S7-300/400/1200/1500', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-mqtt', label: 'MQTT v5', description: 'Публикация в MQTT брокер', icon: <Radio className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-snmp', label: 'SNMP v2c/v3', description: 'Мониторинг сетевого оборудования', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-bacnet', label: 'BACnet/IP', description: 'Системы ОВК и автоматизации', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },
  { id: 'proto-iec104', label: 'IEC 60870-5-104', description: 'Телемеханика подстанций', icon: <Wifi className="h-4 w-4" />, category: 'Протоколы' },

  // Services
  { id: 'svc-modbus-sim', label: 'Modbus Симулятор', description: 'Тестовый PLC с регистрами', icon: <Cpu className="h-4 w-4" />, category: 'Службы' },
  { id: 'svc-ws-broker', label: 'WebSocket Брокер', description: 'Потоковые данные в реальном времени', icon: <Gauge className="h-4 w-4" />, category: 'Службы' },
  { id: 'svc-mqtt-bridge', label: 'MQTT Мост', description: 'Публикация/подписка MQTT', icon: <Radio className="h-4 w-4" />, category: 'Службы' },
];

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = useMemo(() => {
    if (!search.trim()) return ALL_ACTIONS;
    const q = search.toLowerCase();
    return ALL_ACTIONS.filter(
      a =>
        a.label.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.id.includes(q)
    );
  }, [search]);

  // Group by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandPaletteAction[]> = {};
    filteredActions.forEach(action => {
      if (!groups[action.category]) groups[action.category] = [];
      groups[action.category].push(action);
    });
    return groups;
  }, [filteredActions]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when opening
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = useCallback((action: CommandPaletteAction) => {
    if (action.section && onNavigate) {
      onNavigate(action.section);
    }
    onOpenChange(false);
  }, [onNavigate, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        handleSelect(filteredActions[selectedIndex]);
      }
    }
  }, [filteredActions, selectedIndex, handleSelect]);

  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 sm:max-w-[560px] top-[20%] translate-y-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Командная панель</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск команд, действий, навигация..."
            className="border-0 focus-visible:ring-0 h-11 px-0"
            autoFocus
          />
          {search && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSearch('')}>
              <X className="h-3 w-3" />
            </Button>
          )}
          <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <ScrollArea className="max-h-[340px] p-1">
          {filteredActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <Search className="mb-2 h-8 w-8 opacity-30" />
              <p>Ничего не найдено</p>
              <p className="text-xs mt-1">Попробуйте другой запрос</p>
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, actions]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {category}
                </div>
                {actions.map(action => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={action.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-left transition-colors',
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      )}
                      onClick={() => handleSelect(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{action.label}</p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {action.section && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {action.category === 'Навигация' ? 'Перейти' : ''}
                          </Badge>
                        )}
                        {action.shortcut && (
                          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                            {action.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })}
                <Separator className="my-1" />
              </div>
            ))
          )}
        </ScrollArea>
        <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-0.5 font-mono">↑↓</kbd> Навигация</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-0.5 font-mono">↵</kbd> Выбрать</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-0.5 font-mono">esc</kbd> Закрыть</span>
          </div>
          <span>IoT Edge Gateway v2.1.0</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

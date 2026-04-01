'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Server, FolderOpen, Folder, Database, Code, Gauge, Eye, EyeOff,
  Copy, RefreshCw, Plus, Trash2, Activity, Clock, Shield,
  AlertTriangle, ChevronRight, ChevronDown, Search, Link2, Cpu,
  Zap, CheckCircle2, XCircle, Loader2, Timer, Radio, Box,
  ToggleLeft, Info, Play, Square, Unplug, FileText,

} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { usePersistentState } from '@/lib/use-persistent-state';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type NodeClass = 'Object' | 'Variable' | 'Method' | 'ObjectType' | 'VariableType' | 'ReferenceType' | 'DataType' | 'View';
type SecurityMode = 'None' | 'Sign' | 'SignAndEncrypt';
type SecurityPolicy = 'None' | 'Basic128Rsa15' | 'Basic256Sha256';
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
type AccessLevelFlag = 'CurrentRead' | 'CurrentWrite' | 'HistoryRead' | 'HistoryWrite';
type AlarmState = 'Normal' | 'High' | 'Low' | 'HighHigh' | 'LowLow';

interface Reference {
  browseName: string;
  nodeClass: NodeClass;
  typeDefinition: string;
  nodeId: string;
  referenceType: string;
}

interface OPCUAValueHistory {
  timestamp: string;
  value: number;
}

interface TreeNode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: NodeClass;
  description?: string;
  dataType?: string;
  value?: unknown;
  valueRank?: number;
  arrayDimensions?: number[];
  accessLevel?: AccessLevelFlag[];
  sourceTimestamp?: string;
  serverTimestamp?: string;
  highLimit?: number;
  lowLimit?: number;
  highHighLimit?: number;
  lowLowLimit?: number;
  alarmState?: AlarmState;
  children?: TreeNode[];
  references?: Reference[];
  history?: OPCUAValueHistory[];
}

interface MonitoredItem {
  id: string;
  nodeId: string;
  browseName: string;
  samplingInterval: number;
  queueSize: number;
  discardOldest: boolean;
}

interface Subscription {
  id: string;
  publishingInterval: number;
  keepAliveCount: number;
  lifetimeCount: number;
  maxNotifications: number;
  status: 'active' | 'paused' | 'error';
  items: MonitoredItem[];
  createdAt: string;
}

interface ConnectionConfig {
  endpointUrl: string;
  securityMode: SecurityMode;
  securityPolicy: SecurityPolicy;
  username: string;
  password: string;
}

interface ConnectedServer {
  id: string;
  endpointUrl: string;
  status: ConnectionStatus;
  securityMode: SecurityMode;
  securityPolicy: SecurityPolicy;
  connectedAt: string;
  latency: number;
}

// ============================================================
// Demo Data
// ============================================================

function makeHistory(base: number, variance: number, count: number): OPCUAValueHistory[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(now - (count - i) * 2000).toISOString(),
    value: Math.round((base + (Math.random() - 0.5) * variance) * 100) / 100,
  }));
}

function simulateValue(current: unknown, dataType: string): unknown {
  if (dataType === 'Float' || dataType === 'Double') {
    const base = typeof current === 'number' ? current : 50;
    return Math.round((base + (Math.random() - 0.5) * (base * 0.04)) * 100) / 100;
  }
  if (dataType === 'Int32' || dataType === 'UInt32' || dataType === 'Int16' || dataType === 'UInt16') {
    const base = typeof current === 'number' ? current : 100;
    return Math.round(base + (Math.random() - 0.5) * (base * 0.02));
  }
  if (dataType === 'Boolean') {
    return Math.random() > 0.9 ? !current : current;
  }
  return current;
}

function computeAlarmState(val: number, high?: number, low?: number, hh?: number, ll?: number): AlarmState {
  if (hh !== undefined && val >= hh) return 'HighHigh';
  if (high !== undefined && val >= high) return 'High';
  if (ll !== undefined && val <= ll) return 'LowLow';
  if (low !== undefined && val <= low) return 'Low';
  return 'Normal';
}

const DEMO_INFORMATION_MODEL: TreeNode[] = [
  {
    nodeId: 'i=84',
    browseName: 'Objects',
    displayName: 'Объекты',
    nodeClass: 'Object',
    description: 'Корневая папка объектов сервера',
    children: [
      {
        nodeId: 'i=2253',
        browseName: 'Server',
        displayName: 'Сервер',
        nodeClass: 'Object',
        description: 'Объект сервера OPC UA',
        references: [
          { browseName: 'ServerStatus', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'i=2256', referenceType: 'HasComponent' },
          { browseName: 'BuildInfo', nodeClass: 'Variable', typeDefinition: 'BuildInfoType', nodeId: 'i=2270', referenceType: 'HasComponent' },
          { browseName: 'CurrentTime', nodeClass: 'Variable', typeDefinition: 'PropertyType', nodeId: 'i=2258', referenceType: 'HasProperty' },
          { browseName: 'ServerCapabilities', nodeClass: 'Object', typeDefinition: 'FolderType', nodeId: 'i=2268', referenceType: 'HasComponent' },
        ],
        children: [
          {
            nodeId: 'i=2256',
            browseName: 'ServerStatus',
            displayName: 'Статус сервера',
            nodeClass: 'Variable',
            dataType: 'ServerStatusDataType',
            description: 'Текущий статус сервера',
            value: { State: 0, StartTime: '2025-01-15T08:00:00Z', CurrentTime: new Date().toISOString(), ShutdownReason: null },
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'i=2270',
            browseName: 'BuildInfo',
            displayName: 'Информация о сборке',
            nodeClass: 'Variable',
            dataType: 'BuildInfo',
            description: 'Информация о версии сборки сервера',
            value: { ProductName: 'Neuron OPC UA Server', ProductUri: 'urn:neutron-gateway', ManufacturerName: 'EMQX', SoftwareVersion: '2.1.0', BuildNumber: '20250115', BuildDate: '2025-01-15' },
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'i=2258',
            browseName: 'CurrentTime',
            displayName: 'Текущее время',
            nodeClass: 'Variable',
            dataType: 'DateTime',
            description: 'Текущее время сервера (UTC)',
            value: new Date().toISOString(),
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
            history: makeHistory(Date.now(), 2000, 20),
          },
          {
            nodeId: 'i=2268',
            browseName: 'ServerCapabilities',
            displayName: 'Возможности сервера',
            nodeClass: 'Object',
            description: 'Возможности и функции сервера',
            children: [
              {
                nodeId: 'ns=0;i=2271',
                browseName: 'ServerProfileArray',
                displayName: 'Профили сервера',
                nodeClass: 'Variable',
                dataType: 'String[]',
                value: ['Core Server', 'DataAccess Server', 'Historical Access Server'],
                accessLevel: ['CurrentRead'],
                arrayDimensions: [3],
                sourceTimestamp: new Date().toISOString(),
              },
              {
                nodeId: 'ns=0;i=2272',
                browseName: 'LocaleIdArray',
                displayName: 'Локали',
                nodeClass: 'Variable',
                dataType: 'String[]',
                value: ['ru-RU', 'en-US'],
                accessLevel: ['CurrentRead'],
                arrayDimensions: [2],
                sourceTimestamp: new Date().toISOString(),
              },
              {
                nodeId: 'ns=0;i=2273',
                browseName: 'MinSamplingInterval',
                displayName: 'Мин. интервал опроса',
                nodeClass: 'Variable',
                dataType: 'Double',
                value: 50,
                description: 'Минимальный поддерживаемый интервал опроса (мс)',
                accessLevel: ['CurrentRead'],
                sourceTimestamp: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      {
        nodeId: 'ns=2;s=Machine1',
        browseName: 'Machine1',
        displayName: 'Машина 1',
        nodeClass: 'Object',
        description: 'Промышленный станок #1 — CNC обрабатывающий центр',
        references: [
          { browseName: 'Temperature', nodeClass: 'Variable', typeDefinition: 'AnalogItemType', nodeId: 'ns=2;s=Machine1.Temperature', referenceType: 'HasComponent' },
          { browseName: 'Pressure', nodeClass: 'Variable', typeDefinition: 'AnalogItemType', nodeId: 'ns=2;s=Machine1.Pressure', referenceType: 'HasComponent' },
          { browseName: 'Speed', nodeClass: 'Variable', typeDefinition: 'AnalogItemType', nodeId: 'ns=2;s=Machine1.Speed', referenceType: 'HasComponent' },
          { browseName: 'Status', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=Machine1.Status', referenceType: 'HasComponent' },
          { browseName: 'Running', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=Machine1.Running', referenceType: 'HasComponent' },
          { browseName: 'StartMachine', nodeClass: 'Method', typeDefinition: '', nodeId: 'ns=2;s=Machine1.StartMachine', referenceType: 'HasComponent' },
          { browseName: 'StopMachine', nodeClass: 'Method', typeDefinition: '', nodeId: 'ns=2;s=Machine1.StopMachine', referenceType: 'HasComponent' },
        ],
        children: [
          {
            nodeId: 'ns=2;s=Machine1.Temperature',
            browseName: 'Temperature',
            displayName: 'Температура',
            nodeClass: 'Variable',
            dataType: 'Float',
            description: 'Температура главного шпинделя (°C)',
            value: 72.5,
            accessLevel: ['CurrentRead', 'CurrentWrite', 'HistoryRead'],
            highLimit: 85,
            lowLimit: 20,
            highHighLimit: 95,
            lowLowLimit: 10,
            alarmState: 'Normal',
            history: makeHistory(72.5, 10, 20),
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine1.Pressure',
            browseName: 'Pressure',
            displayName: 'Давление',
            nodeClass: 'Variable',
            dataType: 'Float',
            description: 'Давление гидравлической системы (bar)',
            value: 4.2,
            accessLevel: ['CurrentRead', 'HistoryRead'],
            highLimit: 6.0,
            lowLimit: 2.0,
            alarmState: 'Normal',
            history: makeHistory(4.2, 0.8, 20),
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine1.Speed',
            browseName: 'Speed',
            displayName: 'Скорость',
            nodeClass: 'Variable',
            dataType: 'Int32',
            description: 'Скорость вращения шпинделя (rpm)',
            value: 3500,
            accessLevel: ['CurrentRead', 'CurrentWrite', 'HistoryRead'],
            highLimit: 5000,
            lowLimit: 0,
            history: makeHistory(3500, 200, 20),
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine1.Status',
            displayName: 'Статус',
            browseName: 'Status',
            nodeClass: 'Variable',
            dataType: 'String',
            description: 'Текущий статус машины',
            value: 'Работает',
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine1.Running',
            browseName: 'Running',
            displayName: 'Работает',
            nodeClass: 'Variable',
            dataType: 'Boolean',
            description: 'Флаг работы машины',
            value: true,
            accessLevel: ['CurrentRead', 'CurrentWrite'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine1.StartMachine',
            browseName: 'StartMachine',
            displayName: 'Запустить машину',
            nodeClass: 'Method',
            description: 'Команда запуска машины. Параметр: nodeId (String)',
          },
          {
            nodeId: 'ns=2;s=Machine1.StopMachine',
            browseName: 'StopMachine',
            displayName: 'Остановить машину',
            nodeClass: 'Method',
            description: 'Команда остановки машины. Параметр: nodeId (String)',
          },
        ],
      },
      {
        nodeId: 'ns=2;s=Machine2',
        browseName: 'Machine2',
        displayName: 'Машина 2',
        nodeClass: 'Object',
        description: 'Промышленный конвейер #2',
        references: [
          { browseName: 'Temperature', nodeClass: 'Variable', typeDefinition: 'AnalogItemType', nodeId: 'ns=2;s=Machine2.Temperature', referenceType: 'HasComponent' },
          { browseName: 'Pressure', nodeClass: 'Variable', typeDefinition: 'AnalogItemType', nodeId: 'ns=2;s=Machine2.Pressure', referenceType: 'HasComponent' },
          { browseName: 'Speed', nodeClass: 'Variable', typeDefinition: 'AnalogItemType', nodeId: 'ns=2;s=Machine2.Speed', referenceType: 'HasComponent' },
          { browseName: 'Status', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=Machine2.Status', referenceType: 'HasComponent' },
          { browseName: 'Running', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=Machine2.Running', referenceType: 'HasComponent' },
          { browseName: 'ResetAlarm', nodeClass: 'Method', typeDefinition: '', nodeId: 'ns=2;s=Machine2.ResetAlarm', referenceType: 'HasComponent' },
        ],
        children: [
          {
            nodeId: 'ns=2;s=Machine2.Temperature',
            browseName: 'Temperature',
            displayName: 'Температура',
            nodeClass: 'Variable',
            dataType: 'Float',
            description: 'Температура электродвигателя (°C)',
            value: 58.3,
            accessLevel: ['CurrentRead', 'CurrentWrite', 'HistoryRead'],
            highLimit: 75,
            lowLimit: 15,
            highHighLimit: 90,
            lowLowLimit: 5,
            alarmState: 'Normal',
            history: makeHistory(58.3, 8, 20),
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine2.Pressure',
            browseName: 'Pressure',
            displayName: 'Давление',
            nodeClass: 'Variable',
            dataType: 'Float',
            description: 'Давление пневматической системы (bar)',
            value: 6.1,
            accessLevel: ['CurrentRead', 'HistoryRead'],
            highLimit: 8.0,
            lowLimit: 3.0,
            alarmState: 'High',
            history: makeHistory(6.1, 1.0, 20),
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine2.Speed',
            browseName: 'Speed',
            displayName: 'Скорость',
            nodeClass: 'Variable',
            dataType: 'Int32',
            description: 'Скорость конвейера (rpm)',
            value: 1200,
            accessLevel: ['CurrentRead', 'CurrentWrite', 'HistoryRead'],
            highLimit: 2000,
            lowLimit: 0,
            history: makeHistory(1200, 100, 20),
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine2.Status',
            browseName: 'Status',
            displayName: 'Статус',
            nodeClass: 'Variable',
            dataType: 'String',
            description: 'Текущий статус машины',
            value: 'Внимание: высокое давление',
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine2.Running',
            browseName: 'Running',
            displayName: 'Работает',
            nodeClass: 'Variable',
            dataType: 'Boolean',
            description: 'Флаг работы машины',
            value: true,
            accessLevel: ['CurrentRead', 'CurrentWrite'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=Machine2.ResetAlarm',
            browseName: 'ResetAlarm',
            displayName: 'Сброс аварии',
            nodeClass: 'Method',
            description: 'Сброс активной аварии. Параметр: nodeId (String)',
          },
        ],
      },
      {
        nodeId: 'ns=2;s=SafetySystem',
        browseName: 'SafetySystem',
        displayName: 'Система безопасности',
        nodeClass: 'Object',
        description: 'Система безопасности промышленной установки',
        references: [
          { browseName: 'EStop', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=SafetySystem.EStop', referenceType: 'HasComponent' },
          { browseName: 'Guards', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=SafetySystem.Guards', referenceType: 'HasComponent' },
          { browseName: 'Interlocks', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=SafetySystem.Interlocks', referenceType: 'HasComponent' },
          { browseName: 'SafetyStatus', nodeClass: 'Variable', typeDefinition: 'BaseDataVariableType', nodeId: 'ns=2;s=SafetySystem.SafetyStatus', referenceType: 'HasComponent' },
        ],
        children: [
          {
            nodeId: 'ns=2;s=SafetySystem.EStop',
            browseName: 'EStop',
            displayName: 'Аварийная остановка',
            nodeClass: 'Variable',
            dataType: 'Boolean',
            description: 'Состояние кнопки аварийной остановки (true = активирована)',
            value: false,
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=SafetySystem.Guards',
            browseName: 'Guards',
            displayName: 'Защитные ограждения',
            nodeClass: 'Variable',
            dataType: 'Boolean[]',
            description: 'Состояние защитных ограждений (массив)',
            value: [true, true, false, true, true, true],
            accessLevel: ['CurrentRead'],
            arrayDimensions: [6],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=SafetySystem.Interlocks',
            browseName: 'Interlocks',
            displayName: 'Блокировки',
            nodeClass: 'Variable',
            dataType: 'Boolean[]',
            description: 'Состояние межблочных блокировок',
            value: [true, true, true],
            accessLevel: ['CurrentRead'],
            arrayDimensions: [3],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
          {
            nodeId: 'ns=2;s=SafetySystem.SafetyStatus',
            browseName: 'SafetyStatus',
            displayName: 'Статус безопасности',
            nodeClass: 'Variable',
            dataType: 'String',
            description: 'Общий статус системы безопасности',
            value: 'Норма',
            accessLevel: ['CurrentRead'],
            sourceTimestamp: new Date().toISOString(),
            serverTimestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  },
  {
    nodeId: 'i=85',
    browseName: 'Types',
    displayName: 'Типы',
    nodeClass: 'Object',
    description: 'Папка типов OPC UA',
    children: [
      {
        nodeId: 'i=86',
        browseName: 'ObjectTypes',
        displayName: 'Типы объектов',
        nodeClass: 'ObjectType',
        description: 'Иерархия типов объектов',
      },
      {
        nodeId: 'i=87',
        browseName: 'VariableTypes',
        displayName: 'Типы переменных',
        nodeClass: 'VariableType',
        description: 'Иерархия типов переменных',
        children: [
          {
            nodeId: 'i=63',
            browseName: 'BaseDataVariableType',
            displayName: 'Базовый тип данных',
            nodeClass: 'VariableType',
            description: 'Базовый тип для всех переменных данных',
          },
          {
            nodeId: 'i=2368',
            browseName: 'AnalogItemType',
            displayName: 'Аналоговый элемент',
            nodeClass: 'VariableType',
            description: 'Аналоговый тип переменной с диапазоном',
          },
          {
            nodeId: 'i=2367',
            browseName: 'DiscreteItemType',
            displayName: 'Дискретный элемент',
            nodeClass: 'VariableType',
            description: 'Дискретный тип переменной',
          },
        ],
      },
      {
        nodeId: 'i=88',
        browseName: 'ReferenceTypes',
        displayName: 'Типы ссылок',
        nodeClass: 'ReferenceType',
        description: 'Иерархия типов ссылок',
      },
      {
        nodeId: 'i=89',
        browseName: 'DataTypes',
        displayName: 'Типы данных',
        nodeClass: 'DataType',
        description: 'Иерархия типов данных OPC UA',
      },
    ],
  },
  {
    nodeId: 'i=91',
    browseName: 'Views',
    displayName: 'Представления',
    nodeClass: 'View',
    description: 'Представления адресного пространства',
  },
];

const NAMESPACES = [
  { index: 0, uri: 'http://opcfoundation.org/UA/', name: 'OPC UA' },
  { index: 1, uri: 'urn:neutron-gateway:application', name: 'Приложение' },
  { index: 2, uri: 'urn:neutron-gateway:machine', name: 'Машина' },
  { index: 3, uri: 'urn:neutron-gateway:safety', name: 'Безопасность' },
];

// ============================================================
// Helper Functions
// ============================================================

function NodeIcon({ nodeClass, className }: { nodeClass: NodeClass; className?: string }) {
  switch (nodeClass) {
    case 'Object': return <FolderOpen className={className} />;
    case 'Variable': return <Gauge className={className} />;
    case 'Method': return <Code className={className} />;
    case 'ObjectType': return <Box className={className} />;
    case 'VariableType': return <Database className={className} />;
    case 'ReferenceType': return <Link2 className={className} />;
    case 'DataType': return <FileText className={className} />;
    case 'View': return <Eye className={className} />;
    default: return <Box className={className} />;
  }
}

function getNodeClassColor(nodeClass: NodeClass): string {
  switch (nodeClass) {
    case 'Object': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
    case 'Variable': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'Method': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30';
    case 'ObjectType': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'VariableType': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
    case 'ReferenceType': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    case 'DataType': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
    case 'View': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getNodeClassLabel(nodeClass: NodeClass): string {
  switch (nodeClass) {
    case 'Object': return 'Объект';
    case 'Variable': return 'Переменная';
    case 'Method': return 'Метод';
    case 'ObjectType': return 'Тип объекта';
    case 'VariableType': return 'Тип переменной';
    case 'ReferenceType': return 'Тип ссылки';
    case 'DataType': return 'Тип данных';
    case 'View': return 'Представление';
    default: return nodeClass;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return '—'; }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return '—'; }
}

function getAlarmBadgeStyle(state: AlarmState): string {
  switch (state) {
    case 'Normal': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'High': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'Low': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
    case 'HighHigh': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
    case 'LowLow': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getAlarmLabel(state: AlarmState): string {
  switch (state) {
    case 'Normal': return 'Норма';
    case 'High': return 'Высокое';
    case 'Low': return 'Низкое';
    case 'HighHigh': return 'Крит. высокое';
    case 'LowLow': return 'Крит. низкое';
    default: return state;
  }
}

function countNodes(nodes: TreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count++;
    if (n.children) count += countNodes(n.children);
  }
  return count;
}

function flattenNodes(nodes: TreeNode[], filter: string): TreeNode[] {
  const results: TreeNode[] = [];
  const q = filter.toLowerCase();
  for (const n of nodes) {
    if (n.browseName.toLowerCase().includes(q) || n.nodeId.toLowerCase().includes(q)) {
      results.push(n);
    }
    if (n.children) {
      results.push(...flattenNodes(n.children, filter));
    }
  }
  return results;
}

// ============================================================
// Mini Sparkline Component
// ============================================================

function MiniSparkline({ data, width = 120, height = 32 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return <div className="text-xs text-muted-foreground">Нет данных</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
      />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkGrad)"
      />
    </svg>
  );
}

// ============================================================
// Tree Node Component
// ============================================================

function TreeViewItem({
  node,
  depth,
  selectedNodeId,
  expandedNodes,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedNodeId: string | null;
  expandedNodes: Set<string>;
  onSelect: (node: TreeNode) => void;
  onToggle: (nodeId: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.nodeId);
  const isSelected = selectedNodeId === node.nodeId;

  return (
    <div>
      <button
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors text-left',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-accent text-foreground'
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={() => {
          if (hasChildren) onToggle(node.nodeId);
          onSelect(node);
        }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <NodeIcon nodeClass={node.nodeClass} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{node.displayName}</span>
        {hasChildren && !isExpanded && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0 opacity-60">
            {node.children!.length}
          </Badge>
        )}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeViewItem
              key={child.nodeId}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Copy Button
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* ignore */ });
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
          {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Скопировано' : 'Копировать'}</TooltipContent>
    </Tooltip>
  );
}

// ============================================================
// Status Dot
// ============================================================

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-600';
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={cn('inline-flex h-2 w-2 rounded-full', color)} />
      {status === 'connected' && (
        <span className="absolute inline-flex animate-ping rounded-full bg-emerald-400 opacity-75 h-2 w-2" />
      )}
    </span>
  );
}

// ============================================================
// Main OPCUAView Component
// ============================================================

export function OPCUAView() {
  // --- State: Connection ---
  const [savedConfigs, setSavedConfigs] = usePersistentState<ConnectionConfig[]>('opcua-connections', []);
  const [endpointUrl, setEndpointUrl] = useState('opc.tcp://192.168.1.100:4840');
  const [securityMode, setSecurityMode] = useState<SecurityMode>('None');
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy>('None');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedServers, setConnectedServers] = useState<ConnectedServer[]>([]);
  const [autoReconnect, setAutoReconnect] = usePersistentState<boolean>('opcua-auto-reconnect', false);
  const [latency, setLatency] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // --- State: Information Model ---
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['i=84', 'ns=2;s=Machine1']));
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [nodeSearch, setNodeSearch] = useState('');
  const [showTree, setShowTree] = useState(true);

  // --- State: Subscriptions ---
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newSubInterval, setNewSubInterval] = useState('1000');
  const [newSubKeepAlive, setNewSubKeepAlive] = useState('10');
  const [newSubLifetime, setNewSubLifetime] = useState('30');
  const [newSubMaxNotif, setNewSubMaxNotif] = useState('100');

  // --- State: Write ---
  const [writeValue, setWriteValue] = useState('');
  const [writeResult, setWriteResult] = useState<{ success: boolean; message: string } | null>(null);
  const [writing, setWriting] = useState(false);

  // --- State: Add Monitored Item ---
  const [addMonitorDialogOpen, setAddMonitorDialogOpen] = useState(false);
  const [addMonitorSubId, setAddMonitorSubId] = useState<string | null>(null);
  const [addMonitorNodeId, setAddMonitorNodeId] = useState('');
  const [addMonitorInterval, setAddMonitorInterval] = useState('1000');
  const [addMonitorQueue, setAddMonitorQueue] = useState('10');

  // Refs
  const treeDataRef = useRef<TreeNode[]>(treeData);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync
  useEffect(() => { treeDataRef.current = treeData; }, [treeData]);

  // --- Connect ---
  const handleConnect = useCallback(async () => {
    setConnectionStatus('connecting');
    setConnectError(null);
    setLatency(null);
    const start = performance.now();

    try {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      const dur = Math.round(performance.now() - start);

      setConnectionStatus('connected');
      setLatency(dur);
      setTreeData(DEMO_INFORMATION_MODEL);

      const server: ConnectedServer = {
        id: `srv-${Date.now()}`,
        endpointUrl,
        status: 'connected',
        securityMode,
        securityPolicy,
        connectedAt: new Date().toISOString(),
        latency: dur,
      };
      setConnectedServers(prev => [...prev, server]);

      // Save config
      setSavedConfigs(prev => {
        const exists = prev.some(c => c.endpointUrl === endpointUrl);
        if (exists) return prev;
        return [...prev, { endpointUrl, securityMode, securityPolicy, username, password }];
      });
    } catch {
      setConnectionStatus('error');
      setConnectError('Не удалось подключиться к серверу');
    }
  }, [endpointUrl, securityMode, securityPolicy, username, password, setSavedConfigs]);

  // --- Disconnect ---
  const handleDisconnect = useCallback(() => {
    setConnectionStatus('disconnected');
    setLatency(null);
    setTreeData([]);
    setSelectedNode(null);
    setSubscriptions([]);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  // --- Test Connection ---
  const handleTestConnection = useCallback(async () => {
    setTestingConnection(true);
    const start = performance.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      const dur = Math.round(performance.now() - start);
      setLatency(dur);
    } catch {
      setLatency(null);
    } finally {
      setTestingConnection(false);
    }
  }, []);

  // --- Auto-reconnect effect ---
  useEffect(() => {
    if (!autoReconnect || connectionStatus !== 'error') return;
    const timer = setTimeout(() => { handleConnect(); }, 5000);
    return () => clearTimeout(timer);
  }, [autoReconnect, connectionStatus, handleConnect]);

  // --- Simulate live values ---
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    simTimerRef.current = setInterval(() => {
      setTreeData(prev => {
        const updateNode = (node: TreeNode): TreeNode => {
          const updated = { ...node };
          if (node.nodeClass === 'Variable' && node.dataType && (node.dataType === 'Float' || node.dataType === 'Double' || node.dataType === 'Int32' || node.dataType === 'UInt32' || node.dataType === 'Int16' || node.dataType === 'UInt16')) {
            updated.value = simulateValue(node.value, node.dataType);
            updated.sourceTimestamp = new Date().toISOString();
            updated.serverTimestamp = new Date().toISOString();
            updated.history = [
              ...(node.history || []),
              { timestamp: new Date().toISOString(), value: updated.value as number },
            ].slice(-20);
            if (node.highLimit !== undefined || node.lowLimit !== undefined) {
              updated.alarmState = computeAlarmState(
                updated.value as number,
                node.highLimit,
                node.lowLimit,
                node.highHighLimit,
                node.lowLowLimit
              );
            }
          }
          if (node.dataType === 'DateTime' && node.browseName === 'CurrentTime') {
            updated.value = new Date().toISOString();
            updated.sourceTimestamp = new Date().toISOString();
            updated.serverTimestamp = new Date().toISOString();
          }
          if (node.dataType === 'Boolean' && node.nodeId.includes('SafetySystem')) {
            // Safety system values change rarely
            if (Math.random() > 0.95) updated.value = !node.value;
          }
          if (node.children) {
            updated.children = node.children.map(updateNode);
          }
          return updated;
        };
        return prev.map(updateNode);
      });
    }, 2000);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [connectionStatus]);

  // --- Keep selected node in sync with tree data ---
  useEffect(() => {
    if (!selectedNode) return;
    const find = (nodes: TreeNode[]): TreeNode | null => {
      for (const n of nodes) {
        if (n.nodeId === selectedNode.nodeId) return n;
        if (n.children) {
          const found = find(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const updated = find(treeData);
    if (updated) setSelectedNode(updated);
  }, [treeData]);

  // --- Tree toggle ---
  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // --- Select node ---
  const handleSelectNode = useCallback((node: TreeNode) => {
    setSelectedNode(node);
    setWriteValue('');
    setWriteResult(null);
  }, []);

  // --- Write value ---
  const handleWrite = useCallback(() => {
    if (!selectedNode) return;
    setWriting(true);
    setWriteResult(null);
    setTimeout(() => {
      let parsed: unknown = writeValue;
      if (selectedNode.dataType === 'Float' || selectedNode.dataType === 'Double' || selectedNode.dataType === 'Int32' || selectedNode.dataType === 'UInt32' || selectedNode.dataType === 'Int16' || selectedNode.dataType === 'UInt16') {
        parsed = parseFloat(writeValue);
        if (isNaN(parsed as number)) {
          setWriteResult({ success: false, message: 'Некорректное числовое значение' });
          setWriting(false);
          return;
        }
      } else if (selectedNode.dataType === 'Boolean') {
        parsed = writeValue.toLowerCase() === 'true' || writeValue === '1';
      }

      setTreeData(prev => {
        const updateNode = (node: TreeNode): TreeNode => {
          if (node.nodeId === selectedNode.nodeId) {
            return { ...node, value: parsed, sourceTimestamp: new Date().toISOString(), serverTimestamp: new Date().toISOString() };
          }
          if (node.children) return { ...node, children: node.children.map(updateNode) };
          return node;
        };
        return prev.map(updateNode);
      });
      setWriteResult({ success: true, message: 'Значение записано успешно' });
      setWriting(false);
    }, 300);
  }, [selectedNode, writeValue]);

  // --- Subscriptions CRUD ---
  const handleCreateSubscription = useCallback(() => {
    const sub: Subscription = {
      id: `sub-${Date.now()}`,
      publishingInterval: parseInt(newSubInterval, 10) || 1000,
      keepAliveCount: parseInt(newSubKeepAlive, 10) || 10,
      lifetimeCount: parseInt(newSubLifetime, 10) || 30,
      maxNotifications: parseInt(newSubMaxNotif, 10) || 100,
      status: 'active',
      items: [],
      createdAt: new Date().toISOString(),
    };
    setSubscriptions(prev => [...prev, sub]);
  }, [newSubInterval, newSubKeepAlive, newSubLifetime, newSubMaxNotif]);

  const handleDeleteSubscription = useCallback((id: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleToggleSubscription = useCallback((id: string) => {
    setSubscriptions(prev => prev.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
    ));
  }, []);

  const handleAddMonitoredItem = useCallback(() => {
    if (!addMonitorSubId || !addMonitorNodeId.trim()) return;
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== addMonitorSubId) return s;
      const item: MonitoredItem = {
        id: `mi-${Date.now()}`,
        nodeId: addMonitorNodeId.trim(),
        browseName: addMonitorNodeId.trim().split('.').pop() || addMonitorNodeId,
        samplingInterval: parseInt(addMonitorInterval, 10) || 1000,
        queueSize: parseInt(addMonitorQueue, 10) || 10,
        discardOldest: true,
      };
      return { ...s, items: [...s.items, item] };
    }));
    setAddMonitorDialogOpen(false);
    setAddMonitorNodeId('');
    setAddMonitorInterval('1000');
    setAddMonitorQueue('10');
  }, [addMonitorSubId, addMonitorNodeId, addMonitorInterval, addMonitorQueue]);

  const handleRemoveMonitoredItem = useCallback((subId: string, itemId: string) => {
    setSubscriptions(prev => prev.map(s =>
      s.id === subId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
    ));
  }, []);

  // --- Filtered tree ---
  const filteredTreeData = useMemo(() => {
    if (!nodeSearch.trim()) return treeData;
    const flat = flattenNodes(treeData, nodeSearch.trim());
    // Deduplicate by nodeId
    const seen = new Set<string>();
    return flat.filter(n => {
      if (seen.has(n.nodeId)) return false;
      seen.add(n.nodeId);
      return true;
    });
  }, [treeData, nodeSearch]);

  // --- Search results for detail panel (when searching) ---
  const searchResults = useMemo(() => {
    if (!nodeSearch.trim()) return null;
    return flattenNodes(treeData, nodeSearch.trim());
  }, [treeData, nodeSearch]);

  // --- Computed ---
  const isVariableNode = selectedNode?.nodeClass === 'Variable';
  const isMethodNode = selectedNode?.nodeClass === 'Method';
  const isWritable = isVariableNode && selectedNode?.accessLevel?.includes('CurrentWrite');
  const hasAlarm = isVariableNode && (selectedNode?.highLimit !== undefined || selectedNode?.lowLimit !== undefined);
  const hasHistory = isVariableNode && selectedNode?.history && selectedNode.history.length > 1;

  const isNumericType = selectedNode?.dataType && ['Float', 'Double', 'Int32', 'UInt32', 'Int16', 'UInt16'].includes(selectedNode.dataType);

  // ==================================================================
  // RENDER
  // ==================================================================

  return (
    <div className="space-y-4">
      {/* ====== CONNECTION MANAGEMENT PANEL ====== */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              Управление подключением OPC UA
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusDot status={connectionStatus} />
              <Badge variant="outline" className={cn(
                'text-[10px]',
                connectionStatus === 'connected' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                connectionStatus === 'connecting' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' :
                connectionStatus === 'error' ? 'border-red-500/30 text-red-600 dark:text-red-400' :
                'border-gray-500/30 text-muted-foreground'
              )}>
                {connectionStatus === 'connected' ? 'Подключено' :
                 connectionStatus === 'connecting' ? 'Подключение...' :
                 connectionStatus === 'error' ? 'Ошибка' : 'Отключено'}
              </Badge>
              {latency !== null && (
                <span className="text-[10px] text-muted-foreground font-mono">{latency} мс</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Конечная точка</Label>
              <Input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="opc.tcp://host:port"
                className="h-8 text-xs font-mono"
                disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Безопасность</Label>
              <Select value={securityMode} onValueChange={(v) => setSecurityMode(v as SecurityMode)} disabled={connectionStatus === 'connected'}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Нет</SelectItem>
                  <SelectItem value="Sign">Подпись</SelectItem>
                  <SelectItem value="SignAndEncrypt">Подпись + Шифр</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Политика</Label>
              <Select value={securityPolicy} onValueChange={(v) => setSecurityPolicy(v as SecurityPolicy)} disabled={connectionStatus === 'connected'}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Basic128Rsa15">Basic128Rsa15</SelectItem>
                  <SelectItem value="Basic256Sha256">Basic256Sha256</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Имя пользователя</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-8 text-xs"
                placeholder="Опционально"
                disabled={connectionStatus === 'connected'}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Пароль</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-xs"
                placeholder="••••••"
                disabled={connectionStatus === 'connected'}
              />
            </div>
          </div>

          {/* Connection actions */}
          <div className="flex flex-wrap items-center gap-2">
            {connectionStatus === 'connected' || connectionStatus === 'connecting' ? (
              <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDisconnect} disabled={connectionStatus === 'connecting'}>
                {connectionStatus === 'connecting' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}
                Отключить
              </Button>
            ) : (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleConnect} disabled={!endpointUrl.trim()}>
                <Zap className="h-3 w-3" />
                Подключить
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleTestConnection} disabled={testingConnection || connectionStatus === 'connected'}>
              {testingConnection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
              Тест
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Автоподключение</Label>
              <Switch checked={autoReconnect} onCheckedChange={setAutoReconnect} className="scale-75" />
            </div>
          </div>

          {connectError && (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs bg-red-500/10 text-red-600 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              {connectError}
            </div>
          )}

          {/* Connected Servers */}
          {connectedServers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium">Подключённые серверы</span>
              <div className="flex flex-wrap gap-2">
                {connectedServers.map(srv => (
                  <div key={srv.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
                    <StatusDot status={srv.status} />
                    <span className="text-[11px] font-mono max-w-[200px] truncate">{srv.endpointUrl}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {srv.securityMode}/{srv.securityPolicy}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{srv.latency} мс</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setConnectedServers(prev => prev.filter(s => s.id !== srv.id))}>
                      <XCircle className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved configs */}
          {savedConfigs.length > 0 && connectionStatus === 'disconnected' && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium">Сохранённые подключения</span>
              <div className="flex flex-wrap gap-1.5">
                {savedConfigs.map((cfg, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-mono gap-1"
                    onClick={() => {
                      setEndpointUrl(cfg.endpointUrl);
                      setSecurityMode(cfg.securityMode);
                      setSecurityPolicy(cfg.securityPolicy);
                      setUsername(cfg.username);
                      setPassword(cfg.password);
                    }}
                  >
                    <Server className="h-3 w-3" />
                    {cfg.endpointUrl.replace('opc.tcp://', '').split('/')[0]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== MAIN LAYOUT: Tree + Detail ====== */}
      {connectionStatus !== 'connected' ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Нет подключения</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Подключитесь к OPC UA серверу для просмотра информационной модели, мониторинга переменных и управления подписками.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4">
          {/* ====== INFORMATION MODEL BROWSER (LEFT SIDEBAR) ====== */}
          {/* Mobile toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 lg:hidden shrink-0"
            onClick={() => setShowTree(prev => !prev)}
          >
            {showTree ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showTree ? 'Скрыть дерево' : 'Показать дерево'}
          </Button>

          {showTree && (
            <Card className="w-full lg:w-[300px] shrink-0 flex flex-col max-h-[calc(100vh-280px)]">
              <CardHeader className="pb-2 px-3 pt-3 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5" />
                    Информационная модель
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {countNodes(treeData)} узлов
                  </Badge>
                </div>
                {/* Search */}
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={nodeSearch}
                    onChange={(e) => setNodeSearch(e.target.value)}
                    placeholder="Поиск по имени или NodeId..."
                    className="h-7 text-[11px] pl-7"
                  />
                </div>
                {/* Namespaces */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {NAMESPACES.map(ns => (
                    <Badge key={ns.index} variant="outline" className="text-[9px] px-1.5 py-0 h-5 font-mono">
                      ns{ns.index}: {ns.name}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <Separator />
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-1.5 space-y-0.5">
                  {nodeSearch.trim() && searchResults && searchResults.length > 0 ? (
                    <div className="space-y-0.5">
                      {searchResults.map(n => (
                        <button
                          key={n.nodeId}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-left',
                            selectedNode?.nodeId === n.nodeId ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                          )}
                          onClick={() => handleSelectNode(n)}
                        >
                          <NodeIcon nodeClass={n.nodeClass} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate flex-1">{n.displayName}</span>
                          <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[100px]">{n.nodeId}</span>
                        </button>
                      ))}
                    </div>
                  ) : nodeSearch.trim() ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">Ничего не найдено</p>
                  ) : (
                    filteredTreeData.map(node => (
                      <TreeViewItem
                        key={node.nodeId}
                        node={node}
                        depth={0}
                        selectedNodeId={selectedNode?.nodeId || null}
                        expandedNodes={expandedNodes}
                        onSelect={handleSelectNode}
                        onToggle={handleToggleNode}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* ====== NODE DETAIL PANEL (RIGHT) ====== */}
          <div className="flex-1 min-w-0 space-y-4">
            {!selectedNode ? (
              <Card>
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Выберите узел</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Нажмите на узел в дереве информационной модели для просмотра подробной информации, значений и ссылок.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Node Info Card */}
                <Card>
                  <CardHeader className="pb-2 px-4 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <NodeIcon nodeClass={selectedNode.nodeClass} className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <CardTitle className="text-sm truncate">{selectedNode.displayName}</CardTitle>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{selectedNode.browseName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0', getNodeClassColor(selectedNode.nodeClass))}>
                        {getNodeClassLabel(selectedNode.nodeClass)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground shrink-0">NodeId:</span>
                        <code className="font-mono text-[11px] bg-muted/50 rounded px-1.5 py-0.5 flex-1 truncate">{selectedNode.nodeId}</code>
                        <CopyButton text={selectedNode.nodeId} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground shrink-0">BrowseName:</span>
                        <code className="font-mono text-[11px] bg-muted/50 rounded px-1.5 py-0.5 flex-1 truncate">{selectedNode.browseName}</code>
                      </div>
                    </div>
                    {selectedNode.description && (
                      <p className="text-xs text-muted-foreground">{selectedNode.description}</p>
                    )}

                    {/* Access Level badges */}
                    {isVariableNode && selectedNode.accessLevel && selectedNode.accessLevel.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        {selectedNode.accessLevel.map(al => (
                          <Badge key={al} variant="outline" className="text-[9px] px-1.5 py-0">
                            {al === 'CurrentRead' ? 'Чтение' : al === 'CurrentWrite' ? 'Запись' : al === 'HistoryRead' ? 'История (Чт)' : 'История (Зап)'}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* References Table */}
                {selectedNode.references && selectedNode.references.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-3">
                      <CardTitle className="text-xs flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" />
                        Ссылки ({selectedNode.references.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-[10px]">
                              <TableHead className="h-7 text-[10px]">BrowseName</TableHead>
                              <TableHead className="h-7 text-[10px]">Класс</TableHead>
                              <TableHead className="h-7 text-[10px]">Тип ссылки</TableHead>
                              <TableHead className="h-7 text-[10px]">NodeId</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedNode.references.map((ref, i) => (
                              <TableRow key={i} className="text-[11px]">
                                <TableCell className="py-1.5 font-medium">{ref.browseName}</TableCell>
                                <TableCell className="py-1.5">
                                  <Badge variant="outline" className={cn('text-[9px] px-1 py-0', getNodeClassColor(ref.nodeClass))}>
                                    {ref.nodeClass}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 font-mono text-muted-foreground">{ref.referenceType}</TableCell>
                                <TableCell className="py-1.5 font-mono text-muted-foreground truncate max-w-[140px]">{ref.nodeId}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Variable Value Panel */}
                {isVariableNode && (
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                          <Gauge className="h-3.5 w-3.5" />
                          Значение переменной
                        </CardTitle>
                        {selectedNode.dataType && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                            {selectedNode.dataType}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      {/* Large value display */}
                      <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-center">
                        <div className="text-center">
                          <div className={cn(
                            'text-2xl sm:text-3xl font-bold font-mono tabular-nums',
                            isNumericType && typeof selectedNode.value === 'number' && hasAlarm
                              ? (selectedNode.alarmState === 'Normal'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : selectedNode.alarmState === 'High' || selectedNode.alarmState === 'Low'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400')
                              : ''
                          )}>
                            {selectedNode.dataType === 'Boolean'
                              ? (selectedNode.value ? 'ВКЛ' : 'ВЫКЛ')
                              : selectedNode.dataType === 'String'
                                ? String(selectedNode.value)
                                : Array.isArray(selectedNode.value)
                                  ? JSON.stringify(selectedNode.value)
                                  : typeof selectedNode.value === 'object' && selectedNode.value !== null
                                    ? JSON.stringify(selectedNode.value, null, 2)
                                    : String(selectedNode.value ?? '—')}
                          </div>
                          {selectedNode.valueRank !== undefined && selectedNode.valueRank !== -1 && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Размерность массива: {selectedNode.arrayDimensions?.length ? `[${selectedNode.arrayDimensions.join(', ')}]` : selectedNode.valueRank === 1 ? '1D' : `Rank: ${selectedNode.valueRank}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {selectedNode.sourceTimestamp && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Источник: {formatTime(selectedNode.sourceTimestamp)}</span>
                          </div>
                        )}
                        {selectedNode.serverTimestamp && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            <span>Сервер: {formatTime(selectedNode.serverTimestamp)}</span>
                          </div>
                        )}
                      </div>

                      {/* Alarm Info */}
                      {hasAlarm && (
                        <div className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs font-semibold">Пределы аварии</span>
                            {selectedNode.alarmState && (
                              <Badge variant="outline" className={cn('text-[9px] ml-auto', getAlarmBadgeStyle(selectedNode.alarmState))}>
                                {getAlarmLabel(selectedNode.alarmState)}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            {selectedNode.highHighLimit !== undefined && (
                              <div className="rounded bg-red-500/5 px-2 py-1.5 text-center">
                                <p className="font-bold text-red-600 dark:text-red-400">{selectedNode.highHighLimit}</p>
                                <p className="text-muted-foreground">HH порог</p>
                              </div>
                            )}
                            {selectedNode.highLimit !== undefined && (
                              <div className="rounded bg-amber-500/5 px-2 py-1.5 text-center">
                                <p className="font-bold text-amber-600 dark:text-amber-400">{selectedNode.highLimit}</p>
                                <p className="text-muted-foreground">H порог</p>
                              </div>
                            )}
                            {selectedNode.lowLimit !== undefined && (
                              <div className="rounded bg-sky-500/5 px-2 py-1.5 text-center">
                                <p className="font-bold text-sky-600 dark:text-sky-400">{selectedNode.lowLimit}</p>
                                <p className="text-muted-foreground">L порог</p>
                              </div>
                            )}
                            {selectedNode.lowLowLimit !== undefined && (
                              <div className="rounded bg-red-500/5 px-2 py-1.5 text-center">
                                <p className="font-bold text-red-600 dark:text-red-400">{selectedNode.lowLowLimit}</p>
                                <p className="text-muted-foreground">LL порог</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* History Sparkline */}
                      {hasHistory && (
                        <div className="rounded-md border p-3 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Тренд (последние {selectedNode.history!.length} значений)</span>
                          <div className="flex justify-center">
                            <MiniSparkline
                              data={selectedNode.history!.map(h => h.value)}
                              width={280}
                              height={40}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                            <span>{formatTime(selectedNode.history![0].timestamp)}</span>
                            <span>{formatTime(selectedNode.history![selectedNode.history!.length - 1].timestamp)}</span>
                          </div>
                        </div>
                      )}

                      {/* Write Value */}
                      {isWritable && (
                        <div className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Edit3Icon className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">Записать значение</span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={writeValue}
                              onChange={(e) => setWriteValue(e.target.value)}
                              placeholder={selectedNode.dataType === 'Boolean' ? 'true / false' : 'Новое значение...'}
                              className="h-8 text-xs font-mono flex-1"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleWrite(); }}
                            />
                            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleWrite} disabled={writing || !writeValue.trim()}>
                              {writing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              Записать
                            </Button>
                          </div>
                          {writeResult && (
                            <div className={cn(
                              'flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px]',
                              writeResult.success
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            )}>
                              {writeResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {writeResult.message}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Method Call button */}
                      {isMethodNode && (
                        <div className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Code className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">Вызов метода</span>
                          </div>
                          {selectedNode.description && (
                            <p className="text-[10px] text-muted-foreground">{selectedNode.description}</p>
                          )}
                          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => {
                            // Simulated method call
                            setTimeout(() => {
                              setWriteResult({ success: true, message: `Метод "${selectedNode.displayName}" выполнен успешно` });
                            }, 500);
                          }}>
                            <Play className="h-3 w-3" />
                            Выполнить
                          </Button>
                          {writeResult && (
                            <div className={cn(
                              'flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px]',
                              writeResult.success
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            )}>
                              {writeResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {writeResult.message}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Children table */}
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 px-4 pt-3">
                      <CardTitle className="text-xs flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Дочерние узлы ({selectedNode.children.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="rounded-md border overflow-hidden max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-[10px]">
                              <TableHead className="h-7 text-[10px]">Имя</TableHead>
                              <TableHead className="h-7 text-[10px]">Класс</TableHead>
                              <TableHead className="h-7 text-[10px]">Тип данных</TableHead>
                              <TableHead className="h-7 text-[10px]">Значение</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedNode.children.map(child => (
                              <TableRow
                                key={child.nodeId}
                                className="text-[11px] cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSelectNode(child)}
                              >
                                <TableCell className="py-1.5 font-medium flex items-center gap-1.5">
                                  <NodeIcon nodeClass={child.nodeClass} className="h-3 w-3 text-muted-foreground" />
                                  {child.displayName}
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <Badge variant="outline" className={cn('text-[9px] px-1 py-0', getNodeClassColor(child.nodeClass))}>
                                    {getNodeClassLabel(child.nodeClass)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 font-mono text-muted-foreground">{child.dataType || '—'}</TableCell>
                                <TableCell className="py-1.5 font-mono truncate max-w-[120px]">
                                  {child.nodeClass === 'Variable'
                                    ? child.dataType === 'Boolean'
                                      ? (child.value ? 'ВКЛ' : 'ВЫКЛ')
                                      : String(child.value ?? '—')
                                    : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ====== SUBSCRIPTIONS MANAGEMENT ====== */}
      {connectionStatus === 'connected' && (
        <Card>
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Подписки
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {subscriptions.length} активных
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Create subscription form */}
            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <span className="text-xs font-semibold">Создать подписку</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Интервал (мс)</Label>
                  <Input value={newSubInterval} onChange={(e) => setNewSubInterval(e.target.value)} className="h-7 text-xs font-mono" placeholder="1000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Keep-Alive</Label>
                  <Input value={newSubKeepAlive} onChange={(e) => setNewSubKeepAlive(e.target.value)} className="h-7 text-xs font-mono" placeholder="10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Lifetime</Label>
                  <Input value={newSubLifetime} onChange={(e) => setNewSubLifetime(e.target.value)} className="h-7 text-xs font-mono" placeholder="30" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Макс. увед.</Label>
                  <Input value={newSubMaxNotif} onChange={(e) => setNewSubMaxNotif(e.target.value)} className="h-7 text-xs font-mono" placeholder="100" />
                </div>
              </div>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleCreateSubscription}>
                <Plus className="h-3 w-3" />
                Создать подписку
              </Button>
            </div>

            {/* Subscriptions table */}
            {subscriptions.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead className="h-8 text-[10px]">ID</TableHead>
                      <TableHead className="h-8 text-[10px]">Интервал</TableHead>
                      <TableHead className="h-8 text-[10px]">Keep-Alive</TableHead>
                      <TableHead className="h-8 text-[10px]">Элементы</TableHead>
                      <TableHead className="h-8 text-[10px]">Статус</TableHead>
                      <TableHead className="h-8 text-[10px]">Создана</TableHead>
                      <TableHead className="h-8 text-[10px] text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map(sub => (
                      <>
                        <TableRow key={sub.id} className="text-[11px]">
                          <TableCell className="py-2 font-mono">{sub.id.slice(-6)}</TableCell>
                          <TableCell className="py-2 font-mono">{sub.publishingInterval} мс</TableCell>
                          <TableCell className="py-2 font-mono">{sub.keepAliveCount}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[9px]">{sub.items.length}</Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={cn(
                              'text-[9px]',
                              sub.status === 'active' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                              sub.status === 'paused' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' :
                              'border-red-500/30 text-red-600 dark:text-red-400'
                            )}>
                              {sub.status === 'active' ? 'Активна' : sub.status === 'paused' ? 'Пауза' : 'Ошибка'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-muted-foreground">{formatDateTime(sub.createdAt)}</TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setAddMonitorSubId(sub.id);
                                      setAddMonitorDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Добавить элемент</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleSubscription(sub.id)}>
                                    {sub.status === 'active' ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{sub.status === 'active' ? 'Пауза' : 'Возобновить'}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSubscription(sub.id)}>
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Удалить</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Monitored items */}
                        {sub.items.length > 0 && (
                          <TableRow key={`${sub.id}-items`} className="bg-muted/20">
                            <TableCell colSpan={7} className="py-2 px-8">
                              <div className="rounded border bg-background overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="text-[9px]">
                                      <TableHead className="h-6 text-[9px]">NodeId</TableHead>
                                      <TableHead className="h-6 text-[9px]">Имя</TableHead>
                                      <TableHead className="h-6 text-[9px]">Интервал (мс)</TableHead>
                                      <TableHead className="h-6 text-[9px]">Очередь</TableHead>
                                      <TableHead className="h-6 text-[9px]">Диск. старых</TableHead>
                                      <TableHead className="h-6 text-[9px] text-right">Действия</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sub.items.map(item => (
                                      <TableRow key={item.id} className="text-[10px]">
                                        <TableCell className="py-1 font-mono">{item.nodeId}</TableCell>
                                        <TableCell className="py-1">{item.browseName}</TableCell>
                                        <TableCell className="py-1 font-mono">{item.samplingInterval}</TableCell>
                                        <TableCell className="py-1 font-mono">{item.queueSize}</TableCell>
                                        <TableCell className="py-1">{item.discardOldest ? 'Да' : 'Нет'}</TableCell>
                                        <TableCell className="py-1 text-right">
                                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveMonitoredItem(sub.id, item.id)}>
                                            <Trash2 className="h-2.5 w-2.5 text-red-500" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6">
                <Radio className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">Нет активных подписок</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Создайте подписку для отслеживания изменений переменных</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ====== ADD MONITORED ITEM DIALOG ====== */}
      <Dialog open={addMonitorDialogOpen} onOpenChange={setAddMonitorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Добавить отслеживаемый элемент</DialogTitle>
            <DialogDescription className="text-xs">
              Укажите NodeId переменной для мониторинга
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">NodeId</Label>
              <Input
                value={addMonitorNodeId}
                onChange={(e) => setAddMonitorNodeId(e.target.value)}
                placeholder="ns=2;s=Machine1.Temperature"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Интервал опроса (мс)</Label>
                <Input
                  value={addMonitorInterval}
                  onChange={(e) => setAddMonitorInterval(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Размер очереди</Label>
                <Input
                  value={addMonitorQueue}
                  onChange={(e) => setAddMonitorQueue(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setAddMonitorDialogOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" className="text-xs gap-1" onClick={handleAddMonitoredItem} disabled={!addMonitorNodeId.trim()}>
              <Plus className="h-3 w-3" />
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====== Inline icon helper (to avoid extra imports) ======
function Edit3Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

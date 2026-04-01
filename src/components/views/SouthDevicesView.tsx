'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Trash2, Play, Square, Edit, Settings,
  Server, Wifi, WifiOff, AlertCircle, Clock, Tag, Cpu, Plug,
  Download, Upload, RotateCcw, Check, X, LayoutTemplate,
  ChevronRight, Filter, BookmarkCheck, ArrowUpDown, Activity,
  Link, Factory, Building, Zap, Network, Cloud, Code,
  Cable, FileText, Monitor, Radio, Globe, Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  PROTOCOLS, getProtocol, getGroupedFields, GROUP_LABELS, PROTOCOL_CATEGORIES,
  type ProtocolDef, type ProtocolField,
} from '@/lib/protocol-registry';
import {
  MODBUS_TEMPLATES, TEMPLATE_CATEGORIES, createDeviceFromTemplate, DEVICE_TEMPLATES,
  getAllTemplates, getTemplateById,
  type ModbusTemplate, type ModbusDeviceTemplate,
} from '@/lib/modbus-templates';
import {
  usePersistentArray, saveToStorage, loadFromStorage, clearAllStorage,
} from '@/lib/use-persistent-state';

// ── Types ──────────────────────────────────────────────────────────

interface DeviceTag {
  id: string;
  name: string;
  address: string;
  tagType: string;
  dataType: string;
  unit: string;
  scale: number;
  offset: number;
  access: string;
  group: string;
  scanRate: number;
  value?: number | string | boolean;
  quality?: 'good' | 'bad' | 'uncertain';
}

interface SouthDevice {
  id: string;
  name: string;
  description?: string;
  protocolId: string;
  protocol: string;
  host?: string;
  port?: number;
  path?: string;
  baudRate?: number;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  pollInterval: number;
  timeout: number;
  retries: number;
  autoReconnect: boolean;
  slaveCount: number;
  byteOrder?: string;
  templateId?: string;
  tags: DeviceTag[];
  lastSeen?: string | null;
  uptime?: number;
  settings: Record<string, string | number | boolean>;
}

// ── Initial mock data ──────────────────────────────────────────────

const initialDevices: SouthDevice[] = [
  {
    id: 's1', name: 'Modbus TCP - Цех 1', description: 'Основной PLC цеха 1',
    protocolId: 'modbus-tcp', protocol: 'Modbus TCP',
    host: '192.168.1.10', port: 502,
    status: 'connected', pollInterval: 1000, timeout: 5000, retries: 3,
    autoReconnect: true, slaveCount: 3, byteOrder: 'big-endian',
    tags: [
      { id: 't1', name: 'Температура', address: '40001', tagType: 'holding', dataType: 'FLOAT', unit: '°C', scale: 0.1, offset: 0, access: 'read', group: 'process', scanRate: 1000, value: 42.5, quality: 'good' },
      { id: 't2', name: 'Давление', address: '40003', tagType: 'holding', dataType: 'FLOAT', unit: 'бар', scale: 1, offset: 0, access: 'read', group: 'process', scanRate: 1000, value: 3.2, quality: 'good' },
      { id: 't3', name: 'Уровень бака', address: '40005', tagType: 'holding', dataType: 'INT16', unit: 'л', scale: 1, offset: 0, access: 'read', group: 'process', scanRate: 1000, value: 780, quality: 'good' },
      { id: 't4', name: 'Состояние насоса', address: '00001', tagType: 'coil', dataType: 'BOOL', unit: '', scale: 1, offset: 0, access: 'readWrite', group: 'control', scanRate: 500, value: true, quality: 'good' },
      { id: 't5', name: 'Скорость двигателя', address: '40007', tagType: 'holding', dataType: 'INT16', unit: 'об/мин', scale: 1, offset: 0, access: 'readWrite', group: 'process', scanRate: 1000, value: 1450, quality: 'good' },
      { id: 't6', name: 'Ток фазы A', address: '40009', tagType: 'holding', dataType: 'FLOAT', unit: 'А', scale: 0.01, offset: 0, access: 'read', group: 'electrical', scanRate: 1000, value: 12.5, quality: 'uncertain' },
      { id: 't7', name: 'Вибрация', address: '40011', tagType: 'holding', dataType: 'FLOAT', unit: 'мм/с', scale: 0.1, offset: 0, access: 'read', group: 'diagnostics', scanRate: 2000, value: 4.8, quality: 'bad' },
      { id: 't8', name: 'Мощность', address: '40013', tagType: 'holding', dataType: 'FLOAT', unit: 'кВт', scale: 0.01, offset: 0, access: 'read', group: 'electrical', scanRate: 1000, value: 5.6, quality: 'good' },
    ],
    lastSeen: new Date().toISOString(), uptime: 864000,
    settings: { host: '192.168.1.10', port: 502, slaveId: 1, timeout: 5000, retries: 3, pollInterval: 1000, byteOrder: 'big-endian', autoReconnect: true },
  },
  {
    id: 's2', name: 'Modbus RTU - Линия 2', description: 'Последовательная линия производства',
    protocolId: 'modbus-rtu', protocol: 'Modbus RTU',
    path: '/dev/ttyUSB0', baudRate: 9600,
    status: 'connected', pollInterval: 2000, timeout: 3000, retries: 2,
    autoReconnect: true, slaveCount: 1, byteOrder: 'big-endian',
    tags: [
      { id: 't9', name: 'Темп. подшипника', address: '30001', tagType: 'input', dataType: 'FLOAT', unit: '°C', scale: 0.1, offset: 0, access: 'read', group: 'process', scanRate: 2000, value: 55.2, quality: 'good' },
      { id: 't10', name: 'Расход', address: '30003', tagType: 'input', dataType: 'FLOAT', unit: 'м³/ч', scale: 0.01, offset: 0, access: 'read', group: 'process', scanRate: 2000, value: 12.4, quality: 'good' },
      { id: 't11', name: 'Поток 1', address: '00001', tagType: 'coil', dataType: 'BOOL', unit: '', scale: 1, offset: 0, access: 'read', group: 'status', scanRate: 1000, value: true, quality: 'good' },
      { id: 't12', name: 'Авария', address: '00002', tagType: 'coil', dataType: 'BOOL', unit: '', scale: 1, offset: 0, access: 'read', group: 'status', scanRate: 500, value: false, quality: 'good' },
    ],
    lastSeen: new Date().toISOString(), uptime: 432000,
    settings: { slaveId: 1, timeout: 3000, retries: 2, pollInterval: 2000, byteOrder: 'big-endian', port: '/dev/ttyUSB0', baudRate: '9600', autoReconnect: true },
  },
  {
    id: 's3', name: 'OPC UA - Сервер', description: 'OPC UA сервер для АСУ ТП',
    protocolId: 'opcua', protocol: 'OPC UA',
    host: '192.168.1.100', port: 4840,
    status: 'disconnected', pollInterval: 500, timeout: 10000, retries: 3,
    autoReconnect: true, slaveCount: 0,
    tags: [
      { id: 't13', name: 'Температура', address: 'ns=2;s=Temperature', tagType: 'holding', dataType: 'FLOAT', unit: '°C', scale: 1, offset: 0, access: 'read', group: 'process', scanRate: 500, value: 0, quality: 'bad' },
      { id: 't14', name: 'Давление', address: 'ns=2;s=Pressure', tagType: 'holding', dataType: 'FLOAT', unit: 'бар', scale: 1, offset: 0, access: 'read', group: 'process', scanRate: 500, value: 0, quality: 'bad' },
      { id: 't15', name: 'Состояние', address: 'ns=2;s=Status', tagType: 'holding', dataType: 'BOOL', unit: '', scale: 1, offset: 0, access: 'read', group: 'status', scanRate: 1000, value: false, quality: 'bad' },
    ],
    lastSeen: null,
    settings: { endpoint: 'opc.tcp://192.168.1.100:4840', securityMode: 'SignAndEncrypt', securityPolicy: 'Basic256Sha256', authMode: 'anonymous', timeout: 10000, pollInterval: 500, autoReconnect: true },
  },
  {
    id: 's4', name: 'Siemens S7 - Станок ЧПУ', description: 'Станок с ЧПУ Siemens S7-1200',
    protocolId: 'siemens-s7', protocol: 'Siemens S7',
    host: '192.168.1.50', port: 102,
    status: 'connected', pollInterval: 500, timeout: 3000, retries: 3,
    autoReconnect: true, slaveCount: 1,
    tags: [
      { id: 't16', name: 'DB1.DBX0.0', address: 'DB1.DBX0.0', tagType: 'holding', dataType: 'BOOL', unit: '', scale: 1, offset: 0, access: 'readWrite', group: 'flags', scanRate: 500, value: true, quality: 'good' },
      { id: 't17', name: 'Скорость шпинделя', address: 'DB1.DBW2', tagType: 'holding', dataType: 'INT16', unit: 'об/мин', scale: 1, offset: 0, access: 'read', group: 'process', scanRate: 500, value: 8000, quality: 'good' },
      { id: 't18', name: 'Температура шпинделя', address: 'DB1.DBD4', tagType: 'holding', dataType: 'FLOAT', unit: '°C', scale: 0.1, offset: 0, access: 'read', group: 'process', scanRate: 1000, value: 38.5, quality: 'good' },
    ],
    lastSeen: new Date().toISOString(), uptime: 259200,
    settings: { host: '192.168.1.50', port: 102, plcType: 'S7-1200', rack: 0, slot: 1, timeout: 3000, pollInterval: 500, autoReconnect: true },
  },
  {
    id: 's5', name: 'BACnet - ОВК Система', description: 'Отопление, вентиляция, кондиционирование',
    protocolId: 'bacnet-ip', protocol: 'BACnet/IP',
    host: '192.168.1.200', port: 47808,
    status: 'error', pollInterval: 10000, timeout: 5000, retries: 3,
    autoReconnect: false, slaveCount: 0,
    tags: [
      { id: 't19', name: 'Темп. подачи', address: 'AI-1', tagType: 'input', dataType: 'FLOAT', unit: '°C', scale: 0.1, offset: 0, access: 'read', group: 'hvac', scanRate: 10000, value: 65.2, quality: 'uncertain' },
      { id: 't20', name: 'Темп. обратки', address: 'AI-2', tagType: 'input', dataType: 'FLOAT', unit: '°C', scale: 0.1, offset: 0, access: 'read', group: 'hvac', scanRate: 10000, value: 50.1, quality: 'uncertain' },
    ],
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    settings: { host: '192.168.1.200', port: 47808, deviceInstance: 1, networkType: 'ip', timeout: 5000, pollInterval: 10000 },
  },
  {
    id: 's6', name: 'IEC 104 - Подстанция', description: 'Телемеханика подстанции 110кВ',
    protocolId: 'iec104', protocol: 'IEC 60870-5-104',
    host: '192.168.2.10', port: 2404,
    status: 'connected', pollInterval: 2000, timeout: 10000, retries: 5,
    autoReconnect: true, slaveCount: 0,
    tags: [
      { id: 't21', name: 'U фазы A', address: 'M_ME_NC_1', tagType: 'holding', dataType: 'FLOAT', unit: 'кВ', scale: 0.01, offset: 0, access: 'read', group: 'voltage', scanRate: 2000, value: 110.2, quality: 'good' },
      { id: 't22', name: 'I фазы A', address: 'M_ME_NC_2', tagType: 'holding', dataType: 'FLOAT', unit: 'А', scale: 0.1, offset: 0, access: 'read', group: 'current', scanRate: 2000, value: 245.3, quality: 'good' },
      { id: 't23', name: 'Активная мощность', address: 'M_ME_NC_3', tagType: 'holding', dataType: 'FLOAT', unit: 'МВт', scale: 0.01, offset: 0, access: 'read', group: 'power', scanRate: 2000, value: 45.6, quality: 'good' },
    ],
    lastSeen: new Date().toISOString(), uptime: 604800,
    settings: { host: '192.168.2.10', port: 2404, asduAddress: 1, caAsduAddress: 1, timeoutT1: 15000, timeoutT2: 10000, timeoutT3: 20, timeSync: true },
  },
  {
    id: 's7', name: 'ABB ACS580 - Насос 1', description: 'Частотный преобразователь насосной станции',
    protocolId: 'modbus-tcp', protocol: 'Modbus TCP',
    host: '192.168.1.15', port: 502,
    status: 'connected', pollInterval: 500, timeout: 5000, retries: 3,
    autoReconnect: true, slaveCount: 0, byteOrder: 'big-endian', templateId: 'abb-acs580',
    tags: [
      { id: 't24', name: 'Текущая частота', address: '40006', tagType: 'holding', dataType: 'FLOAT', unit: 'Гц', scale: 0.01, offset: 0, access: 'read', group: 'vfd', scanRate: 500, value: 45.0, quality: 'good' },
      { id: 't25', name: 'Ток двигателя', address: '40010', tagType: 'holding', dataType: 'FLOAT', unit: 'А', scale: 0.01, offset: 0, access: 'read', group: 'vfd', scanRate: 500, value: 18.3, quality: 'good' },
      { id: 't26', name: 'Мощность', address: '40014', tagType: 'holding', dataType: 'FLOAT', unit: 'кВт', scale: 0.01, offset: 0, access: 'read', group: 'vfd', scanRate: 1000, value: 11.2, quality: 'good' },
    ],
    lastSeen: new Date().toISOString(), uptime: 172800,
    settings: { host: '192.168.1.15', port: 502, slaveId: 1, timeout: 5000, retries: 3, pollInterval: 500, byteOrder: 'big-endian', autoReconnect: true },
  },
  {
    id: 's8', name: 'SNMP - Коммутатор', description: 'Core-коммутатор сети',
    protocolId: 'snmp-v2c', protocol: 'SNMP v2c',
    host: '192.168.1.1', port: 161,
    status: 'connected', pollInterval: 5000, timeout: 3000, retries: 2,
    autoReconnect: true, slaveCount: 0,
    tags: [
      { id: 't27', name: 'CPU загрузка', address: '1.3.6.1.4.1.9.2.1.56.0', tagType: 'holding', dataType: 'INT16', unit: '%', scale: 1, offset: 0, access: 'read', group: 'system', scanRate: 5000, value: 23, quality: 'good' },
      { id: 't28', name: 'Память', address: '1.3.6.1.4.1.9.2.1.8.0', tagType: 'holding', dataType: 'INT16', unit: '%', scale: 1, offset: 0, access: 'read', group: 'system', scanRate: 5000, value: 45, quality: 'good' },
    ],
    lastSeen: new Date().toISOString(), uptime: 1728000,
    settings: { host: '192.168.1.1', port: 161, communityRead: 'public', communityWrite: 'private', maxRepetitions: 10, timeout: 3000 },
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return 'Никогда';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

function qualityColor(q?: string) {
  if (q === 'good') return 'text-emerald-500';
  if (q === 'bad') return 'text-red-500';
  if (q === 'uncertain') return 'text-amber-500';
  return 'text-muted-foreground';
}

function qualityBg(q?: string) {
  if (q === 'good') return 'bg-emerald-500';
  if (q === 'bad') return 'bg-red-500';
  if (q === 'uncertain') return 'bg-amber-500';
  return 'bg-gray-400';
}

function randomFluctuation(value: number | string | boolean | undefined, dataType: string): number | string | boolean {
  if (value === undefined || value === null) return 0;
  if (dataType === 'BOOL') return Math.random() > 0.15 ? value : !value;
  const num = Number(value);
  if (isNaN(num)) return value;
  const range = Math.max(Math.abs(num) * 0.02, 0.5);
  return Math.round((num + (Math.random() - 0.5) * range) * 100) / 100;
}

// ── Dynamic icon helper ────────────────────────────────────────────
function ProtocolIcon({ iconName, className }: { iconName: string; className?: string }) {
  const iconMap: Record<string, React.ElementType> = {
    Cpu, Link, Factory, Building, Zap, Network, Cloud, Code,
    Cable, FileText, Monitor, Radio, Server, Globe, Wifi,
  };
  const Icon = iconMap[iconName] || Cpu;
  return <Icon className={className || 'h-4 w-4'} />;
}

// ── Component ──────────────────────────────────────────────────────

export function SouthDevicesView() {
  const [devices, setDevices] = usePersistentArray<SouthDevice>('south-devices', initialDevices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<SouthDevice | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('all');
  const [selectedTemplatePreview, setSelectedTemplatePreview] = useState<ModbusDeviceTemplate | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state for add/edit
  const [editDevice, setEditDevice] = useState<SouthDevice | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formProtocolId, setFormProtocolId] = useState('modbus-tcp');
  const [formSettings, setFormSettings] = useState<Record<string, string | number | boolean>>({});
  const [settingsTab, setSettingsTab] = useState('connection');

  // Simulate real-time tag values
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices((prev: SouthDevice[]) => prev.map(d => {
        if (d.status !== 'connected' || d.tags.length === 0) return d;
        const updatedTags = d.tags.map(t => ({
          ...t,
          value: randomFluctuation(t.value, t.dataType),
          quality: (t.quality === 'good'
            ? (Math.random() > 0.95 ? 'uncertain' : 'good')
            : (Math.random() > 0.8 ? 'good' : t.quality)) as DeviceTag['quality'],
        }));
        return { ...d, tags: updatedTags } as SouthDevice;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [setDevices]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2000);
  }, []);

  // ── Derived data ──
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const proto = getProtocol(d.protocolId);
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.protocol.toLowerCase().includes(search.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesCategory = selectedCategories.length === 0 ||
        (proto && selectedCategories.includes(proto.category));
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [devices, search, statusFilter, selectedCategories]);

  const statusCounts = useMemo(() => ({
    total: devices.length,
    connected: devices.filter(d => d.status === 'connected').length,
    disconnected: devices.filter(d => d.status === 'disconnected').length,
    error: devices.filter(d => d.status === 'error').length,
  }), [devices]);

  const toggleCategory = useCallback((catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  }, []);

  // ── Protocol settings for form ──
  const currentProtocol = useMemo(() => getProtocol(formProtocolId), [formProtocolId]);
  const groupedFields = useMemo(() => {
    if (!currentProtocol) return {};
    return getGroupedFields(currentProtocol);
  }, [currentProtocol]);
  const serialGroupedFields = useMemo(() => {
    if (!currentProtocol?.serialFields) return {};
    const g: Record<string, ProtocolField[]> = {};
    currentProtocol.serialFields.forEach(f => {
      const grp = f.group || 'serial';
      if (!g[grp]) g[grp] = [];
      g[grp].push(f);
    });
    return g;
  }, [currentProtocol]);
  const allGroupKeys = useMemo(() => {
    const keys = Object.keys(groupedFields);
    if (Object.keys(serialGroupedFields).length > 0) keys.push('serial');
    return keys;
  }, [groupedFields, serialGroupedFields]);

  // ── Form operations ──
  const resetForm = useCallback(() => {
    setFormName('');
    setFormDesc('');
    setFormProtocolId('modbus-tcp');
    setFormSettings({});
    setSettingsTab('connection');
  }, []);

  const openAddDialog = useCallback(() => {
    setEditDevice(null);
    resetForm();
    // Set default settings for modbus-tcp
    const proto = getProtocol('modbus-tcp');
    if (proto) {
      const defaults: Record<string, string | number | boolean> = {};
      proto.fields.forEach(f => { defaults[f.key] = f.defaultValue; });
      setFormSettings(defaults);
    }
    setEditDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((device: SouthDevice) => {
    setEditDevice(device);
    setFormName(device.name);
    setFormDesc(device.description || '');
    setFormProtocolId(device.protocolId);
    setFormSettings({ ...device.settings });
    setSettingsTab('connection');
    setEditDialogOpen(true);
  }, []);

  const handleProtocolChange = useCallback((protoId: string) => {
    setFormProtocolId(protoId);
    const proto = getProtocol(protoId);
    if (proto) {
      const defaults: Record<string, string | number | boolean> = {};
      proto.fields.forEach(f => { defaults[f.key] = f.defaultValue; });
      if (proto.serialFields) {
        proto.serialFields.forEach(f => { defaults[f.key] = f.defaultValue; });
      }
      setFormSettings(defaults);
    }
    setSettingsTab('connection');
  }, []);

  const saveDevice = useCallback(() => {
    if (!formName.trim()) return;
    const proto = getProtocol(formProtocolId);
    if (!proto) return;

    if (editDevice) {
      setDevices(prev => prev.map(d => d.id === editDevice.id ? {
        ...d,
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        protocolId: formProtocolId,
        protocol: proto.name,
        host: formSettings.host as string || d.host,
        port: formSettings.port as number || d.port,
        path: formSettings.port as string || d.path,
        baudRate: formSettings.baudRate as number || d.baudRate,
        pollInterval: formSettings.pollInterval as number || d.pollInterval,
        timeout: formSettings.timeout as number || d.timeout,
        retries: formSettings.retries as number || d.retries,
        autoReconnect: formSettings.autoReconnect as boolean ?? d.autoReconnect,
        byteOrder: formSettings.byteOrder as string || d.byteOrder,
        settings: { ...formSettings },
      } : d));
      showToast('Сохранено ✓');
    } else {
      const newDevice: SouthDevice = {
        id: `s${Date.now()}`,
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        protocolId: formProtocolId,
        protocol: proto.name,
        host: proto.isSerial ? undefined : (formSettings.host as string || proto.fields.find(f => f.key === 'host')?.defaultValue as string),
        port: proto.isSerial ? undefined : (formSettings.port as number || proto.defaultPort),
        path: proto.isSerial ? (formSettings.port as string || '/dev/ttyUSB0') : undefined,
        baudRate: proto.isSerial ? (formSettings.baudRate as number || 9600) : undefined,
        status: 'disconnected',
        pollInterval: formSettings.pollInterval as number || 1000,
        timeout: formSettings.timeout as number || 5000,
        retries: formSettings.retries as number || 3,
        autoReconnect: formSettings.autoReconnect as boolean ?? true,
        slaveCount: 0,
        byteOrder: formSettings.byteOrder as string || undefined,
        tags: proto.defaultTags?.map((t, i) => ({
          id: `tag-${Date.now()}-${i}`,
          name: t.name,
          address: t.address,
          tagType: 'holding',
          dataType: t.type,
          unit: t.description,
          scale: 1,
          offset: 0,
          access: 'read' as const,
          group: 'default',
          scanRate: 1000,
          value: 0,
          quality: 'bad' as const,
        })) || [],
        lastSeen: null,
        settings: { ...formSettings },
      };
      setDevices(prev => [newDevice, ...prev]);
      showToast('Устройство добавлено ✓');
    }
    setEditDialogOpen(false);
  }, [formName, formDesc, formProtocolId, formSettings, editDevice, setDevices, showToast]);

  const handleTemplateSelect = useCallback((template: ModbusDeviceTemplate) => {
    const host = prompt('IP-адрес устройства:', '192.168.1.10');
    if (!host) return;
    const name = prompt('Название устройства:', `${template.manufacturer} ${template.model}`);
    const result = createDeviceFromTemplate(template.id, name || `${template.manufacturer} ${template.model}`, host);
    if (result) {
      const newDevice: SouthDevice = {
        id: `s${Date.now()}`,
        name: result.name,
        description: result.description,
        protocolId: 'modbus-tcp',
        protocol: result.protocol,
        host: result.host,
        port: result.port,
        status: 'disconnected',
        pollInterval: result.pollInterval,
        timeout: result.timeout,
        retries: result.retries,
        autoReconnect: result.autoReconnect,
        slaveCount: result.slaveId,
        byteOrder: result.byteOrder,
        templateId: result.templateId,
        tags: result.tags.map((t: any, i: number) => ({
          id: t.id || `tag-${Date.now()}-${i}`,
          name: t.name,
          address: t.address,
          tagType: t.tagType || t.registerType || 'holding',
          dataType: t.dataType,
          unit: t.unit || '',
          scale: t.scale ?? 1,
          offset: t.offset ?? 0,
          access: t.access || 'read',
          group: t.group || 'default',
          scanRate: t.scanRate || 1000,
          value: 0,
          quality: 'bad' as const,
        })),
        lastSeen: null,
        settings: {
          host: result.host,
          port: result.port,
          slaveId: result.slaveId,
          pollInterval: result.pollInterval,
          timeout: result.timeout,
          retries: result.retries,
          autoReconnect: result.autoReconnect,
          byteOrder: result.byteOrder,
        },
      };
      setDevices(prev => [newDevice, ...prev]);
      setSelectedTemplatePreview(null);
      setTemplateDialogOpen(false);
      showToast(`Создано из шаблона: ${template.manufacturer} ${template.model} ✓`);
    }
  }, [setDevices, showToast]);

  const deleteDevice = useCallback((id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    if (detailDevice?.id === id) setDetailDevice(null);
    setConfirmDeleteId(null);
    showToast('Устройство удалено ✓');
  }, [setDevices, detailDevice, showToast]);

  const toggleConnection = useCallback((id: string) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== id) return d;
      const newStatus = d.status === 'connected' ? 'disconnected' : 'connected';
      return {
        ...d,
        status: newStatus as SouthDevice['status'],
        lastSeen: newStatus === 'connected' ? new Date().toISOString() : d.lastSeen,
        tags: newStatus === 'connected'
          ? d.tags.map(t => ({ ...t, quality: 'good' as const }))
          : d.tags.map(t => ({ ...t, quality: t.quality === 'bad' ? 'bad' : 'uncertain' as const })),
      };
    }));
  }, [setDevices]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(devices, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `south-devices-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Экспорт завершён ✓');
  }, [devices, showToast]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string) as SouthDevice[];
          if (Array.isArray(imported)) {
            setDevices(() => imported);
            showToast(`Импортировано ${imported.length} устройств ✓`);
          }
        } catch {
          showToast('Ошибка импорта: неверный формат');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setDevices, showToast]);

  const handleReset = useCallback(() => {
    clearAllStorage();
    setDevices(() => initialDevices);
    showToast('Сброс к дефолтам ✓');
  }, [setDevices, showToast]);

  // ── Template filtering (using new ModbusDeviceTemplate API) ──
  const allDeviceTemplates = useMemo(() => getAllTemplates(), []);

  const filteredDeviceTemplates = useMemo(() => {
    return allDeviceTemplates.filter(t => {
      const matchesSearch = !templateSearch ||
        t.manufacturer.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.model.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.descriptionEn.toLowerCase().includes(templateSearch.toLowerCase());
      const matchesCat = selectedTemplateCategory === 'all' || t.category === selectedTemplateCategory;
      return matchesSearch && matchesCat;
    });
  }, [allDeviceTemplates, templateSearch, selectedTemplateCategory]);

  const templateCategories = useMemo(() => {
    const usedCats = new Set(allDeviceTemplates.map(t => t.category));
    return TEMPLATE_CATEGORIES.filter(cat => usedCats.has(cat.id));
  }, [allDeviceTemplates]);

  const templateGroups = useMemo(() => {
    const groups: Record<string, ModbusDeviceTemplate[]> = {};
    filteredDeviceTemplates.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredDeviceTemplates]);

  const templateRegisterGroups = useMemo(() => {
    if (!selectedTemplatePreview) return [];
    const groups: Record<string, { name: string; nameEn: string; registers: typeof selectedTemplatePreview.registers }> = {};
    selectedTemplatePreview.registers.forEach(r => {
      if (!groups[r.group]) groups[r.group] = { name: r.group, nameEn: r.groupEn, registers: [] };
      groups[r.group].registers.push(r);
    });
    return Object.values(groups);
  }, [selectedTemplatePreview]);

  // ── Render helpers ──
  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'disconnected': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30';
      case 'error': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      default: return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  };

  const renderFieldInput = (field: ProtocolField, value: string | number | boolean, onChange: (key: string, val: string | number | boolean) => void) => {
    if (field.type === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <Label className="text-sm">{field.label}</Label>
          <Switch
            checked={!!value}
            onCheckedChange={v => onChange(field.key, v)}
          />
        </div>
      );
    }
    if (field.type === 'select' && field.options) {
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.label}</Label>
          <Select value={String(value)} onValueChange={v => onChange(field.key, v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    }
    if (field.type === 'number') {
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.label}</Label>
          <Input
            type="number"
            value={String(value)}
            onChange={e => {
              const v = e.target.value === '' ? field.defaultValue : Number(e.target.value);
              onChange(field.key, v);
            }}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            placeholder={field.placeholder}
            className="h-9"
          />
          {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
        </div>
      );
    }
    // string
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <Input
          value={String(value)}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="h-9"
        />
        {field.description && <p className="text-[11px] text-muted-foreground">{field.description}</p>}
      </div>
    );
  };

  const updateSetting = useCallback((key: string, val: string | number | boolean) => {
    setFormSettings(prev => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="h-4 w-4" />
          {toastMsg}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Всего', value: statusCounts.total, icon: <Server className="h-4 w-4 text-muted-foreground" /> },
          { label: 'Подключено', value: statusCounts.connected, icon: <Wifi className="h-4 w-4 text-emerald-500" /> },
          { label: 'Отключено', value: statusCounts.disconnected, icon: <WifiOff className="h-4 w-4 text-gray-400" /> },
          { label: 'Ошибка', value: statusCounts.error, icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
        ].map(s => (
          <Card key={s.label} className="py-3">
            <CardContent className="flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Добавить
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTemplateDialogOpen(true)}>
            <LayoutTemplate className="h-4 w-4" /> Из шаблона
          </Button>
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск устройств..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="connected">Подключено</SelectItem>
            <SelectItem value="disconnected">Отключено</SelectItem>
            <SelectItem value="error">Ошибка</SelectItem>
          </SelectContent>
        </Select>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Экспорт</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Экспорт JSON</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleImport}>
                <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Импорт</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Импорт JSON</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Сброс</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Сброс к дефолтам</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        <Badge
          variant={selectedCategories.length === 0 ? 'default' : 'outline'}
          className="cursor-pointer text-[11px] h-6"
          onClick={() => setSelectedCategories([])}
        >
          Все
        </Badge>
        {PROTOCOL_CATEGORIES.map(cat => {
          const count = PROTOCOLS.filter(p => p.category === cat.id).length;
          if (count === 0) return null;
          const isActive = selectedCategories.includes(cat.id);
          return (
            <Badge
              key={cat.id}
              variant={isActive ? 'default' : 'outline'}
              className="cursor-pointer text-[11px] h-6 gap-1"
              onClick={() => toggleCategory(cat.id)}
            >
              <ProtocolIcon iconName={cat.icon} className="h-3 w-3" />
              {cat.name}
              <span className="ml-0.5 opacity-70">({count})</span>
            </Badge>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Показано {filteredDevices.length} из {devices.length} устройств
      </p>

      {/* Device Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredDevices.map(device => {
          const proto = getProtocol(device.protocolId);
          const goodCount = device.tags.filter(t => t.quality === 'good').length;
          const badCount = device.tags.filter(t => t.quality === 'bad').length;
          const uncertainCount = device.tags.filter(t => t.quality === 'uncertain').length;
          const topTags = device.tags.slice(0, 3);

          return (
            <Card key={device.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger>
                        <span className={cn(
                          'relative flex h-3 w-3 shrink-0 rounded-full',
                          device.status === 'connected' ? 'bg-emerald-500' :
                          device.status === 'error' ? 'bg-red-500' :
                          'bg-gray-400'
                        )}>
                          {device.status === 'connected' && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {device.status === 'connected' ? 'Подключено' :
                         device.status === 'error' ? 'Ошибка' :
                         device.status === 'connecting' ? 'Подключение...' : 'Отключено'}
                      </TooltipContent>
                    </Tooltip>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{device.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{device.description}</p>
                    </div>
                  </div>
                  {device.templateId && (
                    <Badge variant="outline" className="text-[9px] bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20 shrink-0">
                      <BookmarkCheck className="h-2.5 w-2.5 mr-0.5" />Шаблон
                    </Badge>
                  )}
                </div>

                {/* Protocol badge + Category */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-[10px]', proto?.color)}>
                    <ProtocolIcon iconName={proto?.icon || 'Cpu'} className="h-3 w-3 mr-0.5" />
                    {device.protocol}
                  </Badge>
                  {proto && (
                    <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground">
                      {PROTOCOL_CATEGORIES.find(c => c.id === proto.category)?.name || ''}
                    </Badge>
                  )}
                  {device.byteOrder && (
                    <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground">
                      <ArrowUpDown className="h-2.5 w-2.5 mr-0.5" />
                      {device.byteOrder}
                    </Badge>
                  )}
                </div>

                {/* Connection info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Plug className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono truncate">
                    {proto?.isSerial
                      ? `${device.path} (${device.baudRate} бод)`
                      : `${device.host}:${device.port}`}
                  </span>
                </div>

                {/* Live tag values (top 3) */}
                {device.status === 'connected' && topTags.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {topTags.map(tag => (
                      <div key={tag.id} className="p-1.5 rounded bg-muted/50 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground truncate">{tag.name}</p>
                        <p className={cn('text-xs font-semibold truncate', qualityColor(tag.quality))}>
                          {tag.dataType === 'BOOL'
                            ? (tag.value ? 'ВКЛ' : 'ВЫКЛ')
                            : `${Number(tag.value).toFixed(tag.dataType === 'FLOAT' || tag.dataType === 'DOUBLE' ? 1 : 0)}${tag.unit ? ` ${tag.unit}` : ''}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span>{device.tags.length}</span>
                    {device.tags.length > 0 && (
                      <span className="text-muted-foreground">
                        (<span className="text-emerald-500">{goodCount}</span>
                        {badCount > 0 && <><span className="text-muted-foreground">/</span><span className="text-red-500">{badCount}</span></>}
                        {uncertainCount > 0 && <><span className="text-muted-foreground">/</span><span className="text-amber-500">{uncertainCount}</span></>})
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">Опрос: {device.pollInterval}мс</span>
                  <span className="text-muted-foreground ml-auto">{formatTime(device.lastSeen)}</span>
                </div>

                {device.status === 'connected' && device.uptime && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Uptime: {formatUptime(device.uptime)}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-1 border-t">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => toggleConnection(device.id)}>
                        {device.status === 'connected' ? <Square className="h-3 w-3 text-red-500" /> : <Play className="h-3 w-3 text-emerald-500" />}
                        {device.status === 'connected' ? 'Стоп' : 'Старт'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{device.status === 'connected' ? 'Отключить' : 'Подключить'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setDetailDevice(device)}>
                        <Settings className="h-3 w-3" /> Детали
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Подробности</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => openEditDialog(device)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Редактировать</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600" onClick={() => setConfirmDeleteId(device.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Удалить</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDevices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Server className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Устройства не найдены</p>
          <p className="text-xs mt-1">Попробуйте изменить фильтры или добавьте новое устройство</p>
          <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Добавить устройство
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Template Browser Dialog                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) setSelectedTemplatePreview(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Добавить устройство из шаблона
              <Badge variant="secondary" className="ml-2 text-xs">{allDeviceTemplates.length} шаблонов</Badge>
            </DialogTitle>
            <DialogDescription>
              Выберите готовый шаблон. Настройки подключения и карта регистров будут созданы автоматически.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-3 mt-1">
            {/* Search + category badges */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск по производителю, модели или описанию..."
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={selectedTemplateCategory === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer text-[11px] h-6"
                  onClick={() => setSelectedTemplateCategory('all')}
                >
                  Все ({filteredDeviceTemplates.length})
                </Badge>
                {templateCategories.map(cat => {
                  const count = filteredDeviceTemplates.filter(t => t.category === cat.id).length;
                  if (count === 0) return null;
                  const isActive = selectedTemplateCategory === cat.id;
                  return (
                    <Badge
                      key={cat.id}
                      variant={isActive ? 'default' : 'outline'}
                      className="cursor-pointer text-[11px] h-6 gap-1"
                      onClick={() => setSelectedTemplateCategory(isActive ? 'all' : cat.id)}
                    >
                      <ProtocolIcon iconName={cat.icon} className="h-3 w-3" />
                      {cat.name}
                      <span className="opacity-70">{count}</span>
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Template list + preview */}
            <div className="flex-1 overflow-hidden flex gap-3 min-h-0">
              <ScrollArea className="flex-1 min-w-0">
                <div className="space-y-4 pr-2">
                  {templateCategories.map(cat => {
                    const catTemplates = templateGroups[cat.id];
                    if (!catTemplates || catTemplates.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <ProtocolIcon iconName={cat.icon} className="h-3 w-3" />
                          {cat.name}
                          <Badge variant="secondary" className="text-[10px] h-4">{catTemplates.length}</Badge>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catTemplates.map(tmpl => {
                            const isPreview = selectedTemplatePreview?.id === tmpl.id;
                            const regGroups = new Set(tmpl.registers.map(r => r.group));
                            return (
                              <Card
                                key={tmpl.id}
                                className={cn(
                                  'cursor-pointer transition-all border',
                                  isPreview
                                    ? 'shadow-md ring-2 ring-primary/40 border-primary/30'
                                    : 'hover:shadow-md hover:border-primary/20',
                                )}
                                onClick={() => setSelectedTemplatePreview(isPreview ? null : tmpl)}
                              >
                                <CardContent className="p-3 space-y-1.5">
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded bg-muted shrink-0">
                                      <ProtocolIcon iconName={tmpl.icon} className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{tmpl.description.split('(')[0].trim()}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {tmpl.manufacturer} · {tmpl.model}
                                      </p>
                                    </div>
                                    {isPreview && (
                                      <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                                      <Tag className="h-2.5 w-2.5" />{tmpl.registers.length} рег.
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                                      <Layers className="h-2.5 w-2.5" />{regGroups.size} групп
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-mono">ID:{tmpl.slaveId}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {filteredDeviceTemplates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Шаблоны не найдены</p>
                      <p className="text-xs">Попробуйте изменить параметры поиска</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Preview panel */}
              {selectedTemplatePreview && (
                <div className="w-72 shrink-0 border rounded-lg bg-muted/20 flex flex-col overflow-hidden hidden md:flex">
                  <div className="p-3 border-b bg-background space-y-2">
                    <p className="font-semibold text-sm truncate">{selectedTemplatePreview.manufacturer} {selectedTemplatePreview.model}</p>
                    <p className="text-xs text-muted-foreground">{selectedTemplatePreview.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] h-5">{selectedTemplatePreview.registers.length} регистров</Badge>
                      <Badge variant="outline" className="text-[10px] h-5">Slave #{selectedTemplatePreview.slaveId}</Badge>
                    </div>
                    <Button size="sm" className="w-full gap-1.5 mt-1" onClick={() => handleTemplateSelect(selectedTemplatePreview)}>
                      <Plus className="h-3.5 w-3.5" /> Использовать шаблон
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-3">
                      {templateRegisterGroups.map(group => (
                        <div key={group.name}>
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">{group.name} ({group.registers.length})</p>
                          <div className="space-y-0.5">
                            {group.registers.slice(0, 6).map(reg => (
                              <div key={`${reg.address}-${reg.name}`} className="flex items-center gap-1.5 text-[11px] py-0.5 px-1 rounded hover:bg-muted/50">
                                <span className="font-mono text-muted-foreground shrink-0">{reg.address}</span>
                                <span className="truncate">{reg.name}</span>
                                {reg.unit && <span className="text-muted-foreground shrink-0">{reg.unit}</span>}
                                {reg.writable && <span className="text-amber-500 shrink-0">R/W</span>}
                              </div>
                            ))}
                            {group.registers.length > 6 && (
                              <p className="text-[10px] text-muted-foreground pl-1">+ ещё {group.registers.length - 6}...</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Mobile create button (when preview not visible) */}
            {selectedTemplatePreview && (
              <div className="shrink-0 md:hidden">
                <Button className="w-full gap-1.5" onClick={() => handleTemplateSelect(selectedTemplatePreview)}>
                  <Plus className="h-4 w-4" />
                  Создать: {selectedTemplatePreview.manufacturer} {selectedTemplatePreview.model}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Add/Edit Device Dialog — Dynamic Protocol Settings           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editDevice ? 'Редактировать устройство' : 'Добавить устройство'}</DialogTitle>
            <DialogDescription>
              {editDevice ? 'Изменение настроек южного устройства' : 'Настройка нового южного устройства'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* General info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dev-name" className="text-sm">Название <span className="text-red-500">*</span></Label>
                <Input id="dev-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Modbus TCP — PLC 1" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-desc" className="text-sm">Описание</Label>
                <Textarea id="dev-desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Описание устройства" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Протокол</Label>
                <Select value={formProtocolId} onValueChange={handleProtocolChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PROTOCOL_CATEGORIES.map(cat => {
                      const protos = PROTOCOLS.filter(p => p.category === cat.id);
                      if (protos.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1">{cat.name}</p>
                          {protos.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-1.5">
                                <ProtocolIcon iconName={p.icon} className="h-3 w-3" />
                                {p.name}
                                {p.status !== 'stable' && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">{p.status}</Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Dynamic protocol settings with tabs */}
            {currentProtocol && allGroupKeys.length > 0 && (
              <Tabs value={settingsTab} onValueChange={setSettingsTab}>
                <TabsList className="w-full h-9 flex flex-wrap">
                  {allGroupKeys.map(gk => (
                    <TabsTrigger key={gk} value={gk} className="text-xs flex-1 min-w-0 h-8 px-2">
                      {GROUP_LABELS[gk] || gk}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {allGroupKeys.map(gk => {
                  const fields = gk === 'serial'
                    ? (serialGroupedFields[gk] || [])
                    : (groupedFields[gk] || []);
                  return (
                    <TabsContent key={gk} value={gk} className="mt-3">
                      <div className="space-y-3">
                        {fields.map(field => (
                          <React.Fragment key={field.key}>
                            {renderFieldInput(field, formSettings[field.key] ?? field.defaultValue, updateSetting)}
                          </React.Fragment>
                        ))}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}

            {currentProtocol && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {currentProtocol.description}
                  {!currentProtocol.isSerial && ` · Порт по умолчанию: ${currentProtocol.defaultPort}`}
                  {currentProtocol.isSerial && ' · Последовательный порт'}
                  {currentProtocol.status !== 'stable' && ` · Статус: ${currentProtocol.status}`}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveDevice} disabled={!formName.trim()}>
              {editDevice ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Add Device choice dialog                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить устройство</DialogTitle>
            <DialogDescription>Выберите способ создания нового устройства</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setAddDialogOpen(false); openAddDialog(); }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ручное создание</p>
                  <p className="text-xs text-muted-foreground">Настроить все параметры вручную</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setAddDialogOpen(false); setTemplateDialogOpen(true); }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <LayoutTemplate className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Из шаблона</p>
                  <p className="text-xs text-muted-foreground">Выбрать готовый шаблон ПЛК / датчика</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Detail Panel Dialog                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!detailDevice} onOpenChange={() => setDetailDevice(null)}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailDevice && (
                <>
                  <span className={cn('h-2.5 w-2.5 rounded-full', detailDevice.status === 'connected' ? 'bg-emerald-500' : detailDevice.status === 'error' ? 'bg-red-500' : 'bg-gray-400')} />
                  {detailDevice.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>{detailDevice?.description}</DialogDescription>
          </DialogHeader>

          {detailDevice && (() => {
            const proto = getProtocol(detailDevice.protocolId);
            const goodCount = detailDevice.tags.filter(t => t.quality === 'good').length;
            const badCount = detailDevice.tags.filter(t => t.quality === 'bad').length;
            const uncertainCount = detailDevice.tags.filter(t => t.quality === 'uncertain').length;

            return (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-3">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Протокол:</span></div>
                    <div>
                      <Badge variant="outline" className={cn('text-xs', proto?.color)}>
                        <ProtocolIcon iconName={proto?.icon || 'Cpu'} className="h-3 w-3 mr-0.5" />
                        {detailDevice.protocol}
                      </Badge>
                    </div>
                    <div><span className="text-muted-foreground text-xs">Статус:</span></div>
                    <div><Badge variant="outline" className={cn('text-xs', statusBadgeClass(detailDevice.status))}>{detailDevice.status}</Badge></div>
                    <div><span className="text-muted-foreground text-xs">Адрес:</span></div>
                    <div className="font-mono text-xs">
                      {proto?.isSerial
                        ? `${detailDevice.path} (${detailDevice.baudRate} бод)`
                        : `${detailDevice.host}:${detailDevice.port}`}
                    </div>
                    <div><span className="text-muted-foreground text-xs">Интервал опроса:</span></div>
                    <div>{detailDevice.pollInterval} мс</div>
                    <div><span className="text-muted-foreground text-xs">Таймаут:</span></div>
                    <div>{detailDevice.timeout} мс</div>
                    <div><span className="text-muted-foreground text-xs">Повторы:</span></div>
                    <div>{detailDevice.retries}</div>
                    <div><span className="text-muted-foreground text-xs">Авто-переподключение:</span></div>
                    <div>{detailDevice.autoReconnect ? 'Да' : 'Нет'}</div>
                    {detailDevice.byteOrder && (
                      <>
                        <div><span className="text-muted-foreground text-xs">Порядок байтов:</span></div>
                        <div className="font-mono text-xs">{detailDevice.byteOrder}</div>
                      </>
                    )}
                    {detailDevice.templateId && (
                      <>
                        <div><span className="text-muted-foreground text-xs">Шаблон:</span></div>
                        <div><Badge variant="outline" className="text-xs bg-violet-500/5 text-violet-600 dark:text-violet-400">{detailDevice.templateId}</Badge></div>
                      </>
                    )}
                    <div><span className="text-muted-foreground text-xs">Последний ответ:</span></div>
                    <div>{formatTime(detailDevice.lastSeen)}</div>
                  </div>

                  {/* Quality summary */}
                  {detailDevice.tags.length > 0 && (
                    <>
                      <Separator />
                      <div className="text-xs">
                        <p className="font-medium mb-1.5">Качество тегов:</p>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Норма: {goodCount}</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Ошибка: {badCount}</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Неопределено: {uncertainCount}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {detailDevice.status === 'connected' && detailDevice.uptime && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm">
                        <Wifi className="h-4 w-4 text-emerald-500" />
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatUptime(detailDevice.uptime)}</span>
                      </div>
                    </>
                  )}

                  {/* Tags table */}
                  <Separator />
                  <div className="text-xs">
                    <p className="font-medium mb-1">Теги ({detailDevice.tags.length}):</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] h-7">Качество</TableHead>
                          <TableHead className="text-[10px] h-7">Имя</TableHead>
                          <TableHead className="text-[10px] h-7">Адрес</TableHead>
                          <TableHead className="text-[10px] h-7">Значение</TableHead>
                          <TableHead className="text-[10px] h-7">Тип</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailDevice.tags.length > 0 ? (
                          detailDevice.tags.slice(0, 10).map(tag => (
                            <TableRow key={tag.id}>
                              <TableCell className="py-1.5">
                                <span className={cn('h-2 w-2 rounded-full inline-block', qualityBg(tag.quality))} />
                              </TableCell>
                              <TableCell className="py-1.5 text-[11px]">{tag.name}</TableCell>
                              <TableCell className="py-1.5 text-[11px] font-mono">{tag.address}</TableCell>
                              <TableCell className={cn('py-1.5 text-[11px] font-medium', qualityColor(tag.quality))}>
                                {tag.dataType === 'BOOL'
                                  ? (tag.value ? 'ВКЛ' : 'ВЫКЛ')
                                  : `${Number(tag.value).toFixed(tag.dataType === 'FLOAT' || tag.dataType === 'DOUBLE' ? 2 : 0)}${tag.unit ? ` ${tag.unit}` : ''}`}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Badge variant="outline" className="text-[9px] h-4">{tag.dataType}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={5} className="text-[11px] text-center text-muted-foreground py-3">Нет тегов</TableCell></TableRow>
                        )}
                        {detailDevice.tags.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-[10px] text-center text-muted-foreground py-1">
                              ...и ещё {detailDevice.tags.length - 10} тегов
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </ScrollArea>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Delete confirmation dialog                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Удалить устройство?
            </DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Все настройки и теги устройства будут удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && deleteDevice(confirmDeleteId)}>
              <Trash2 className="h-4 w-4 mr-1" /> Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

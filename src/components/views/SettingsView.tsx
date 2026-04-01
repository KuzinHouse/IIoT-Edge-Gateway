import { useState, useMemo } from 'react';
import React from 'react';
import {
  Save, Copy, RefreshCw, Shield, Users, Key,
  Info, Server, Globe, FileText,
  Download, CheckCircle2, XCircle, AlertTriangle,
  Search, Pencil, Trash2, Eye, EyeOff, UserPlus,
  Lock, Unlock, Cpu, Wifi, HardDrive, Activity, Zap,
  History, Fingerprint, CircleDot,
  Phone, Mail, CalendarDays, Clock, UserCog,
  ChevronDown, ChevronRight, ChevronUp,
  Crown, Wrench, Monitor, Bot, Code,
  ArrowRightLeft, ShieldCheck, ShieldAlert, Ban,
  RotateCw, Plus, Check, ListChecks, Terminal,
  Smartphone, Database, X, Layers, GitBranch, Scan,
  AlertOctagon, KeyRound, Power, Filter, Headphones,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePersistentState } from '@/lib/use-persistent-state';

// ==================== Types ====================
interface Permission {
  id: string;
  category: string;
  label: string;
  description: string;
  roles: string[];
}

interface PermissionCategory {
  id: string;
  label: string;
  icon: string;
}

interface RoleDef {
  id: string;
  name: string;
  label: string;
  description: string;
  level: number;
  color: string;
  permissions: string[];
  isSystem: boolean;
  maxSessions: number;
}

interface UserSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActivity: string;
  loginAt: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  notes: string;
  sessions: UserSession[];
}

interface UserForm {
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'suspended';
  password: string;
  confirmPassword: string;
  notes: string;
}

interface PasswordChangeForm {
  newPassword: string;
  confirmPassword: string;
}

interface LicenseData {
  type: 'Enterprise' | 'Professional' | 'Standard' | 'Free';
  status: 'active' | 'expiring' | 'expired' | 'invalid';
  owner: string;
  organization: string;
  key: string;
  issuedAt: string;
  expiresAt: string;
  maxDevices: number;
  maxTags: number;
  maxConnections: number;
  maxUsers: number;
  maxPipelines: number;
  maxDrivers: number;
  currentDevices: number;
  currentTags: number;
  currentConnections: number;
  currentUsers: number;
  currentPipelines: number;
  currentDrivers: number;
  fingerprint: string;
  activatedAt: string | null;
  supportContract?: {
    active: boolean;
    provider: string;
    phone: string;
    email: string;
    expiresAt: string;
    level: 'basic' | 'priority' | 'dedicated';
  };
}

interface LicenseHistoryEntry {
  id: string;
  action: 'activation' | 'deactivation' | 'renewal' | 'upgrade' | 'transfer';
  key: string;
  type: string;
  timestamp: string;
  details: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  description: string;
  status: 'success' | 'failure';
  ip: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
}

interface FailedLogin {
  id: string;
  username: string;
  ip: string;
  timestamp: string;
  attempts: number;
}

// ==================== Permission Categories ====================
const PERMISSION_CATEGORIES: PermissionCategory[] = [
  { id: 'devices', label: 'Устройства', icon: 'HardDrive' },
  { id: 'tags', label: 'Теги данных', icon: 'Layers' },
  { id: 'connections', label: 'Соединения', icon: 'Wifi' },
  { id: 'pipelines', label: 'Потоки данных', icon: 'GitBranch' },
  { id: 'north_apps', label: 'Северные приложения', icon: 'ArrowRightLeft' },
  { id: 'alarms', label: 'Аварии', icon: 'AlertTriangle' },
  { id: 'users', label: 'Пользователи', icon: 'Users' },
  { id: 'settings', label: 'Настройки системы', icon: 'Settings' },
  { id: 'system', label: 'Управление системой', icon: 'Server' },
  { id: 'api', label: 'REST API', icon: 'Code' },
  { id: 'reports', label: 'Отчёты', icon: 'FileText' },
  { id: 'diagnostics', label: 'Диагностика', icon: 'Activity' },
];

// ==================== Permissions (37) ====================
const PERMISSIONS: Permission[] = [
  // devices
  { id: 'devices.read', category: 'devices', label: 'Просмотр устройств', description: 'Просмотр списка устройств и их статуса', roles: ['super-admin', 'admin', 'engineer', 'operator', 'technician', 'viewer', 'api-service'] },
  { id: 'devices.create', category: 'devices', label: 'Создание устройств', description: 'Добавление новых устройств в систему', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'devices.update', category: 'devices', label: 'Редактирование устройств', description: 'Изменение параметров и конфигурации устройств', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'devices.delete', category: 'devices', label: 'Удаление устройств', description: 'Удаление устройств из системы', roles: ['super-admin', 'admin'] },
  // tags
  { id: 'tags.read', category: 'tags', label: 'Просмотр тегов', description: 'Просмотр списка тегов и их значений', roles: ['super-admin', 'admin', 'engineer', 'operator', 'technician', 'viewer', 'api-service'] },
  { id: 'tags.create', category: 'tags', label: 'Создание тегов', description: 'Добавление новых тегов данных', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'tags.update', category: 'tags', label: 'Редактирование тегов', description: 'Изменение параметров тегов', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'tags.delete', category: 'tags', label: 'Удаление тегов', description: 'Удаление тегов из системы', roles: ['super-admin', 'admin'] },
  { id: 'tags.write', category: 'tags', label: 'Запись значений', description: 'Запись значений в теги (управление)', roles: ['super-admin', 'admin', 'engineer', 'operator'] },
  // connections
  { id: 'connections.read', category: 'connections', label: 'Просмотр соединений', description: 'Просмотр списка соединений', roles: ['super-admin', 'admin', 'engineer', 'operator', 'technician', 'viewer', 'api-service'] },
  { id: 'connections.create', category: 'connections', label: 'Создание соединений', description: 'Добавление новых соединений', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'connections.update', category: 'connections', label: 'Редактирование соединений', description: 'Изменение параметров соединений', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'connections.delete', category: 'connections', label: 'Удаление соединений', description: 'Удаление соединений из системы', roles: ['super-admin', 'admin'] },
  // pipelines
  { id: 'pipelines.read', category: 'pipelines', label: 'Просмотр потоков', description: 'Просмотр конфигурации потоков данных', roles: ['super-admin', 'admin', 'engineer', 'operator', 'viewer'] },
  { id: 'pipelines.create', category: 'pipelines', label: 'Создание потоков', description: 'Создание новых потоков данных', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'pipelines.update', category: 'pipelines', label: 'Редактирование потоков', description: 'Изменение конфигурации потоков', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'pipelines.execute', category: 'pipelines', label: 'Запуск/остановка потоков', description: 'Управление выполнением потоков', roles: ['super-admin', 'admin', 'engineer', 'operator'] },
  // north_apps
  { id: 'north_apps.read', category: 'north_apps', label: 'Просмотр приложений', description: 'Просмотр северных приложений', roles: ['super-admin', 'admin', 'engineer', 'operator', 'viewer'] },
  { id: 'north_apps.create', category: 'north_apps', label: 'Создание приложений', description: 'Добавление северных приложений', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'north_apps.update', category: 'north_apps', label: 'Редактирование приложений', description: 'Изменение конфигурации приложений', roles: ['super-admin', 'admin', 'engineer'] },
  // alarms
  { id: 'alarms.read', category: 'alarms', label: 'Просмотр аварий', description: 'Просмотр активных и исторических аварий', roles: ['super-admin', 'admin', 'engineer', 'operator', 'technician', 'viewer'] },
  { id: 'alarms.acknowledge', category: 'alarms', label: 'Квитирование аварий', description: 'Подтверждение и квитирование аварий', roles: ['super-admin', 'admin', 'engineer', 'operator'] },
  { id: 'alarms.configure', category: 'alarms', label: 'Настройка аварий', description: 'Создание и редактирование правил аварий', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'alarms.suppress', category: 'alarms', label: 'Подавление аварий', description: 'Временное подавление уведомлений', roles: ['super-admin', 'admin', 'engineer'] },
  // users
  { id: 'users.read', category: 'users', label: 'Просмотр пользователей', description: 'Просмотр списка пользователей и ролей', roles: ['super-admin', 'admin'] },
  { id: 'users.create', category: 'users', label: 'Создание пользователей', description: 'Добавление новых пользователей', roles: ['super-admin', 'admin'] },
  { id: 'users.update', category: 'users', label: 'Редактирование пользователей', description: 'Изменение данных пользователей', roles: ['super-admin', 'admin'] },
  { id: 'users.delete', category: 'users', label: 'Удаление пользователей', description: 'Удаление пользователей из системы', roles: ['super-admin'] },
  { id: 'users.manage_roles', category: 'users', label: 'Управление ролями', description: 'Создание и редактирование ролей', roles: ['super-admin'] },
  // settings
  { id: 'settings.read', category: 'settings', label: 'Просмотр настроек', description: 'Просмотр системных настроек', roles: ['super-admin', 'admin', 'engineer'] },
  { id: 'settings.update', category: 'settings', label: 'Изменение настроек', description: 'Изменение системных настроек', roles: ['super-admin', 'admin'] },
  { id: 'settings.backup', category: 'settings', label: 'Резервное копирование', description: 'Создание и восстановление резервных копий', roles: ['super-admin'] },
  // system
  { id: 'system.restart', category: 'system', label: 'Перезагрузка системы', description: 'Перезапуск шлюза и служб', roles: ['super-admin'] },
  { id: 'system.logs', category: 'system', label: 'Просмотр логов', description: 'Доступ к системным журналам', roles: ['super-admin', 'admin'] },
  { id: 'system.license', category: 'system', label: 'Управление лицензией', description: 'Активация и управление лицензиями', roles: ['super-admin'] },
  // api
  { id: 'api.read', category: 'api', label: 'Доступ к API (чтение)', description: 'GET запросы к REST API', roles: ['super-admin', 'admin', 'api-service'] },
  { id: 'api.write', category: 'api', label: 'Доступ к API (запись)', description: 'POST/PUT/DELETE запросы к REST API', roles: ['super-admin', 'admin', 'api-service'] },
  // reports
  { id: 'reports.read', category: 'reports', label: 'Просмотр отчётов', description: 'Просмотр сгенерированных отчётов', roles: ['super-admin', 'admin', 'engineer', 'operator', 'technician', 'viewer'] },
  { id: 'reports.export', category: 'reports', label: 'Экспорт отчётов', description: 'Экспорт данных в CSV, JSON, PDF', roles: ['super-admin', 'admin', 'engineer'] },
  // diagnostics
  { id: 'diagnostics.read', category: 'diagnostics', label: 'Просмотр диагностики', description: 'Просмотр диагностических данных', roles: ['super-admin', 'admin', 'engineer', 'technician'] },
  { id: 'diagnostics.test', category: 'diagnostics', label: 'Тестирование соединений', description: 'Запуск тестов Modbus, MQTT и других', roles: ['super-admin', 'admin', 'engineer', 'technician'] },
];

// ==================== Roles (7) ====================
const SYSTEM_ROLES: RoleDef[] = [
  {
    id: 'super-admin', name: 'super-admin', label: 'Суперадминистратор',
    description: 'Полный доступ ко всем функциям системы, управление лицензиями и аудит',
    level: 1, color: 'red', isSystem: true, maxSessions: 5,
    permissions: PERMISSIONS.map(p => p.id),
  },
  {
    id: 'admin', name: 'admin', label: 'Администратор',
    description: 'Управление устройствами, пользователями, конфигурацией системы',
    level: 2, color: 'orange', isSystem: true, maxSessions: 3,
    permissions: PERMISSIONS.filter(p => !['system.restart', 'system.license', 'settings.backup', 'users.delete', 'users.manage_roles'].includes(p.id)).map(p => p.id),
  },
  {
    id: 'engineer', name: 'engineer', label: 'Инженер АСУ ТП',
    description: 'Инженер АСУ ТП — настройка устройств, тегов, потоков данных',
    level: 3, color: 'amber', isSystem: true, maxSessions: 3,
    permissions: PERMISSIONS.filter(p => p.roles.includes('engineer')).map(p => p.id),
  },
  {
    id: 'operator', name: 'operator', label: 'Оператор',
    description: 'Оператор — мониторинг, квитирование аварий, запись значений тегов',
    level: 4, color: 'emerald', isSystem: true, maxSessions: 2,
    permissions: PERMISSIONS.filter(p => p.roles.includes('operator')).map(p => p.id),
  },
  {
    id: 'technician', name: 'technician', label: 'Техник / ТО',
    description: 'Техник — диагностика, просмотр данных, тестирование соединений',
    level: 5, color: 'sky', isSystem: true, maxSessions: 2,
    permissions: PERMISSIONS.filter(p => p.roles.includes('technician')).map(p => p.id),
  },
  {
    id: 'viewer', name: 'viewer', label: 'Наблюдатель',
    description: 'Наблюдатель — только чтение dashboard и отчётов',
    level: 6, color: 'slate', isSystem: true, maxSessions: 1,
    permissions: PERMISSIONS.filter(p => p.roles.includes('viewer')).map(p => p.id),
  },
  {
    id: 'api-service', name: 'api-service', label: 'API Сервис',
    description: 'Сервисная учётная запись для API интеграции',
    level: 7, color: 'violet', isSystem: true, maxSessions: 10,
    permissions: PERMISSIONS.filter(p => p.roles.includes('api-service')).map(p => p.id),
  },
];

// ==================== Mock Users ====================
const defaultUsers: User[] = [
  { id: 'u1', username: 'admin', name: 'Алексеев Алексей', email: 'admin@iot-gate.local', phone: '+7 (495) 100-00-01', role: 'super-admin', department: 'ИТ отдел', status: 'active', lastLogin: new Date().toISOString(), createdAt: '2024-01-01T10:00:00Z', notes: 'Главный администратор системы', sessions: [{ id: 's1', ip: '192.168.1.100', userAgent: 'Chrome/120 Windows', lastActivity: new Date().toISOString(), loginAt: new Date(Date.now() - 3600000).toISOString() }, { id: 's2', ip: '192.168.1.105', userAgent: 'Firefox/121 Linux', lastActivity: new Date(Date.now() - 7200000).toISOString(), loginAt: new Date(Date.now() - 10800000).toISOString() }] },
  { id: 'u2', username: 'ivanov', name: 'Иванов Иван', email: 'ivanov@iot-gate.local', phone: '+7 (495) 100-00-02', role: 'admin', department: 'АСУ ТП', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString(), createdAt: '2024-02-15T08:00:00Z', notes: '', sessions: [{ id: 's3', ip: '192.168.1.101', userAgent: 'Chrome/120 Windows', lastActivity: new Date(Date.now() - 86400000).toISOString(), loginAt: new Date(Date.now() - 90000000).toISOString() }] },
  { id: 'u3', username: 'petrov', name: 'Петров Пётр', email: 'petrov@iot-gate.local', phone: '+7 (495) 100-00-03', role: 'engineer', department: 'АСУ ТП', status: 'active', lastLogin: new Date(Date.now() - 3600000).toISOString(), createdAt: '2024-03-10T14:00:00Z', notes: 'Инженер цеха 1', sessions: [{ id: 's4', ip: '192.168.1.102', userAgent: 'Chrome/119 Windows', lastActivity: new Date(Date.now() - 3600000).toISOString(), loginAt: new Date(Date.now() - 7200000).toISOString() }] },
  { id: 'u4', username: 'kozlov', name: 'Козлов Сергей', email: 'kozlov@iot-gate.local', phone: '+7 (495) 100-00-04', role: 'operator', department: 'Операторная', status: 'active', lastLogin: new Date(Date.now() - 7200000).toISOString(), createdAt: '2024-04-05T09:00:00Z', notes: '', sessions: [] },
  { id: 'u5', username: 'sidorov', name: 'Сидоров Дмитрий', email: 'sidorov@iot-gate.local', phone: '+7 (495) 100-00-05', role: 'operator', department: 'Операторная', status: 'suspended', lastLogin: new Date(Date.now() - 2592000000).toISOString(), createdAt: '2024-05-20T11:00:00Z', notes: 'Заблокирован за нарушение регламента', sessions: [] },
  { id: 'u6', username: 'smirnova', name: 'Смирнова Елена', email: 'smirnova@iot-gate.local', phone: '+7 (495) 100-00-06', role: 'technician', department: 'Служба ТО', status: 'active', lastLogin: new Date(Date.now() - 172800000).toISOString(), createdAt: '2024-06-01T08:30:00Z', notes: 'Техник электрического оборудования', sessions: [] },
  { id: 'u7', username: 'vasilev', name: 'Васильев Андрей', email: 'vasilev@iot-gate.local', phone: '+7 (495) 100-00-07', role: 'viewer', department: 'Руководство', status: 'inactive', lastLogin: new Date(Date.now() - 604800000).toISOString(), createdAt: '2024-06-15T10:00:00Z', notes: 'Начальник цеха', sessions: [] },
  { id: 'u8', username: 'scada-api', name: 'SCADA API', email: 'scada@iot-gate.local', phone: '', role: 'api-service', department: 'Системные', status: 'active', lastLogin: new Date().toISOString(), createdAt: '2024-01-15T12:00:00Z', notes: 'Сервисная учётная запись для SCADA интеграции', sessions: [{ id: 's5', ip: '192.168.1.200', userAgent: 'Python-requests/2.31', lastActivity: new Date().toISOString(), loginAt: new Date(Date.now() - 600000).toISOString() }] },
];

// ==================== License Data ====================
const defaultLicense: LicenseData = {
  type: 'Enterprise', status: 'active',
  owner: 'ООО ПромАвтоматика', organization: 'Завод ПромСталь',
  key: 'ENTR-2025-U1V2-W3X4-Y5Z6-A7B8-C9D0',
  issuedAt: '2025-01-10T11:00:00Z',
  expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
  maxDevices: 100, maxTags: 10000, maxConnections: 50,
  maxUsers: 20, maxPipelines: 25, maxDrivers: 15,
  currentDevices: 5, currentTags: 18, currentConnections: 7,
  currentUsers: 8, currentPipelines: 3, currentDrivers: 5,
  fingerprint: 'HW-F8A2C1E3-5D6B-7A4F-9C0E-D8B2A1C3',
  activatedAt: '2025-01-10T11:05:00Z',
  supportContract: {
    active: true, provider: 'ООО ПромАвтоматика',
    phone: '+7 (495) 123-45-67', email: 'support@promavtomatika.ru',
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(), level: 'priority',
  },
};

const defaultLicenseHistory: LicenseHistoryEntry[] = [
  { id: 'lh1', action: 'activation', key: 'ENTR-2024-A1B2-C3D4-E5F6-G7H8-I9J0', type: 'Enterprise', timestamp: '2024-01-15T10:00:00Z', details: 'Первичная активация Enterprise лицензии' },
  { id: 'lh2', action: 'renewal', key: 'ENTR-2025-K1L2-M3N4-O5P6-Q7R8-S9T0', type: 'Enterprise', timestamp: '2024-07-01T09:00:00Z', details: 'Продление лицензии на 12 месяцев' },
  { id: 'lh3', action: 'upgrade', key: 'ENTR-2025-U1V2-W3X4-Y5Z6-A7B8-C9D0', type: 'Enterprise', timestamp: '2025-01-10T11:00:00Z', details: 'Обновление лицензии (продление + апгрейд)' },
];

// ==================== Audit Log ====================
const defaultAuditLogs: AuditLogEntry[] = [
  { id: 'l1', timestamp: new Date(Date.now() - 60000).toISOString(), user: 'admin', action: 'device.create', resource: 'Device', description: 'Создано устройство "OPC UA Server"', status: 'success', ip: '192.168.1.100' },
  { id: 'l2', timestamp: new Date(Date.now() - 300000).toISOString(), user: 'admin', action: 'connection.update', resource: 'Connection', description: 'Обновлено соединение "Modbus TCP — Цех 1"', status: 'success', ip: '192.168.1.100' },
  { id: 'l3', timestamp: new Date(Date.now() - 600000).toISOString(), user: 'ivanov', action: 'tag.write', resource: 'Tag', description: 'Запись значения в тег "Включение насоса"', status: 'success', ip: '192.168.1.101' },
  { id: 'l4', timestamp: new Date(Date.now() - 1800000).toISOString(), user: 'admin', action: 'alarm.acknowledge', resource: 'Alarm', description: 'Квитирована авария "Высокая температура"', status: 'success', ip: '192.168.1.100' },
  { id: 'l5', timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'unknown', action: 'user.login', resource: 'User', description: 'Неудачная попытка входа — неверный пароль', status: 'failure', ip: '10.0.0.1' },
  { id: 'l6', timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'admin', action: 'pipeline.start', resource: 'Pipeline', description: 'Поток "Modbus → MQTT Bridge" запущен', status: 'success', ip: '192.168.1.100' },
  { id: 'l7', timestamp: new Date(Date.now() - 10800000).toISOString(), user: 'petrov', action: 'settings.update', resource: 'SystemConfig', description: 'Изменён интервал опроса по умолчанию', status: 'success', ip: '192.168.1.102' },
  { id: 'l8', timestamp: new Date(Date.now() - 14400000).toISOString(), user: 'admin', action: 'user.create', resource: 'User', description: 'Создан пользователь "smirnova"', status: 'success', ip: '192.168.1.100' },
  { id: 'l9', timestamp: new Date(Date.now() - 18000000).toISOString(), user: 'admin', action: 'license.activate', resource: 'License', description: 'Активирована Enterprise лицензия', status: 'success', ip: '192.168.1.100' },
  { id: 'l10', timestamp: new Date(Date.now() - 21600000).toISOString(), user: 'scada-api', action: 'api.read', resource: 'Tag', description: 'API запрос: чтение 24 тегов', status: 'success', ip: '192.168.1.200' },
  { id: 'l11', timestamp: new Date(Date.now() - 25200000).toISOString(), user: 'unknown', action: 'user.login', resource: 'User', description: 'Неудачная попытка входа — несуществующий пользователь', status: 'failure', ip: '172.16.0.50' },
  { id: 'l12', timestamp: new Date(Date.now() - 28800000).toISOString(), user: 'admin', action: 'user.update', resource: 'User', description: 'Изменена роль пользователя "kozlov" на operator', status: 'success', ip: '192.168.1.100' },
];

// ==================== Feature Matrix (37 features) ====================
const FEATURE_MATRIX: { feature: string; enterprise: boolean | string; professional: boolean | string; standard: boolean | string; free: boolean | string }[] = [
  { feature: 'Modbus TCP/RTU/ASCII', enterprise: true, professional: true, standard: true, free: true },
  { feature: 'OPC UA Client', enterprise: true, professional: true, standard: true, free: false },
  { feature: 'MQTT v5', enterprise: true, professional: true, standard: true, free: true },
  { feature: 'Apache Kafka', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'SNMP v3', enterprise: true, professional: true, standard: true, free: false },
  { feature: 'BACnet/IP', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Siemens S7', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Allen-Bradley (EtherNet/IP)', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'IEC 104 / IEC 61850', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'DNP3', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'AWS IoT Core', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Azure IoT Hub', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'WebSocket Server', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Продвинутые аварии', enterprise: true, professional: true, standard: true, free: false },
  { feature: 'Потоки данных', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Визуальный редактор потоков', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'Мониторинг реального времени', enterprise: true, professional: true, standard: true, free: true },
  { feature: 'Диагностика Modbus/MQTT', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'OPC UA Information Model', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Ролевая модель (RBAC)', enterprise: true, professional: true, standard: true, free: true },
  { feature: 'Аудит журнал', enterprise: true, professional: true, standard: true, free: false },
  { feature: 'Импорт/Экспорт конфигурации', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'Резервное копирование', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'TLS/SSL шифрование', enterprise: true, professional: true, standard: false, free: false },
  { feature: 'LDAP / SSO интеграция', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'Двухфакторная аутентификация', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'IP белый список', enterprise: true, professional: true, standard: true, free: true },
  { feature: 'Скриптовая обработка данных', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'Встроенный OPC UA Server', enterprise: true, professional: false, standard: false, free: false },
  { feature: 'Интеграция с SCADA/HMI', enterprise: true, professional: true, standard: true, free: false },
  { feature: 'Техническая поддержка', enterprise: 'Приоритетная', professional: 'Стандартная', standard: 'Email', free: 'Нет' },
  { feature: 'Макс. устройств', enterprise: '100', professional: '50', standard: '10', free: '3' },
  { feature: 'Макс. тегов', enterprise: '10 000', professional: '5 000', standard: '1 000', free: '100' },
  { feature: 'Макс. пользователей', enterprise: '20', professional: '10', standard: '3', free: '1' },
  { feature: 'Макс. соединений', enterprise: '50', professional: '25', standard: '5', free: '2' },
  { feature: 'Макс. потоков данных', enterprise: '25', professional: '10', standard: '2', free: '0' },
];

// ==================== Default Security Settings ====================
const defaultSecurity = {
  sessionTimeout: 3600,
  maxConcurrentSessions: 3,
  idleTimeout: 1800,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: true,
  passwordExpiryDays: 90,
  ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8', '127.0.0.1'],
  twoFactorEnabled: false,
  maxLoginAttempts: 5,
  lockoutDuration: 900,
};

// ==================== Default API Keys ====================
const defaultApiKeys: ApiKey[] = [
  { id: 'ak1', name: 'SCADA Integration', key: 'sk-gate-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', createdAt: '2024-06-01T10:00:00Z', lastUsed: new Date().toISOString(), expiresAt: '2025-06-01T10:00:00Z' },
];

const defaultFailedLogins: FailedLogin[] = [
  { id: 'fl1', username: 'admin', ip: '10.0.0.1', timestamp: new Date(Date.now() - 3600000).toISOString(), attempts: 3 },
  { id: 'fl2', username: 'root', ip: '172.16.0.50', timestamp: new Date(Date.now() - 7200000).toISOString(), attempts: 5 },
  { id: 'fl3', username: 'admin', ip: '192.168.1.150', timestamp: new Date(Date.now() - 86400000).toISOString(), attempts: 1 },
];

// ==================== Helpers ====================
function formatDateTime(iso: string): string {
  if (!iso || iso === '-') return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string): string {
  if (!iso || iso === '-') return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function relativeTime(iso: string): string {
  if (!iso || iso === '-') return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} дн. назад`;
  return formatDate(iso);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getRoleColor(roleId: string): string {
  const role = SYSTEM_ROLES.find(r => r.id === roleId);
  if (!role) return 'slate';
  return role.color;
}

function getRoleLabel(roleId: string): string {
  const role = SYSTEM_ROLES.find(r => r.id === roleId);
  if (role) return role.label;
  return roleId;
}

function getRoleColorClasses(color: string) {
  const map: Record<string, string> = {
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30',
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30',
  };
  return map[color] || map.slate;
}

function getRoleDotColor(color: string): string {
  const map: Record<string, string> = {
    red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-500',
    emerald: 'bg-emerald-500', sky: 'bg-sky-500', slate: 'bg-slate-500',
    violet: 'bg-violet-500', teal: 'bg-teal-500', fuchsia: 'bg-fuchsia-500',
  };
  return map[color] || 'bg-slate-500';
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Минимум 8 символов');
  if (!/[A-ZА-ЯЁ]/.test(password)) errors.push('Заглавная буква');
  if (!/\d/.test(password)) errors.push('Цифра');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('Спецсимвол (!@#$%...)');
  return { valid: errors.length === 0, errors };
}

function validateLicenseKey(key: string): boolean {
  return /^[\w]{4}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{4}$/.test(key);
}

function formatLicenseKey(key: string): string {
  const raw = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const parts: string[] = [];
  for (let i = 0; i < raw.length && i < 24; i += 4) parts.push(raw.slice(i, i + 4));
  return parts.join('-');
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return key.slice(0, 8) + '••••••••' + key.slice(-4);
}

const emptyUserForm: UserForm = {
  username: '', name: '', email: '', phone: '', role: 'viewer',
  department: '', status: 'active', password: '', confirmPassword: '', notes: '',
};

// ==================== Role Icon Map ====================
function getRoleIcon(roleName: string) {
  switch (roleName) {
    case 'super-admin': return Crown;
    case 'admin': return Shield;
    case 'engineer': return Wrench;
    case 'operator': return Monitor;
    case 'technician': return Scan;
    case 'viewer': return Eye;
    case 'api-service': return Bot;
    default: return Users;
  }
}

// ==================== Component ====================
export function SettingsView() {
  // ===== Persistent State =====
  const [users, setUsers] = usePersistentState<User[]>('settings-users-v2', defaultUsers);
  const [roles, setRoles] = usePersistentState<RoleDef[]>('settings-roles-v2', SYSTEM_ROLES);
  const [license, setLicense] = usePersistentState<LicenseData>('settings-license-v2', defaultLicense);
  const [licenseHistory, setLicenseHistory] = usePersistentState<LicenseHistoryEntry[]>('settings-license-history-v2', defaultLicenseHistory);
  const [auditLogs, setAuditLogs] = usePersistentState<AuditLogEntry[]>('settings-audit-logs-v2', defaultAuditLogs);
  const [security, setSecurity] = usePersistentState('settings-security-v2', defaultSecurity);
  const [apiKeys, setApiKeys] = usePersistentState<ApiKey[]>('settings-api-keys', defaultApiKeys);
  const [failedLogins] = usePersistentState<FailedLogin[]>('settings-failed-logins', defaultFailedLogins);

  // ===== UI State =====
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Users tab state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [passwordChangeTarget, setPasswordChangeTarget] = useState<User | null>(null);
  const [passwordChangeForm, setPasswordChangeForm] = useState<PasswordChangeForm>({ newPassword: '', confirmPassword: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userDetailTarget, setUserDetailTarget] = useState<User | null>(null);

  // Roles tab state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [roleFormColor, setRoleFormColor] = useState('teal');
  const [roleFormMaxSessions, setRoleFormMaxSessions] = useState(2);
  const [roleFormPermissions, setRoleFormPermissions] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(PERMISSION_CATEGORIES.map(c => c.id)));
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleDef | null>(null);

  // License tab state
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activationMode, setActivationMode] = useState<'online' | 'offline'>('online');
  const [licenseKeyRevealed, setLicenseKeyRevealed] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [fingerprintRevealed, setFingerprintRevealed] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTargetFingerprint, setTransferTargetFingerprint] = useState('');

  // Audit tab state
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logResourceFilter, setLogResourceFilter] = useState('all');

  // Security tab state
  const [newIpInput, setNewIpInput] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState('');

  // ===== Helpers =====
  const showSaved = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  };

  // ===== User CRUD =====
  const openAddUserDialog = () => {
    setEditingUserId(null);
    setUserForm(emptyUserForm);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const openEditUserDialog = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      username: user.username, name: user.name, email: user.email,
      phone: user.phone, role: user.role, department: user.department,
      status: user.status, password: '', confirmPassword: '', notes: user.notes,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const openPasswordChangeDialog = (user: User) => {
    setPasswordChangeTarget(user);
    setPasswordChangeForm({ newPassword: '', confirmPassword: '' });
    setShowPwNew(false);
    setShowPwConfirm(false);
    setPasswordChangeOpen(true);
  };

  const handleSaveUser = () => {
    if (!userForm.username.trim() || !userForm.name.trim() || !userForm.email.trim()) return;
    if (editingUserId) {
      if (userForm.password) {
        const pwVal = validatePassword(userForm.password);
        if (!pwVal.valid) return;
        if (userForm.password !== userForm.confirmPassword) return;
      }
      setUsers(prev => prev.map(u => u.id === editingUserId ? {
        ...u, username: userForm.username.trim(), name: userForm.name.trim(),
        email: userForm.email.trim(), phone: userForm.phone.trim(), role: userForm.role,
        department: userForm.department.trim(), status: userForm.status, notes: userForm.notes.trim(),
      } : u));
    } else {
      const pwVal = validatePassword(userForm.password);
      if (!pwVal.valid) return;
      if (userForm.password !== userForm.confirmPassword) return;
      const newUser: User = {
        id: generateId(), username: userForm.username.trim(), name: userForm.name.trim(),
        email: userForm.email.trim(), phone: userForm.phone.trim(), role: userForm.role,
        department: userForm.department.trim(), status: userForm.status,
        lastLogin: '-', createdAt: new Date().toISOString(),
        notes: userForm.notes.trim(), sessions: [],
      };
      setUsers(prev => [...prev, newUser]);
    }
    setUserDialogOpen(false);
    showSaved('users');
  };

  const handleDeleteUser = () => {
    if (!deleteTarget) return;
    setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    setSelectedUserIds(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    showSaved('users');
  };

  const handlePasswordChange = () => {
    const pwVal = validatePassword(passwordChangeForm.newPassword);
    if (!pwVal.valid) return;
    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) return;
    setPasswordChangeOpen(false);
    setPasswordChangeTarget(null);
    showSaved('users');
  };

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'suspend') => {
    const newStatus = action === 'activate' ? 'active' : action === 'deactivate' ? 'inactive' : 'suspended';
    setUsers(prev => prev.map(u => selectedUserIds.has(u.id) ? { ...u, status: newStatus } : u));
    setSelectedUserIds(new Set());
    showSaved('users');
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // ===== Role CRUD =====
  const openAddRoleDialog = () => {
    setEditingRoleId(null);
    setRoleFormName('');
    setRoleFormDesc('');
    setRoleFormColor('teal');
    setRoleFormMaxSessions(2);
    setRoleFormPermissions([]);
    setRoleDialogOpen(true);
  };

  const openEditRoleDialog = (role: RoleDef) => {
    setEditingRoleId(role.id);
    setRoleFormName(role.label);
    setRoleFormDesc(role.description);
    setRoleFormColor(role.color);
    setRoleFormMaxSessions(role.maxSessions);
    setRoleFormPermissions([...role.permissions]);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!roleFormName.trim()) return;
    if (editingRoleId) {
      setRoles(prev => prev.map(r => r.id === editingRoleId ? {
        ...r, label: roleFormName.trim(), description: roleFormDesc.trim(),
        color: roleFormColor, maxSessions: roleFormMaxSessions,
        permissions: roleFormPermissions,
      } : r));
    } else {
      const newRole: RoleDef = {
        id: generateId(), name: roleFormName.trim().toLowerCase().replace(/\s+/g, '-'),
        label: roleFormName.trim(), description: roleFormDesc.trim(),
        level: roles.length + 1, color: roleFormColor,
        permissions: roleFormPermissions, isSystem: false, maxSessions: roleFormMaxSessions,
      };
      setRoles(prev => [...prev, newRole]);
    }
    setRoleDialogOpen(false);
    showSaved('roles');
  };

  const handleDeleteRole = () => {
    if (!deleteRoleTarget) return;
    setRoles(prev => prev.filter(r => r.id !== deleteRoleTarget.id));
    setDeleteRoleConfirmOpen(false);
    setDeleteRoleTarget(null);
    showSaved('roles');
  };

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev => {
      const n = new Set(prev);
      if (n.has(catId)) n.delete(catId); else n.add(catId);
      return n;
    });
  };

  const toggleRolePermission = (permId: string) => {
    setRoleFormPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  // ===== License =====
  const handleActivateLicense = () => {
    if (!validateLicenseKey(licenseKeyInput)) return;
    setLicense(prev => ({
      ...prev, key: licenseKeyInput.toUpperCase(), status: 'active',
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    }));
    setLicenseHistory(prev => [...prev, {
      id: 'lh' + Date.now(), action: 'activation', key: licenseKeyInput.toUpperCase(),
      type: license.type, timestamp: new Date().toISOString(),
      details: activationMode === 'online' ? 'Онлайн активация лицензии' : 'Офлайн активация лицензии',
    }]);
    setLicenseDialogOpen(false);
    setLicenseKeyInput('');
    showSaved('license');
  };

  const handleDeactivateLicense = () => {
    setLicense(prev => ({ ...prev, status: 'invalid', activatedAt: null }));
    setLicenseHistory(prev => [...prev, {
      id: 'lh' + Date.now(), action: 'deactivation', key: license.key,
      type: license.type, timestamp: new Date().toISOString(), details: 'Деактивация лицензии',
    }]);
    setDeactivateConfirmOpen(false);
    showSaved('license');
  };

  const handleTransferLicense = () => {
    if (!transferTargetFingerprint.trim()) return;
    setLicenseHistory(prev => [...prev, {
      id: 'lh' + Date.now(), action: 'transfer', key: license.key,
      type: license.type, timestamp: new Date().toISOString(),
      details: `Передача лицензии на устройство ${transferTargetFingerprint.slice(0, 20)}...`,
    }]);
    setLicense(prev => ({ ...prev, status: 'invalid', activatedAt: null }));
    setTransferDialogOpen(false);
    setTransferTargetFingerprint('');
    showSaved('license');
  };

  const handleExportLicense = () => {
    const data = JSON.stringify({ license, licenseHistory }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Audit =====
  const handleExportAudit = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Security =====
  const handleAddIp = () => {
    if (!newIpInput.trim()) return;
    setSecurity(prev => ({ ...prev, ipWhitelist: [...prev.ipWhitelist, newIpInput.trim()] }));
    setNewIpInput('');
    showSaved('security');
  };

  const handleRemoveIp = (ip: string) => {
    setSecurity(prev => ({ ...prev, ipWhitelist: prev.ipWhitelist.filter(i => i !== ip) }));
    showSaved('security');
  };

  const handleGenerateApiKey = () => {
    if (!newKeyName.trim()) return;
    const key = 'sk-gate-' + generateId() + generateId();
    const newApiKey: ApiKey = {
      id: generateId(), name: newKeyName.trim(), key,
      createdAt: new Date().toISOString(), lastUsed: '-', expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    };
    setApiKeys(prev => [...prev, newApiKey]);
    setGeneratedApiKey(key);
    setShowNewApiKey(true);
    setNewKeyName('');
  };

  const handleRevokeApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    showSaved('security');
  };

  // ===== Filtered Data =====
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  const filteredLogs = useMemo(() => auditLogs.filter(l => {
    const matchSearch = !logSearch || l.description.toLowerCase().includes(logSearch.toLowerCase()) || l.user.toLowerCase().includes(logSearch.toLowerCase());
    const matchAction = logActionFilter === 'all' || l.action.includes(logActionFilter);
    const matchStatus = logStatusFilter === 'all' || l.status === logStatusFilter;
    const matchResource = logResourceFilter === 'all' || l.resource === logResourceFilter;
    return matchSearch && matchAction && matchStatus && matchResource;
  }), [auditLogs, logSearch, logActionFilter, logStatusFilter, logResourceFilter]);

  const userCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    roles.forEach(r => { counts[r.id] = 0; });
    users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });
    return counts;
  }, [users, roles]);

  const userCountByStatus = useMemo(() => {
    const counts: Record<string, number> = { active: 0, inactive: 0, suspended: 0 };
    users.forEach(u => { if (counts[u.status] !== undefined) counts[u.status]++; });
    return counts;
  }, [users]);

  const resourceUsage = useMemo(() => [
    { label: 'Устройства', icon: HardDrive, current: license.currentDevices, max: license.maxDevices },
    { label: 'Теги', icon: Activity, current: license.currentTags, max: license.maxTags },
    { label: 'Соединения', icon: Wifi, current: license.currentConnections, max: license.maxConnections },
    { label: 'Пользователи', icon: Users, current: license.currentUsers, max: license.maxUsers },
    { label: 'Потоки данных', icon: GitBranch, current: license.currentPipelines, max: license.maxPipelines },
    { label: 'Драйверы', icon: Cpu, current: license.currentDrivers, max: license.maxDrivers },
  ], [license]);

  const licenseDaysLeft = Math.max(0, Math.floor((new Date(license.expiresAt).getTime() - Date.now()) / 86400000));

  const licenseStatusInfo = useMemo(() => {
    if (license.status === 'invalid' || !license.key) return { label: 'Недействительна', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' };
    if (license.status === 'expired') return { label: 'Истекла', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' };
    if (licenseDaysLeft < 30) return { label: 'Истекает скоро', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' };
    return { label: 'Активна', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' };
  }, [licenseDaysLeft, license.status, license.key]);

  const supportDaysLeft = license.supportContract?.expiresAt
    ? Math.max(0, Math.floor((new Date(license.supportContract.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  const licenseActionIcon = useMemo(() => {
    switch (licenseHistory[0]?.action) {
      case 'activation': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'deactivation': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'renewal': return <RotateCw className="h-4 w-4 text-blue-500" />;
      case 'upgrade': return <ArrowRightLeft className="h-4 w-4 text-violet-500" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4 text-amber-500" />;
      default: return <CircleDot className="h-4 w-4 text-muted-foreground" />;
    }
  }, [licenseHistory]);

  const resourceTypes = useMemo(() => {
    const types = new Set(auditLogs.map(l => l.resource));
    return Array.from(types).sort();
  }, [auditLogs]);

  const passwordValidation = userForm.password ? validatePassword(userForm.password) : null;
  const passwordsMatch = userForm.password === userForm.confirmPassword;
  const canSaveUser = userForm.username.trim() && userForm.name.trim() && userForm.email.trim() &&
    (editingUserId ? true : userForm.password.length > 0) &&
    (userForm.password ? (passwordValidation?.valid ?? false) && passwordsMatch : true);

  const pwChangeValidation = passwordChangeForm.newPassword ? validatePassword(passwordChangeForm.newPassword) : null;
  const pwChangeMatch = passwordChangeForm.newPassword === passwordChangeForm.confirmPassword;
  const canChangePassword = passwordChangeForm.newPassword.length > 0 && (pwChangeValidation?.valid ?? false) && pwChangeMatch;

  // ==================== RENDER ====================
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />Пользователи</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-4 w-4" />Роли и права</TabsTrigger>
          <TabsTrigger value="license" className="gap-1.5"><Key className="h-4 w-4" />Лицензия</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><FileText className="h-4 w-4" />Аудит журнал</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Lock className="h-4 w-4" />Безопасность</TabsTrigger>
        </TabsList>

        {/* ==================== USERS TAB ==================== */}
        <TabsContent value="users" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Всего пользователей', value: users.length, icon: Users, color: '' },
              { label: 'Активные', value: userCountByStatus.active, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Неактивные', value: userCountByStatus.inactive, icon: Clock, color: 'text-gray-500' },
              { label: 'Заблокированные', value: userCountByStatus.suspended, icon: Ban, color: 'text-red-600 dark:text-red-400' },
            ].map(s => (
              <Card key={s.label} className="p-3">
                <div className="flex items-center gap-2">
                  <s.icon className={cn('h-4 w-4', s.color || 'text-muted-foreground')} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button className="gap-1.5" onClick={openAddUserDialog}>
              <UserPlus className="h-4 w-4" />Добавить
            </Button>
            {selectedUserIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{selectedUserIds.size} выбрано</Badge>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleBulkAction('activate')}>
                  <CheckCircle2 className="h-3 w-3" />Активировать
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleBulkAction('deactivate')}>
                  <Clock className="h-3 w-3" />Деактивировать
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs text-red-600" onClick={() => handleBulkAction('suspend')}>
                  <Ban className="h-3 w-3" />Заблокировать
                </Button>
              </div>
            )}
            {savedSection === 'users' && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs"><Check className="h-3 w-3 mr-1" />Сохранено</Badge>}
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Поиск..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-8 h-8 w-48" />
            </div>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Роль" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
              <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
                <SelectItem value="suspended">Заблокированные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead className="hidden md:table-cell">Роль</TableHead>
                  <TableHead className="hidden lg:table-cell">Отдел</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="hidden lg:table-cell">Последний вход</TableHead>
                  <TableHead className="w-[120px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => {
                  const roleColor = getRoleColor(user.role);
                  return (
                    <TableRow key={user.id}>
                      <TableCell><Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={() => toggleSelectUser(user.id)} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0',
                            user.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                          )}>
                            {getAvatarInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className={cn('text-[10px]', getRoleColorClasses(roleColor))}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{user.department || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : user.status === 'suspended' ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-slate-500/10 text-slate-500 border-slate-500/30')}>
                          <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1', user.status === 'active' ? 'bg-emerald-500' : user.status === 'suspended' ? 'bg-red-500' : 'bg-slate-400')} />
                          {user.status === 'active' ? 'Активен' : user.status === 'suspended' ? 'Заблокирован' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{relativeTime(user.lastLogin)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setUserDetailTarget(user); setUserDetailOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Подробнее</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUserDialog(user)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Редактировать</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPasswordChangeDialog(user)}><KeyRound className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Сменить пароль</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { setDeleteTarget(user); setDeleteConfirmOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Удалить</TooltipContent></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Пользователи не найдены</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Password Policy Summary */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Политика паролей</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border p-2"><span className="text-muted-foreground">Мин. длина</span><p className="font-semibold">{security.passwordMinLength} символов</p></div>
              <div className="rounded-lg border p-2"><span className="text-muted-foreground">Заглавные буквы</span><p className="font-semibold">{security.passwordRequireUppercase ? 'Обязательно' : 'Нет'}</p></div>
              <div className="rounded-lg border p-2"><span className="text-muted-foreground">Цифры</span><p className="font-semibold">{security.passwordRequireNumbers ? 'Обязательно' : 'Нет'}</p></div>
              <div className="rounded-lg border p-2"><span className="text-muted-foreground">Срок действия</span><p className="font-semibold">{security.passwordExpiryDays} дней</p></div>
            </div>
          </Card>
        </TabsContent>

        {/* ==================== ROLES & PERMISSIONS TAB ==================== */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">Всего ролей</p><p className="text-2xl font-bold">{roles.length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Системных ролей</p><p className="text-2xl font-bold">{roles.filter(r => r.isSystem).length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Всего разрешений</p><p className="text-2xl font-bold">{PERMISSIONS.length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Категорий</p><p className="text-2xl font-bold">{PERMISSION_CATEGORIES.length}</p></Card>
          </div>

          {/* Role Cards */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Роли системы</h3>
            <Button className="gap-1.5" size="sm" onClick={openAddRoleDialog}><Plus className="h-4 w-4" />Новая роль</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map(role => {
              const IconComp = getRoleIcon(role.name);
              const userCount = userCountByRole[role.id] || 0;
              return (
                <Card key={role.id} className={cn('p-4 transition-colors', role.isSystem && 'border-dashed')}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', getRoleColorClasses(role.color))}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{role.label}</p>
                          {role.isSystem && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted text-muted-foreground">Система</Badge>}
                        </div>
                        <Badge variant="outline" className={cn('text-[9px] mt-0.5', getRoleColorClasses(role.color))}>
                          Уровень {role.level}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRoleDialog(role)}><Pencil className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Редактировать</TooltipContent></Tooltip>
                      {!role.isSystem && (
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { setDeleteRoleTarget(role); setDeleteRoleConfirmOpen(true); }}><Trash2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Удалить</TooltipContent></Tooltip>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{role.description}</p>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{userCount} польз.</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{role.permissions.length} из {PERMISSIONS.length}</span>
                    <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />Макс. {role.maxSessions} сессий</span>
                  </div>
                  <Progress value={(role.permissions.length / PERMISSIONS.length) * 100} className="h-1.5 mt-2" />
                </Card>
              );
            })}
          </div>

          {/* Permission Matrix */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Матрица разрешений</CardTitle>
                  <CardDescription className="text-xs">Разрешения по ролям ({PERMISSIONS.length} разрешений, {roles.length} ролей)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenCategories(new Set(PERMISSION_CATEGORIES.map(c => c.id)))}>
                  Развернуть все
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {PERMISSION_CATEGORIES.map(cat => {
                    const catPermissions = PERMISSIONS.filter(p => p.category === cat.id);
                    const isOpen = openCategories.has(cat.id);
                    return (
                      <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleCategory(cat.id)}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border p-3 hover:bg-accent transition-colors">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-sm font-medium">{cat.label}</span>
                          <Badge variant="outline" className="text-[10px]">{catPermissions.length}</Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-1 ml-6 rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs w-[200px]">Разрешение</TableHead>
                                  {roles.map(r => (
                                    <TableHead key={r.id} className="text-xs text-center w-[80px]">
                                      <span className="flex flex-col items-center gap-0.5">
                                        <span className={cn('inline-block h-2 w-2 rounded-full', getRoleDotColor(r.color))} />
                                        <span className="truncate max-w-[70px] text-[10px]">{r.label}</span>
                                      </span>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {catPermissions.map(perm => (
                                  <TableRow key={perm.id}>
                                    <TableCell className="text-xs py-2">
                                      <span className="font-medium">{perm.label}</span>
                                      <span className="text-muted-foreground ml-1 hidden lg:inline">— {perm.description}</span>
                                    </TableCell>
                                    {roles.map(r => (
                                      <TableCell key={r.id} className="text-center py-2">
                                        <Checkbox
                                          checked={r.permissions.includes(perm.id)}
                                          disabled={r.isSystem}
                                          className="mx-auto"
                                        />
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== LICENSE TAB ==================== */}
        <TabsContent value="license" className="mt-4 space-y-4">
          {/* License Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className={cn('p-4 border', licenseStatusInfo.border)}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('inline-block h-2.5 w-2.5 rounded-full', licenseStatusInfo.dot)} />
                <p className="text-xs text-muted-foreground">Статус лицензии</p>
              </div>
              <p className={cn('text-lg font-bold', licenseStatusInfo.color)}>{licenseStatusInfo.label}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Тип лицензии</p>
              <p className="text-lg font-bold">{license.type === 'Enterprise' ? 'Enterprise' : license.type === 'Professional' ? 'Professional' : license.type === 'Standard' ? 'Standard' : 'Free'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Осталось дней</p>
              <p className={cn('text-lg font-bold', licenseDaysLeft < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>{licenseDaysLeft}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Дата окончания</p>
              <p className="text-lg font-bold">{formatDate(license.expiresAt)}</p>
            </Card>
          </div>

          {/* License Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Информация о лицензии</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleExportLicense}><Download className="h-3 w-3" />Экспорт</Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setLicenseDialogOpen(true)}><Key className="h-3 w-3" />Активировать</Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs text-amber-600" onClick={() => setTransferDialogOpen(true)}><ArrowRightLeft className="h-3 w-3" />Передать</Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs text-red-600" onClick={() => setDeactivateConfirmOpen(true)}><Power className="h-3 w-3" />Деактивировать</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Владелец</span><p className="font-medium">{license.owner}</p></div>
                  <div><span className="text-muted-foreground text-xs">Организация</span><p className="font-medium">{license.organization}</p></div>
                  <div><span className="text-muted-foreground text-xs">Ключ лицензии</span>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-xs">{licenseKeyRevealed ? license.key : maskKey(license.key)}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLicenseKeyRevealed(!licenseKeyRevealed)}>{licenseKeyRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(license.key); showSaved('license'); }}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div><span className="text-muted-foreground text-xs">Дата выдачи</span><p className="font-medium">{formatDate(license.issuedAt)}</p></div>
                  <div><span className="text-muted-foreground text-xs">Дата активации</span><p className="font-medium">{formatDateTime(license.activatedAt || '-')}</p></div>
                  <div><span className="text-muted-foreground text-xs">Отпечаток оборудования</span>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-xs">{fingerprintRevealed ? license.fingerprint : maskKey(license.fingerprint)}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setFingerprintRevealed(!fingerprintRevealed)}>
                        {fingerprintRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Contract */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Контракт поддержки</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {license.supportContract ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-block h-2 w-2 rounded-full', license.supportContract.active ? 'bg-emerald-500' : 'bg-red-500')} />
                      <Badge variant="outline" className={cn('text-[10px]', license.supportContract.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30')}>
                        {license.supportContract.active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </div>
                    <div><span className="text-xs text-muted-foreground">Уровень</span><p className="font-medium">{license.supportContract.level === 'dedicated' ? 'Персональный' : license.supportContract.level === 'priority' ? 'Приоритетный' : 'Базовый'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Провайдер</span><p className="font-medium">{license.supportContract.provider}</p></div>
                    <div><span className="text-xs text-muted-foreground">Телефон</span><p className="font-medium">{license.supportContract.phone}</p></div>
                    <div><span className="text-xs text-muted-foreground">Email</span><p className="font-medium">{license.supportContract.email}</p></div>
                    <div><span className="text-xs text-muted-foreground">Осталось дней</span><p className={cn('font-bold', supportDaysLeft < 30 ? 'text-amber-600' : 'text-foreground')}>{supportDaysLeft}</p></div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Headphones className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Контракт поддержки не подключён</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resource Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Использование ресурсов</CardTitle>
              <CardDescription className="text-xs">Текущее использование по лицензии</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resourceUsage.map(res => {
                  const pct = Math.min(100, Math.round((res.current / res.max) * 100));
                  return (
                    <div key={res.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5"><res.icon className="h-3.5 w-3.5 text-muted-foreground" />{res.label}</span>
                        <span className={cn('text-xs font-medium', pct > 80 ? 'text-red-600' : 'text-muted-foreground')}>{res.current} / {res.max}</span>
                      </div>
                      <Progress value={pct} className={cn('h-2', pct > 80 ? '[&>div]:bg-red-500' : '')} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* License History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">История лицензии</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                {licenseHistory.map(entry => {
                  const actionLabel = entry.action === 'activation' ? 'Активация' : entry.action === 'deactivation' ? 'Деактивация' : entry.action === 'renewal' ? 'Продление' : entry.action === 'upgrade' ? 'Апгрейд' : 'Передача';
                  return (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      <div className="absolute -left-3.5 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
                        {entry.action === 'activation' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> :
                         entry.action === 'deactivation' ? <XCircle className="h-3 w-3 text-red-500" /> :
                         entry.action === 'renewal' ? <RotateCw className="h-3 w-3 text-blue-500" /> :
                         <ArrowRightLeft className="h-3 w-3 text-violet-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{actionLabel}</p>
                          <Badge variant="outline" className="text-[9px]">{entry.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.details}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Feature Comparison Matrix */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Сравнение тарифов</CardTitle>
              <CardDescription className="text-xs">Доступные функции по тарифам ({FEATURE_MATRIX.length} функций)</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[250px]">Функция</TableHead>
                      <TableHead className="text-xs text-center w-24">
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30 text-[10px]">Free</Badge>
                      </TableHead>
                      <TableHead className="text-xs text-center w-24">
                        <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-[10px]">Standard</Badge>
                      </TableHead>
                      <TableHead className="text-xs text-center w-24">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Professional</Badge>
                      </TableHead>
                      <TableHead className="text-xs text-center w-24">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Enterprise</Badge>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FEATURE_MATRIX.map(f => {
                      const renderValue = (val: boolean | string) => {
                        if (typeof val === 'string') return <span className="text-xs font-medium">{val}</span>;
                        return val ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
                      };
                      return (
                        <TableRow key={f.feature}>
                          <TableCell className="text-xs py-2">{f.feature}</TableCell>
                          <TableCell className="text-center py-2">{renderValue(f.free)}</TableCell>
                          <TableCell className="text-center py-2">{renderValue(f.standard)}</TableCell>
                          <TableCell className="text-center py-2">{renderValue(f.professional)}</TableCell>
                          <TableCell className="text-center py-2">{renderValue(f.enterprise)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== AUDIT LOG TAB ==================== */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">Всего записей</p><p className="text-2xl font-bold">{auditLogs.length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Успешных</p><p className="text-2xl font-bold text-emerald-600">{auditLogs.filter(l => l.status === 'success').length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Ошибок</p><p className="text-2xl font-bold text-red-600">{auditLogs.filter(l => l.status === 'failure').length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Уникальных пользователей</p><p className="text-2xl font-bold">{new Set(auditLogs.map(l => l.user)).size}</p></Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportAudit}><Download className="h-3.5 w-3.5" />Экспорт JSON</Button>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Поиск..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-8 h-8 w-48" />
            </div>
            <Select value={logActionFilter} onValueChange={setLogActionFilter}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Действие" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все действия</SelectItem>
                <SelectItem value="create">Создание</SelectItem>
                <SelectItem value="update">Изменение</SelectItem>
                <SelectItem value="delete">Удаление</SelectItem>
                <SelectItem value="login">Авторизация</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
            <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
              <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="success">Успешно</SelectItem>
                <SelectItem value="failure">Ошибка</SelectItem>
              </SelectContent>
            </Select>
            <Select value={logResourceFilter} onValueChange={setLogResourceFilter}>
              <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Ресурс" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все ресурсы</SelectItem>
                {resourceTypes.map(rt => (
                  <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audit Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">{/* status */}</TableHead>
                  <TableHead className="text-xs">Время</TableHead>
                  <TableHead className="text-xs">Пользователь</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Действие</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Ресурс</TableHead>
                  <TableHead className="text-xs">Описание</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.status === 'success'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(log.timestamp)}</TableCell>
                    <TableCell className="text-xs font-medium">{log.user}</TableCell>
                    <TableCell className="text-xs font-mono hidden md:table-cell">{log.action}</TableCell>
                    <TableCell className="hidden lg:table-cell"><Badge variant="outline" className="text-[10px]">{log.resource}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate">{log.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono hidden xl:table-cell">{log.ip}</TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Записи не найдены</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ==================== SECURITY TAB ==================== */}
        <TabsContent value="security" className="mt-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">API ключи</p><p className="text-2xl font-bold">{apiKeys.length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">IP в белом списке</p><p className="text-2xl font-bold">{security.ipWhitelist.length}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Неудачных входов</p><p className="text-2xl font-bold text-red-600">{failedLogins.reduce((a, f) => a + f.attempts, 0)}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">2FA</p><p className="text-2xl font-bold">{security.twoFactorEnabled ? 'Вкл' : 'Выкл'}</p></Card>
          </div>

          {/* Session Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Управление сессиями</CardTitle>
              <CardDescription className="text-xs">Настройки времени жизни и параллельных сессий</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Таймаут сессии (сек)</Label>
                  <Input type="number" value={security.sessionTimeout} onChange={e => setSecurity(s => ({ ...s, sessionTimeout: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Макс. параллельных сессий</Label>
                  <Input type="number" value={security.maxConcurrentSessions} onChange={e => setSecurity(s => ({ ...s, maxConcurrentSessions: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Таймаут неактивности (сек)</Label>
                  <Input type="number" value={security.idleTimeout} onChange={e => setSecurity(s => ({ ...s, idleTimeout: Number(e.target.value) }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Policy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Политика паролей</CardTitle>
              <CardDescription className="text-xs">Требования к сложности и сроку действия паролей</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Минимальная длина пароля</Label>
                  <Input type="number" value={security.passwordMinLength} onChange={e => setSecurity(s => ({ ...s, passwordMinLength: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Срок действия пароля (дней)</Label>
                  <Input type="number" value={security.passwordExpiryDays} onChange={e => setSecurity(s => ({ ...s, passwordExpiryDays: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><Label className="text-xs">Заглавные буквы</Label><p className="text-[10px] text-muted-foreground">Требовать минимум 1 заглавную букву</p></div>
                  <Switch checked={security.passwordRequireUppercase} onCheckedChange={v => setSecurity(s => ({ ...s, passwordRequireUppercase: v }))} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><Label className="text-xs">Цифры</Label><p className="text-[10px] text-muted-foreground">Требовать минимум 1 цифру</p></div>
                  <Switch checked={security.passwordRequireNumbers} onCheckedChange={v => setSecurity(s => ({ ...s, passwordRequireNumbers: v }))} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><Label className="text-xs">Спецсимволы</Label><p className="text-[10px] text-muted-foreground">Требовать минимум 1 спецсимвол (!@#$%...)</p></div>
                  <Switch checked={security.passwordRequireSpecial} onCheckedChange={v => setSecurity(s => ({ ...s, passwordRequireSpecial: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Lockout Policy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Политика блокировки</CardTitle>
              <CardDescription className="text-xs">Автоматическая блокировка при неудачных попытках входа</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Макс. попыток входа</Label>
                  <Input type="number" value={security.maxLoginAttempts} onChange={e => setSecurity(s => ({ ...s, maxLoginAttempts: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Длительность блокировки (сек)</Label>
                  <Input type="number" value={security.lockoutDuration} onChange={e => setSecurity(s => ({ ...s, lockoutDuration: Number(e.target.value) }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2FA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Двухфакторная аутентификация</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', security.twoFactorEnabled ? 'bg-emerald-500/10' : 'bg-muted')}>
                    <Smartphone className={cn('h-5 w-5', security.twoFactorEnabled ? 'text-emerald-500' : 'text-muted-foreground')} />
                  </div>
                  <div>
                    <Label>2FA аутентификация</Label>
                    <p className="text-[10px] text-muted-foreground">TOTP через приложение-аутентификатор</p>
                  </div>
                </div>
                <Switch checked={security.twoFactorEnabled} onCheckedChange={v => setSecurity(s => ({ ...s, twoFactorEnabled: v }))} />
              </div>
            </CardContent>
          </Card>

          {/* IP Whitelist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">IP белый список</CardTitle>
              <CardDescription className="text-xs">Ограничение доступа по IP-адресам и подсетям</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="192.168.1.0/24 или 10.0.0.1" value={newIpInput} onChange={e => setNewIpInput(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={handleAddIp}><Plus className="h-4 w-4" />Добавить</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {security.ipWhitelist.map(ip => (
                  <Badge key={ip} variant="outline" className="text-xs gap-1 pr-1">
                    <span className="font-mono">{ip}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleRemoveIp(ip)}><X className="h-3 w-3" /></Button>
                  </Badge>
                ))}
                {security.ipWhitelist.length === 0 && <p className="text-xs text-muted-foreground">Белый список пуст — доступ разрешён со всех IP</p>}
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Управление API ключами</CardTitle>
              <CardDescription className="text-xs">Генерация и отозвание ключей для REST API</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Название ключа (например: SCADA Integration)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={handleGenerateApiKey}><Key className="h-4 w-4" />Создать</Button>
              </div>
              <div className="space-y-2">
                {apiKeys.map(ak => (
                  <div key={ak.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{ak.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{maskKey(ak.key)}</p>
                      <p className="text-[10px] text-muted-foreground">Создан: {formatDate(ak.createdAt)} · Последнее использование: {relativeTime(ak.lastUsed)}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs text-red-600 ml-2 shrink-0" onClick={() => handleRevokeApiKey(ak.id)}>Отозвать</Button>
                  </div>
                ))}
                {apiKeys.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Нет активных API ключей</p>}
              </div>
            </CardContent>
          </Card>

          {/* Recent Failed Logins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Неудачные попытки входа
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Пользователь</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">Попытки</TableHead>
                    <TableHead className="text-xs">Последняя</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedLogins.map(fl => (
                    <TableRow key={fl.id}>
                      <TableCell className="text-xs font-medium">{fl.username}</TableCell>
                      <TableCell className="text-xs font-mono">{fl.ip}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', fl.attempts >= security.maxLoginAttempts ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30')}>
                          {fl.attempts}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{relativeTime(fl.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                  {failedLogins.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">Нет неудачных попыток входа</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button className="gap-1.5" onClick={() => showSaved('security')}>
              {savedSection === 'security' ? <><CheckCircle2 className="h-4 w-4" />Сохранено</> : <><Save className="h-4 w-4" />Сохранить</>}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================== DIALOGS ==================== */}

      {/* Add/Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
            <DialogDescription>{editingUserId ? 'Изменение данных пользователя' : 'Заполните данные нового пользователя'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Логин *</Label><Input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} placeholder="username" /></div>
              <div className="space-y-2"><Label className="text-xs">Полное имя *</Label><Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Иванов Иван Иванович" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Email *</Label><Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" /></div>
              <div className="space-y-2"><Label className="text-xs">Телефон</Label><Input value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7 (495) 000-00-00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Роль *</Label>
                <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Отдел</Label>
                <Input value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))} placeholder="АСУ ТП" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Статус</Label>
              <Select value={userForm.status} onValueChange={v => setUserForm(f => ({ ...f, status: v as 'active' | 'inactive' | 'suspended' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                  <SelectItem value="suspended">Заблокирован</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">{editingUserId ? 'Новый пароль (оставьте пустым, если не менять)' : 'Пароль *'}</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Минимум 8 символов" />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {passwordValidation && !passwordValidation.valid && (
                <div className="text-xs text-red-500 space-y-0.5">
                  {passwordValidation.errors.map((err, i) => <p key={i}>• {err}</p>)}
                </div>
              )}
            </div>
            {userForm.password && (
              <div className="space-y-2">
                <Label className="text-xs">Подтверждение пароля</Label>
                <div className="relative">
                  <Input type={showConfirmPassword ? 'text' : 'password'} value={userForm.confirmPassword} onChange={e => setUserForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {!passwordsMatch && userForm.confirmPassword && <p className="text-xs text-red-500">Пароли не совпадают</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Заметки</Label>
              <Textarea value={userForm.notes} onChange={e => setUserForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Дополнительная информация..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveUser} disabled={!canSaveUser}>{editingUserId ? 'Сохранить' : 'Создать'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordChangeOpen} onOpenChange={setPasswordChangeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить пароль</DialogTitle>
            <DialogDescription>Установка нового пароля для {passwordChangeTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Новый пароль *</Label>
              <div className="relative">
                <Input type={showPwNew ? 'text' : 'password'} value={passwordChangeForm.newPassword} onChange={e => setPasswordChangeForm(f => ({ ...f, newPassword: e.target.value }))} />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPwNew(!showPwNew)}>
                  {showPwNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {pwChangeValidation && !pwChangeValidation.valid && (
                <div className="text-xs text-red-500 space-y-0.5">{pwChangeValidation.errors.map((e, i) => <p key={i}>• {e}</p>)}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Подтверждение пароля</Label>
              <div className="relative">
                <Input type={showPwConfirm ? 'text' : 'password'} value={passwordChangeForm.confirmPassword} onChange={e => setPasswordChangeForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPwConfirm(!showPwConfirm)}>
                  {showPwConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {!pwChangeMatch && passwordChangeForm.confirmPassword && <p className="text-xs text-red-500">Пароли не совпадают</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordChangeOpen(false)}>Отмена</Button>
            <Button onClick={handlePasswordChange} disabled={!canChangePassword}>Сменить пароль</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Подробности пользователя</DialogTitle>
          </DialogHeader>
          {userDetailTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold',
                  userDetailTarget.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}>
                  {getAvatarInitials(userDetailTarget.name)}
                </div>
                <div>
                  <p className="font-semibold">{userDetailTarget.name}</p>
                  <p className="text-sm text-muted-foreground">@{userDetailTarget.username}</p>
                </div>
                <Badge variant="outline" className={cn('ml-auto text-xs', getRoleColorClasses(getRoleColor(userDetailTarget.role)))}>
                  {getRoleLabel(userDetailTarget.role)}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Email</span><p className="font-medium">{userDetailTarget.email}</p></div>
                <div><span className="text-xs text-muted-foreground">Телефон</span><p className="font-medium">{userDetailTarget.phone || '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">Отдел</span><p className="font-medium">{userDetailTarget.department || '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">Статус</span><p className="font-medium">{userDetailTarget.status === 'active' ? 'Активен' : userDetailTarget.status === 'suspended' ? 'Заблокирован' : 'Неактивен'}</p></div>
                <div><span className="text-xs text-muted-foreground">Создан</span><p className="font-medium">{formatDate(userDetailTarget.createdAt)}</p></div>
                <div><span className="text-xs text-muted-foreground">Последний вход</span><p className="font-medium">{formatDateTime(userDetailTarget.lastLogin)}</p></div>
              </div>
              {userDetailTarget.notes && (
                <div><span className="text-xs text-muted-foreground">Заметки</span><p className="text-sm mt-0.5">{userDetailTarget.notes}</p></div>
              )}
              {/* Sessions */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Активные сессии ({userDetailTarget.sessions.length})</p>
                </div>
                {userDetailTarget.sessions.length > 0 ? (
                  <div className="space-y-2">
                    {userDetailTarget.sessions.map(session => (
                      <div key={session.id} className="rounded-lg border p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-medium">{session.ip}</span>
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Активна</Badge>
                        </div>
                        <p className="text-muted-foreground">{session.userAgent}</p>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Вход: {formatDateTime(session.loginAt)}</span>
                          <span>Активность: {relativeTime(session.lastActivity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Нет активных сессий</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDetailOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>Вы уверены, что хотите удалить пользователя «{deleteTarget?.name}»? Это действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteUser}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoleId ? 'Редактировать роль' : 'Новая роль'}</DialogTitle>
            <DialogDescription>{editingRoleId ? 'Изменение параметров и разрешений роли' : 'Создание пользовательской роли с назначением разрешений'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">Название роли *</Label><Input value={roleFormName} onChange={e => setRoleFormName(e.target.value)} placeholder="Название роли" /></div>
              <div className="space-y-2"><Label className="text-xs">Макс. сессий</Label><Input type="number" value={roleFormMaxSessions} onChange={e => setRoleFormMaxSessions(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Описание</Label><Textarea value={roleFormDesc} onChange={e => setRoleFormDesc(e.target.value)} rows={2} /></div>
            <div className="space-y-2">
              <Label className="text-xs">Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {['red', 'orange', 'amber', 'emerald', 'sky', 'slate', 'violet', 'teal', 'fuchsia', 'pink'].map(c => (
                  <button
                    key={c}
                    className={cn('h-7 w-7 rounded-full border-2 transition-all', roleFormColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105', getRoleDotColor(c))}
                    onClick={() => setRoleFormColor(c)}
                  />
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Разрешения ({roleFormPermissions.length})</p>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setRoleFormPermissions(roleFormPermissions.length === PERMISSIONS.length ? [] : PERMISSIONS.map(p => p.id))}>
                {roleFormPermissions.length === PERMISSIONS.length ? 'Снять все' : 'Выбрать все'}
              </Button>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2 pr-2">
                {PERMISSION_CATEGORIES.map(cat => {
                  const catPerms = PERMISSIONS.filter(p => p.category === cat.id);
                  const catSelected = catPerms.every(p => roleFormPermissions.includes(p.id));
                  return (
                    <div key={cat.id} className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={catSelected} onCheckedChange={(checked) => {
                          if (checked) {
                            const ids = catPerms.map(p => p.id);
                            setRoleFormPermissions(prev => [...new Set([...prev, ...ids])]);
                          } else {
                            setRoleFormPermissions(prev => prev.filter(p => !catPerms.some(cp => cp.id === p)));
                          }
                        }} />
                        <Label className="text-xs font-medium">{cat.label}</Label>
                        <Badge variant="outline" className="text-[9px] ml-auto">{catPerms.filter(p => roleFormPermissions.includes(p.id)).length}/{catPerms.length}</Badge>
                      </div>
                      {catPerms.map(perm => (
                        <div key={perm.id} className="flex items-center gap-2 ml-6">
                          <Checkbox
                            checked={roleFormPermissions.includes(perm.id)}
                            onCheckedChange={() => toggleRolePermission(perm.id)}
                          />
                          <Label className="text-xs">{perm.label}</Label>
                          <span className="text-[10px] text-muted-foreground hidden lg:inline">— {perm.description}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveRole} disabled={!roleFormName.trim()}>{editingRoleId ? 'Сохранить' : 'Создать'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirm */}
      <AlertDialog open={deleteRoleConfirmOpen} onOpenChange={setDeleteRoleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить роль?</AlertDialogTitle>
            <AlertDialogDescription>Вы уверены, что хотите удалить роль «{deleteRoleTarget?.label}»? Пользователям с этой ролью будет назначена роль «Наблюдатель».</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteRole}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* License Activation Dialog */}
      <Dialog open={licenseDialogOpen} onOpenChange={setLicenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Активация лицензии</DialogTitle>
            <DialogDescription>Введите лицензионный ключ для активации</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 rounded-lg border p-3 bg-muted/50">
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium">Отпечаток оборудования</p>
                <p className="font-mono text-xs text-muted-foreground">{license.fingerprint}</p>
              </div>
              <Fingerprint className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Режим активации</Label>
              <div className="flex gap-2">
                <Button variant={activationMode === 'online' ? 'default' : 'outline'} size="sm" className="flex-1 gap-1" onClick={() => setActivationMode('online')}><Wifi className="h-3 w-3" />Онлайн</Button>
                <Button variant={activationMode === 'offline' ? 'default' : 'outline'} size="sm" className="flex-1 gap-1" onClick={() => setActivationMode('offline')}><Database className="h-3 w-3" />Офлайн</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Лицензионный ключ *</Label>
              <div className="relative">
                <Input
                  value={licenseKeyInput}
                  onChange={e => setLicenseKeyInput(formatLicenseKey(e.target.value))}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                  className="font-mono text-sm"
                />
                {licenseKeyInput && validateLicenseKey(licenseKeyInput) && <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
              </div>
              <p className="text-[10px] text-muted-foreground">Формат: 6 групп по 4 символа (XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)</p>
            </div>
            {activationMode === 'offline' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600">
                <p className="font-medium">Офлайн активация</p>
                <p className="text-muted-foreground mt-0.5">Скопируйте отпечаток оборудования и отправьте его вместе с лицензионным ключом на support@promavtomatika.ru</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLicenseDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleActivateLicense} disabled={!validateLicenseKey(licenseKeyInput)}>Активировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* License Deactivation Confirm */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertOctagon className="h-5 w-5 text-red-500" />Деактивировать лицензию?</AlertDialogTitle>
            <AlertDialogDescription>После деактивации все функции Enterprise будут недоступны. Для повторной активации потребуется новый лицензионный ключ.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeactivateLicense}>Деактивировать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* License Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Передача лицензии</DialogTitle>
            <DialogDescription>Передача лицензии на другое устройство</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600">
              <p className="font-medium">Внимание</p>
              <p className="text-muted-foreground mt-0.5">После передачи лицензия будет деактивирована на текущем устройстве. Введите отпечаток оборудования целевого устройства.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Отпечаток целевого устройства *</Label>
              <Input value={transferTargetFingerprint} onChange={e => setTransferTargetFingerprint(e.target.value)} placeholder="HW-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX" className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleTransferLicense} disabled={!transferTargetFingerprint.trim()}>Передать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated API Key Dialog */}
      <Dialog open={showNewApiKey} onOpenChange={setShowNewApiKey}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>API ключ создан</DialogTitle>
            <DialogDescription>Сохраните этот ключ. Он больше не будет отображаться.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <Input value={generatedApiKey} readOnly className="font-mono text-xs flex-1" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(generatedApiKey); showSaved('security'); }}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewApiKey(false)}>Понятно</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

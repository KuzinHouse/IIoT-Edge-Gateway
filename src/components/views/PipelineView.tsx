'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import React from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Layers, Shuffle, Filter,
  Calculator, Code, Radio, Globe, Wifi, FileText, Bell, Timer,
  Plus, Trash2, Play, Square, Save, Settings, ChevronDown,
  ZoomIn, ZoomOut, X, Zap, Activity, GripVertical, Pencil,
  LayoutTemplate, Search
} from 'lucide-react';
import {
  PIPELINE_TEMPLATES, PIPELINE_TEMPLATE_CATEGORIES,
  createPipelineFromTemplate, searchTemplates, getTemplatesByCategory,
  type PipelineTemplate,
} from '@/lib/pipeline-templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/* ================================================================
   TYPES
   ================================================================ */

interface PipelineNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Record<string, string | number | boolean>;
  inputs: string[];
  outputs: string[];
}

interface PipelineEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

interface Pipeline {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

interface LogEntry {
  time: string;
  nodeId: string | null;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NodeDef {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  inputs: number;
  outputs: number;
  defaultConfig: Record<string, string | number | boolean>;
}

/* ================================================================
   NODE DEFINITIONS
   ================================================================ */

const NODE_CATEGORIES: { name: string; nodes: NodeDef[] }[] = [
  {
    name: 'Узлы данных',
    nodes: [
      {
        type: 'south-device-source', label: 'Источник устройства',
        description: 'Чтение данных с южного устройства',
        icon: <ArrowDownToLine className="h-4 w-4" />, color: '#3b82f6',
        inputs: 0, outputs: 1,
        defaultConfig: { device: 'plc-1', pollInterval: 1000, tagGroup: 'temperature' },
      },
      {
        type: 'tag-reader', label: 'Чтение тегов',
        description: 'Чтение конкретных тегов',
        icon: <Layers className="h-4 w-4" />, color: '#6366f1',
        inputs: 0, outputs: 1,
        defaultConfig: { tags: 'temp-1, temp-2', scanRate: 500 },
      },
      {
        type: 'data-transform', label: 'Преобразование',
        description: 'Преобразование данных',
        icon: <Shuffle className="h-4 w-4" />, color: '#f97316',
        inputs: 1, outputs: 1,
        defaultConfig: { transformType: 'multiply', param1: 1.0 },
      },
      {
        type: 'filter', label: 'Фильтр',
        description: 'Фильтрация данных по условиям',
        icon: <Filter className="h-4 w-4" />, color: '#06b6d4',
        inputs: 1, outputs: 1,
        defaultConfig: { field: 'value', condition: '>', value: 0 },
      },
      {
        type: 'aggregator', label: 'Агрегатор',
        description: 'Агрегация данных (ср., сумма, мин, макс)',
        icon: <Calculator className="h-4 w-4" />, color: '#eab308',
        inputs: 1, outputs: 1,
        defaultConfig: { function: 'avg', windowSize: 10, groupBy: 'device' },
      },
      {
        type: 'script', label: 'Скрипт',
        description: 'Обработка JavaScript',
        icon: <Code className="h-4 w-4" />, color: '#a855f7',
        inputs: 1, outputs: 1,
        defaultConfig: { code: '// JavaScript код\nreturn data;' },
      },
    ],
  },
  {
    name: 'Вывод данных',
    nodes: [
      {
        type: 'mqtt-publish', label: 'MQTT Публикация',
        description: 'Публикация в MQTT топик',
        icon: <Radio className="h-4 w-4" />, color: '#22c55e',
        inputs: 1, outputs: 0,
        defaultConfig: { topic: 'neuron/data', qos: 0, retain: false },
      },
      {
        type: 'http-push', label: 'HTTP Отправка',
        description: 'POST на HTTP endpoint',
        icon: <Globe className="h-4 w-4" />, color: '#14b8a6',
        inputs: 1, outputs: 0,
        defaultConfig: { url: 'http://localhost:8080/api', method: 'POST', headers: '{}' },
      },
      {
        type: 'kafka-producer', label: 'Kafka Продюсер',
        description: 'Отправка в Kafka',
        icon: <ArrowUpFromLine className="h-4 w-4" />, color: '#f43f5e',
        inputs: 1, outputs: 0,
        defaultConfig: { topic: 'neuron-data', keyField: 'tag', partitionStrategy: 'round-robin' },
      },
      {
        type: 'websocket', label: 'WebSocket',
        description: 'Отправка через WebSocket',
        icon: <Wifi className="h-4 w-4" />, color: '#8b5cf6',
        inputs: 1, outputs: 0,
        defaultConfig: { url: 'ws://localhost:8080/ws' },
      },
    ],
  },
  {
    name: 'Служебные',
    nodes: [
      {
        type: 'logger', label: 'Журнал',
        description: 'Запись данных в журнал',
        icon: <FileText className="h-4 w-4" />, color: '#64748b',
        inputs: 1, outputs: 1,
        defaultConfig: { logLevel: 'info', maxEntries: 1000 },
      },
      {
        type: 'alarm-check', label: 'Проверка аварий',
        description: 'Оценка условий аварии',
        icon: <Bell className="h-4 w-4" />, color: '#ef4444',
        inputs: 1, outputs: 1,
        defaultConfig: { tag: 'temp-1', condition: '>', setpoint: 100, deadband: 1.0 },
      },
      {
        type: 'delay', label: 'Задержка',
        description: 'Задержка потока данных',
        icon: <Timer className="h-4 w-4" />, color: '#78716c',
        inputs: 1, outputs: 1,
        defaultConfig: { delayMs: 1000 },
      },
    ],
  },
];

/* ================================================================
   NODE LOOKUP HELPERS
   ================================================================ */

const nodeDefMap = new Map<string, NodeDef>();
NODE_CATEGORIES.forEach(cat => cat.nodes.forEach(n => nodeDefMap.set(n.type, n)));

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;
const HANDLE_R = 6;

function getNodeColor(type: string): string {
  return nodeDefMap.get(type)?.color ?? '#6b7280';
}

function getNodeIcon(type: string): React.ReactNode {
  return nodeDefMap.get(type)?.icon ?? <Settings className="h-4 w-4" />;
}

function getNodeLabel(type: string): string {
  return nodeDefMap.get(type)?.label ?? type;
}

function getHandlePos(
  node: PipelineNode, isOutput: boolean, index: number,
) {
  const handles = isOutput ? node.outputs : node.inputs;
  const total = handles.length;
  if (total === 0) {
    return { x: isOutput ? node.x + NODE_WIDTH : node.x, y: node.y + NODE_HEIGHT / 2 };
  }
  const spacing = NODE_HEIGHT / (total + 1);
  return {
    x: isOutput ? node.x + NODE_WIDTH : node.x,
    y: node.y + spacing * (index + 1),
  };
}

function findHandleIdx(handles: string[], name: string): number {
  const i = handles.indexOf(name);
  return i >= 0 ? i : 0;
}

function buildBezier(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx;
  const cp = Math.max(60, Math.abs(dx) * 0.5);
  return `M ${sx} ${sy} C ${sx + cp} ${sy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
}

function timeNow(): string {
  return new Date().toLocaleTimeString('ru-RU');
}

/* ================================================================
   MOCK PIPELINES
   ================================================================ */

const MOCK_PIPELINES: Pipeline[] = [
  {
    id: 'pipe-1',
    name: 'Modbus → MQTT Bridge',
    status: 'running',
    nodes: [
      {
        id: 's1-n1', type: 'south-device-source', label: 'Modbus PLC-1',
        x: 80, y: 160, inputs: [], outputs: ['output-0'],
        config: { device: 'plc-1', pollInterval: 1000, tagGroup: 'temperature' },
      },
      {
        id: 's1-n2', type: 'tag-reader', label: 'Теги температуры',
        x: 340, y: 160, inputs: ['input-0'], outputs: ['output-0'],
        config: { tags: 'temp-1, temp-2, temp-3', scanRate: 500 },
      },
      {
        id: 's1-n3', type: 'mqtt-publish', label: 'MQTT Топик',
        x: 600, y: 160, inputs: ['input-0'], outputs: [],
        config: { topic: 'neuron/temperature/data', qos: 1, retain: false },
      },
    ],
    edges: [
      { id: 's1-e1', source: 's1-n1', sourceHandle: 'output-0', target: 's1-n2', targetHandle: 'input-0' },
      { id: 's1-e2', source: 's1-n2', sourceHandle: 'output-0', target: 's1-n3', targetHandle: 'input-0' },
    ],
  },
  {
    id: 'pipe-2',
    name: 'Данные telemetry → Kafka',
    status: 'stopped',
    nodes: [
      {
        id: 's2-n1', type: 'south-device-source', label: 'S7 Устройство',
        x: 40, y: 180, inputs: [], outputs: ['output-0'],
        config: { device: 's7-plc', pollInterval: 2000, tagGroup: 'telemetry' },
      },
      {
        id: 's2-n2', type: 'data-transform', label: 'Масштабирование',
        x: 280, y: 180, inputs: ['input-0'], outputs: ['output-0'],
        config: { transformType: 'scale', param1: 0.1 },
      },
      {
        id: 's2-n3', type: 'aggregator', label: 'Среднее значение',
        x: 520, y: 180, inputs: ['input-0'], outputs: ['output-0'],
        config: { function: 'avg', windowSize: 10, groupBy: 'device' },
      },
      {
        id: 's2-n4', type: 'kafka-producer', label: 'Kafka Топик',
        x: 760, y: 180, inputs: ['input-0'], outputs: [],
        config: { topic: 'neuron-telemetry', keyField: 'tag', partitionStrategy: 'by-key' },
      },
    ],
    edges: [
      { id: 's2-e1', source: 's2-n1', sourceHandle: 'output-0', target: 's2-n2', targetHandle: 'input-0' },
      { id: 's2-e2', source: 's2-n2', sourceHandle: 'output-0', target: 's2-n3', targetHandle: 'input-0' },
      { id: 's2-e3', source: 's2-n3', sourceHandle: 'output-0', target: 's2-n4', targetHandle: 'input-0' },
    ],
  },
  {
    id: 'pipe-3',
    name: 'Аварийная обработка',
    status: 'error',
    nodes: [
      {
        id: 's3-n1', type: 'tag-reader', label: 'Теги аварий',
        x: 60, y: 200, inputs: [], outputs: ['output-0'],
        config: { tags: 'alarm-temp-1, alarm-pressure-1', scanRate: 200 },
      },
      {
        id: 's3-n2', type: 'alarm-check', label: 'Проверка аварий',
        x: 320, y: 200, inputs: ['input-0'], outputs: ['output-0'],
        config: { tag: 'alarm-temp-1', condition: '>', setpoint: 100, deadband: 1.0 },
      },
      {
        id: 's3-n3', type: 'logger', label: 'Журнал аварий',
        x: 580, y: 120, inputs: ['input-0'], outputs: ['output-0'],
        config: { logLevel: 'warning', maxEntries: 5000 },
      },
      {
        id: 's3-n4', type: 'mqtt-publish', label: 'MQTT Оповещения',
        x: 580, y: 300, inputs: ['input-0'], outputs: [],
        config: { topic: 'neuron/alarms/alerts', qos: 2, retain: true },
      },
    ],
    edges: [
      { id: 's3-e1', source: 's3-n1', sourceHandle: 'output-0', target: 's3-n2', targetHandle: 'input-0' },
      { id: 's3-e2', source: 's3-n2', sourceHandle: 'output-0', target: 's3-n3', targetHandle: 'input-0' },
      { id: 's3-e3', source: 's3-n2', sourceHandle: 'output-0', target: 's3-n4', targetHandle: 'input-0' },
    ],
  },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function PipelineView() {
  /* ---- state ---- */
  const [pipelines, setPipelines] = useState<Pipeline[]>(MOCK_PIPELINES);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(MOCK_PIPELINES[0]?.id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('-');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testLog, setTestLog] = useState<LogEntry[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string; handle: string; isOutput: boolean;
  } | null>(null);
  const [mouseCanvas, setMouseCanvas] = useState({ x: 0, y: 0 });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const testRunTimersRef = useRef<NodeJS.Timeout[]>([]);

  /* ---- derived ---- */
  const activePipeline = pipelines.find(p => p.id === selectedPipelineId) ?? null;
  const nodes = activePipeline?.nodes ?? [];
  const edges = activePipeline?.edges ?? [];
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  /* ---- helpers ---- */
  const cfg = (node: PipelineNode, key: string, fallback: string | number | boolean = '') =>
    node.config?.[key] ?? fallback;

  const updatePipeline = useCallback((pid: string, updater: (p: Pipeline) => Pipeline) => {
    setPipelines(prev => prev.map(p => p.id === pid ? updater(p) : p));
  }, []);

  const updateActivePipeline = useCallback((updater: (p: Pipeline) => Pipeline) => {
    if (!selectedPipelineId) return;
    updatePipeline(selectedPipelineId, updater);
  }, [selectedPipelineId, updatePipeline]);

  /* ---- pipeline CRUD ---- */
  const handleCreatePipeline = useCallback(() => {
    const id = `pipe-${Date.now()}`;
    const newPipeline: Pipeline = {
      id, name: `Пайплайн ${pipelines.length + 1}`, status: 'stopped', nodes: [], edges: [],
    };
    setPipelines(prev => [...prev, newPipeline]);
    setSelectedPipelineId(id);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTestLog([]);
  }, [pipelines.length]);

  const handleDeletePipeline = useCallback(() => {
    if (!selectedPipelineId) return;
    setPipelines(prev => prev.filter(p => p.id !== selectedPipelineId));
    setSelectedPipelineId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTestLog([]);
    setDeleteDialogOpen(false);
  }, [selectedPipelineId]);

  const handleRenamePipeline = useCallback(() => {
    if (!nameDraft.trim() || !selectedPipelineId) return;
    updateActivePipeline(p => ({ ...p, name: nameDraft.trim() }));
    setEditingName(false);
  }, [nameDraft, selectedPipelineId, updateActivePipeline]);

  const handleSave = useCallback(() => {
    setLastSaved(timeNow());
  }, []);

  const handleToggleStatus = useCallback(() => {
    if (!selectedPipelineId) return;
    updateActivePipeline(p => {
      if (p.status === 'running') return { ...p, status: 'stopped' };
      return { ...p, status: 'running' };
    });
  }, [selectedPipelineId, updateActivePipeline]);

  /* ---- node ops ---- */
  const handleAddNode = useCallback((type: string, x: number, y: number) => {
    const def = nodeDefMap.get(type);
    if (!def) return;
    const inputs = Array.from({ length: def.inputs }, (_, i) => `input-${i}`);
    const outputs = Array.from({ length: def.outputs }, (_, i) => `output-${i}`);
    const newNode: PipelineNode = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, label: def.label, x, y, inputs, outputs,
      config: { ...def.defaultConfig },
    };
    updateActivePipeline(p => ({ ...p, nodes: [...p.nodes, newNode] }));
  }, [updateActivePipeline]);

  const handleMoveNode = useCallback((id: string, x: number, y: number) => {
    updateActivePipeline(p => ({
      ...p,
      nodes: p.nodes.map(n => (n.id === id ? { ...n, x, y } : n)),
    }));
  }, [updateActivePipeline]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) {
      updateActivePipeline(p => ({
        ...p,
        nodes: p.nodes.filter(n => n.id !== selectedNodeId),
        edges: p.edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId),
      }));
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      updateActivePipeline(p => ({
        ...p,
        edges: p.edges.filter(e => e.id !== selectedEdgeId),
      }));
      setSelectedEdgeId(null);
    }
  }, [selectedNodeId, selectedEdgeId, updateActivePipeline]);

  const handleUpdateNodeConfig = useCallback((nodeId: string, key: string, value: string | number | boolean) => {
    updateActivePipeline(p => ({
      ...p,
      nodes: p.nodes.map(n =>
        n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n,
      ),
    }));
  }, [updateActivePipeline]);

  const handleUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    updateActivePipeline(p => ({
      ...p,
      nodes: p.nodes.map(n => n.id === nodeId ? { ...n, label } : n),
    }));
  }, [updateActivePipeline]);

  /* ---- edge ops ---- */
  const handleAddEdge = (source: string, sourceHandle: string, target: string, targetHandle: string) => {
    const exists = edges.some(
      e => e.source === source && e.sourceHandle === sourceHandle &&
        e.target === target && e.targetHandle === targetHandle,
    );
    if (exists || source === target) return;
    updateActivePipeline(p => ({
      ...p,
      edges: [...p.edges, {
        id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source, sourceHandle, target, targetHandle,
      }],
    }));
  };

  /* ---- canvas mouse events ---- */
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const sx = pan.x + node.x * zoom;
    const sy = pan.y + node.y * zoom;
    setDragNodeId(nodeId);
    setDragOffset({ x: e.clientX - sx, y: e.clientY - sy });
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).dataset.bg) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  const handleOutputMouseDown = (e: React.MouseEvent, nodeId: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom({ nodeId, handle, isOutput: true });
  };

  const handleInputMouseUp = (e: React.MouseEvent, nodeId: string, handle: string) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom.nodeId !== nodeId) {
      if (connectingFrom.isOutput) {
        handleAddEdge(connectingFrom.nodeId, connectingFrom.handle, nodeId, handle);
      }
    }
    setConnectingFrom(null);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
      if (dragNodeId) {
        const nx = (e.clientX - pan.x - dragOffset.x) / zoom;
        const ny = (e.clientY - pan.y - dragOffset.y) / zoom;
        handleMoveNode(dragNodeId, nx, ny);
      }
      if (connectingFrom && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMouseCanvas({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        });
      }
    };
    const onUp = () => {
      setIsPanning(false);
      setDragNodeId(null);
      setConnectingFrom(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isPanning, panStart, dragNodeId, dragOffset, pan, zoom, connectingFrom, handleMoveNode]);

  /* ---- drop from palette ---- */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType');
    if (!nodeType || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left - pan.x) / zoom - NODE_WIDTH / 2;
    const cy = (e.clientY - rect.top - pan.y) / zoom - NODE_HEIGHT / 2;
    handleAddNode(nodeType, cx, cy);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedEdgeId)) {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, selectedEdgeId, handleDeleteSelected]);

  /* ---- test run ---- */
  const handleTestRun = () => {
    if (isTestRunning || nodes.length === 0) return;
    setIsTestRunning(true);
    setTestLog([]);
    testRunTimersRef.current.forEach(t => clearTimeout(t));
    testRunTimersRef.current = [];

    const sorted = [...nodes].sort((a, b) => a.x - b.x);
    sorted.forEach((node, idx) => {
      const t = setTimeout(() => {
        const typeLabel = getNodeLabel(node.type);
        const values = Math.floor(Math.random() * 500) + 10;
        setTestLog(prev => [...prev, {
          time: timeNow(), nodeId: node.id,
          message: `→ ${node.label} (${typeLabel}): обработано ${values} значений`,
          type: 'info',
        }]);
        if (idx === sorted.length - 1) {
          const t2 = setTimeout(() => {
            setTestLog(prev => [...prev, {
              time: timeNow(), nodeId: null,
              message: '✓ Тестовый запуск завершён успешно',
              type: 'success',
            }]);
            setIsTestRunning(false);
          }, 800);
          testRunTimersRef.current.push(t2);
        }
      }, (idx + 1) * 1200);
      testRunTimersRef.current.push(t);
    });
  };

  useEffect(() => {
    return () => { testRunTimersRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ======== TOP TOOLBAR ======== */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0 flex-wrap">
        <Button size="sm" className="gap-1.5" onClick={handleCreatePipeline}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Создать пайплайн</span>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setTemplateDialogOpen(true); setTemplateSearch(''); setTemplateCategory('all'); setSelectedTemplate(null); }}>
              <LayoutTemplate className="h-4 w-4" />
              <span className="hidden sm:inline">Из шаблона</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Создать пайплайн из готового шаблона</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Pipeline selector */}
        <Select value={selectedPipelineId ?? ''} onValueChange={(v) => {
          setSelectedPipelineId(v);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setTestLog([]);
          setShowPalette(true);
        }}>
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder="Выберите пайплайн" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Inline editable name */}
        {activePipeline && (
          <>
            {editingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenamePipeline(); if (e.key === 'Escape') setEditingName(false); }}
                  onBlur={handleRenamePipeline}
                  className="h-8 w-44 text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => { setEditingName(true); setNameDraft(activePipeline.name); }}
                className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {activePipeline.name}
                <Pencil className="h-3 w-3 opacity-40" />
              </button>
            )}

            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                activePipeline.status === 'running' && 'bg-green-500/10 text-green-500 border-green-500/30',
                activePipeline.status === 'error' && 'bg-red-500/10 text-red-500 border-red-500/30',
                activePipeline.status === 'stopped' && 'bg-muted text-muted-foreground',
              )}
            >
              {activePipeline.status === 'running' ? 'Запущен' : activePipeline.status === 'error' ? 'Ошибка' : 'Остановлен'}
            </Badge>

            <Button
              variant={activePipeline.status === 'running' ? 'destructive' : 'default'}
              size="icon" className="h-8 w-8"
              onClick={handleToggleStatus}
            >
              {activePipeline.status === 'running' ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}

        <div className="flex-1" />

        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} disabled={!activePipeline}>
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Сохранить</span>
        </Button>
        <Button
          variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
          disabled={!activePipeline}
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* ======== MAIN AREA ======== */}
      <div className="flex flex-1 overflow-hidden">
        {/* --- LEFT PANEL: Node Palette --- */}
        {activePipeline && showPalette && (
          <div className="hidden md:flex w-[260px] border-r border-border bg-muted/20 flex-col shrink-0">
            <div className="px-3 py-2 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Палитра узлов
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-3">
                {NODE_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                      {cat.name}
                    </p>
                    <div className="space-y-1">
                      {cat.nodes.map(node => (
                        <div
                          key={node.type}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('nodeType', node.type);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="group flex items-center gap-2 p-2 rounded-lg bg-background border border-border cursor-grab hover:border-primary/40 hover:shadow-sm transition-all active:cursor-grabbing select-none"
                        >
                          <div
                            className="p-1.5 rounded shrink-0 text-white"
                            style={{ backgroundColor: node.color }}
                          >
                            {node.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{node.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{node.description}</p>
                          </div>
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* --- CENTER: Canvas or Empty State --- */}
        {!activePipeline ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                <Activity className="h-10 w-10 opacity-30" />
              </div>
              <p className="text-lg font-medium mb-1">Нет выбранного пайплайна</p>
              <p className="text-sm opacity-60 mb-4">Создайте первый пайплайн или выберите существующий</p>
              <Button onClick={handleCreatePipeline} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Создать пайплайн
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Canvas toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-card/50 shrink-0">
              <Button
                variant="ghost" size="icon" className="h-7 w-7 md:hidden"
                onClick={() => setShowPalette(!showPalette)}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-5 md:hidden" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                <Activity className="h-3.5 w-3.5" />
              </Button>
              <div className="flex-1" />
              <span className="text-[11px] text-muted-foreground">
                {nodes.length} узлов · {edges.length} связей
              </span>
              <Separator orientation="vertical" className="h-5" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                // Auto-layout nodes in a horizontal flow
                if (!selectedPipelineId) return;
                updateActivePipeline(p => {
                  const sorted = [...p.nodes].sort((a, b) => {
                    const aIn = a.inputs.length === 0 ? 0 : 1;
                    const bIn = b.inputs.length === 0 ? 0 : 1;
                    return aIn - bIn || a.x - b.x;
                  });
                  const updated = sorted.map((node, idx) => ({
                    ...node,
                    x: 60 + idx * 220,
                    y: 160 + (idx % 2) * 80,
                  }));
                  return { ...p, nodes: updated };
                });
              }}>
                <Shuffle className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Canvas */}
            <div
              ref={containerRef}
              className="flex-1 relative overflow-hidden bg-background"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onMouseDown={handleCanvasMouseDown}
            >
              {/* Dot grid */}
              <div
                data-bg="1"
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.12) 1px, transparent 1px)',
                  backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                  backgroundPosition: `${pan.x}px ${pan.y}px`,
                }}
              />

              <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                <defs>
                  <marker id="edge-arrow" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="10" markerHeight="8" orient="auto">
                    <path d="M 0 0 L 10 4 L 0 8 Z" fill="#64748b" />
                  </marker>
                  <marker id="edge-arrow-selected" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="10" markerHeight="8" orient="auto">
                    <path d="M 0 0 L 10 4 L 0 8 Z" fill="#22c55e" />
                  </marker>
                </defs>
                {/* Edges */}
                {edges.map(edge => {
                  const src = nodes.find(n => n.id === edge.source);
                  const tgt = nodes.find(n => n.id === edge.target);
                  if (!src || !tgt) return null;
                  const si = findHandleIdx(src.outputs, edge.sourceHandle);
                  const ti = findHandleIdx(tgt.inputs, edge.targetHandle);
                  const sp = getHandlePos(src, true, si);
                  const tp = getHandlePos(tgt, false, ti);
                  const path = buildBezier(sp.x, sp.y, tp.x, tp.y);
                  const isSel = selectedEdgeId === edge.id;
                  return (
                    <g key={edge.id}>
                      <path d={path} fill="transparent" stroke="transparent" strokeWidth={16} className="cursor-pointer"
                        onClick={e => { e.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(null); }} />
                      <path d={path} fill="none"
                        stroke={isSel ? '#22c55e' : '#94a3b8'}
                        strokeWidth={isSel ? 3.5 : 2.5}
                        strokeLinecap="round"
                        markerEnd={isSel ? 'url(#edge-arrow-selected)' : 'url(#edge-arrow)'}
                        className={cn('pointer-events-none', isSel && 'animate-pulse')} />
                      <circle cx={sp.x} cy={sp.y} r={5}
                        fill={isSel ? '#22c55e' : '#94a3b8'} stroke="hsl(var(--background))" strokeWidth={2} className="pointer-events-none" />
                      <circle cx={tp.x} cy={tp.y} r={5}
                        fill={isSel ? '#22c55e' : '#94a3b8'} stroke="hsl(var(--background))" strokeWidth={2} className="pointer-events-none" />
                    </g>
                  );
                })}

                {/* Connecting temp line */}
                {connectingFrom && (() => {
                  const src = nodes.find(n => n.id === connectingFrom.nodeId);
                  if (!src) return null;
                  const si = findHandleIdx(connectingFrom.isOutput ? src.outputs : src.inputs, connectingFrom.handle);
                  const sp = getHandlePos(src, connectingFrom.isOutput, si);
                  return (
                    <path d={buildBezier(sp.x, sp.y, mouseCanvas.x, mouseCanvas.y)}
                      fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="6,4" className="pointer-events-none" />
                  );
                })()}

                {/* Nodes */}
                {nodes.map(node => {
                  const isSel = selectedNodeId === node.id;
                  const color = getNodeColor(node.type);
                  const icon = getNodeIcon(node.type);
                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseDown={e => handleNodeMouseDown(e, node.id)}>
                      {isSel && <rect x={-3} y={-3} width={NODE_WIDTH + 6} height={NODE_HEIGHT + 6} rx={11} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} opacity={0.35} />}
                      <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={8}
                        fill="hsl(var(--card))" stroke={isSel ? 'hsl(var(--primary))' : color} strokeWidth={isSel ? 2 : 1.5} className="transition-all" />
                      <rect width={NODE_WIDTH} height={4} rx={8} fill={color} />
                      <rect y={2} width={NODE_WIDTH} height={2} fill={color} />
                      <foreignObject width={NODE_WIDTH - 16} height={NODE_HEIGHT} x={8} y={4}>
                        <div className="flex items-center gap-2 h-full">
                          <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                            <div style={{ color }}>{icon}</div>
                          </div>
                          <span className="text-[11px] font-medium text-foreground truncate leading-tight">{node.label}</span>
                        </div>
                      </foreignObject>
                      {node.inputs.map((h, i) => {
                        const pos = getHandlePos(node, false, i);
                        return (
                          <circle key={h} cx={pos.x - node.x} cy={pos.y - node.y} r={HANDLE_R}
                            fill="hsl(var(--background))" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5}
                            className="cursor-crosshair hover:fill-primary hover:stroke-primary transition-colors"
                            onMouseDown={e => e.stopPropagation()} onMouseUp={e => handleInputMouseUp(e, node.id, h)} />
                        );
                      })}
                      {node.outputs.map((h, i) => {
                        const pos = getHandlePos(node, true, i);
                        return (
                          <circle key={h} cx={pos.x - node.x} cy={pos.y - node.y} r={HANDLE_R}
                            fill="hsl(var(--background))" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5}
                            className="cursor-crosshair hover:fill-primary hover:stroke-primary transition-colors"
                            onMouseDown={e => handleOutputMouseDown(e, node.id, h)} />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>

              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-muted-foreground">
                    <Zap className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium opacity-60">Перетащите узлы из палитры на холст</p>
                  </div>
                </div>
              )}
            </div>

            {/* ---- Bottom Bar ---- */}
            <div className="border-t border-border bg-card/80 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-[11px] text-muted-foreground">Сохранено: {lastSaved}</span>
                <div className="flex-1" />
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={handleTestRun} disabled={isTestRunning || nodes.length === 0}>
                  {isTestRunning ? (
                    <><span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Выполнение...</>
                  ) : (
                    <><Zap className="h-3 w-3" /> Тестовый запуск</>
                  )}
                </Button>
              </div>
              {testLog.length > 0 && (
                <ScrollArea className="max-h-28 border-t border-border">
                  <div className="px-3 py-1.5 space-y-0.5">
                    {testLog.map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className="text-muted-foreground shrink-0 font-mono">{entry.time}</span>
                        <span className={cn(
                          entry.type === 'success' && 'text-green-500',
                          entry.type === 'warning' && 'text-amber-500',
                          entry.type === 'error' && 'text-red-500',
                          entry.type === 'info' && 'text-foreground/80',
                        )}>{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {/* --- RIGHT PANEL: Node Config --- */}
        {selectedNode && activePipeline && (
          <div className="hidden lg:flex w-[300px] border-l border-border bg-muted/10 flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded text-white" style={{ backgroundColor: getNodeColor(selectedNode.type) }}>
                  {getNodeIcon(selectedNode.type)}
                </div>
                <span className="text-sm font-medium truncate">{getNodeLabel(selectedNode.type)}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedNodeId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Label */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Имя узла</Label>
                  <Input
                    value={selectedNode.label}
                    onChange={e => handleUpdateNodeLabel(selectedNode.id, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <Separator />

                {/* Type-specific config */}
                <NodeConfigForm node={selectedNode} onUpdate={(key, val) => handleUpdateNodeConfig(selectedNode.id, key, val)} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* ======== TEMPLATE DIALOG ======== */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) setSelectedTemplate(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Шаблоны пайплайнов
            </DialogTitle>
            <DialogDescription>
              Выберите готовый шаблон для быстрого создания IoT пайплайна
            </DialogDescription>
          </DialogHeader>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск шаблонов..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant={templateCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => setTemplateCategory('all')}
              >
                Все
              </Badge>
              {PIPELINE_TEMPLATE_CATEGORIES.map(cat => (
                <Badge
                  key={cat.id}
                  variant={templateCategory === cat.id ? 'default' : 'outline'}
                  className="cursor-pointer select-none gap-1"
                  onClick={() => setTemplateCategory(cat.id)}
                >
                  {cat.icon}
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            {/* Templates grid */}
            <ScrollArea className="flex-1">
              <div className="grid gap-3 pr-3 py-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {(() => {
                  let filtered = templateCategory === 'all'
                    ? PIPELINE_TEMPLATES
                    : getTemplatesByCategory(templateCategory);
                  if (templateSearch.trim()) {
                    filtered = searchTemplates(templateSearch);
                    if (templateCategory !== 'all') {
                      filtered = filtered.filter(t => t.category === templateCategory);
                    }
                  }
                  if (filtered.length === 0) {
                    return (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Шаблоны не найдены</p>
                      </div>
                    );
                  }
                  return filtered.map(tpl => {
                    const cat = PIPELINE_TEMPLATE_CATEGORIES.find(c => c.id === tpl.category);
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl)}
                        className={cn(
                          'group relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                          selectedTemplate?.id === tpl.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-card hover:border-primary/30',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg text-white shrink-0"
                            style={{ backgroundColor: tpl.iconColor }}
                          >
                            {tpl.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{tpl.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tpl.description}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {cat && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                  {cat.icon}
                                  {cat.name}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {tpl.nodes.length} узл.
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {tpl.edges.length} связ.
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </ScrollArea>

            {/* Template Detail Panel */}
            {selectedTemplate && (
              <div className="w-[260px] border-l border-border bg-muted/20 p-3 hidden md:flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="p-2 rounded-lg text-white"
                    style={{ backgroundColor: selectedTemplate.iconColor }}
                  >
                    {selectedTemplate.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedTemplate.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedTemplate.nodes.length} узлов · {selectedTemplate.edges.length} связей
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{selectedTemplate.description}</p>

                <Separator />

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Узлы пайплайна</p>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-1.5">
                      {selectedTemplate.nodes.map((node, idx) => (
                        <div key={node.key} className="flex items-center gap-2 p-1.5 rounded bg-background border border-border text-xs">
                          <span className="text-muted-foreground font-mono w-4 text-center shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{node.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{node.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="mt-auto">
                  <Button
                    className="w-full gap-1.5"
                    onClick={() => {
                      const { nodes: newNodes, edges: newEdges } = createPipelineFromTemplate(selectedTemplate, `pipe-${Date.now()}`);
                      const newPipeline: Pipeline = {
                        id: `pipe-${Date.now()}`,
                        name: selectedTemplate.name,
                        status: 'stopped',
                        nodes: newNodes,
                        edges: newEdges,
                      };
                      setPipelines(prev => [...prev, newPipeline]);
                      setSelectedPipelineId(newPipeline.id);
                      setSelectedNodeId(null);
                      setSelectedEdgeId(null);
                      setTestLog([]);
                      setTemplateDialogOpen(false);
                      setSelectedTemplate(null);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Использовать шаблон
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile footer when template selected */}
          {selectedTemplate && (
            <DialogFooter className="md:hidden">
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedTemplate.nodes.length} узлов · {selectedTemplate.edges.length} связей</p>
                </div>
                <Button
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    const { nodes: newNodes, edges: newEdges } = createPipelineFromTemplate(selectedTemplate, `pipe-${Date.now()}`);
                    const newPipeline: Pipeline = {
                      id: `pipe-${Date.now()}`,
                      name: selectedTemplate.name,
                      status: 'stopped',
                      nodes: newNodes,
                      edges: newEdges,
                    };
                    setPipelines(prev => [...prev, newPipeline]);
                    setSelectedPipelineId(newPipeline.id);
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    setTestLog([]);
                    setTemplateDialogOpen(false);
                    setSelectedTemplate(null);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Создать
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ======== DELETE DIALOG ======== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пайплайн?</DialogTitle>
            <DialogDescription>
              Пайплайн &laquo;{activePipeline?.name}&raquo; будет удалён безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeletePipeline} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================
   NODE CONFIG FORM
   ================================================================ */

function NodeConfigForm({
  node, onUpdate,
}: {
  node: PipelineNode;
  onUpdate: (key: string, value: string | number | boolean) => void;
}) {
  const c = (key: string, fallback: string | number | boolean = '') => node.config?.[key] ?? fallback;

  switch (node.type) {
    case 'south-device-source':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Настройки устройства</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Устройство</Label>
            <Select value={String(c('device', 'plc-1'))} onValueChange={v => onUpdate('device', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plc-1">PLC-1 (Modbus TCP)</SelectItem>
                <SelectItem value="plc-2">PLC-2 (Modbus TCP)</SelectItem>
                <SelectItem value="s7-plc">S7 PLC (Siemens)</SelectItem>
                <SelectItem value="opcua-1">OPC UA Server</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Интервал опроса (мс)</Label>
            <Input type="number" value={Number(c('pollInterval', 1000))} onChange={e => onUpdate('pollInterval', Number(e.target.value))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Группа тегов</Label>
            <Select value={String(c('tagGroup', 'temperature'))} onValueChange={v => onUpdate('tagGroup', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="temperature">Температура</SelectItem>
                <SelectItem value="pressure">Давление</SelectItem>
                <SelectItem value="flow">Расход</SelectItem>
                <SelectItem value="all">Все теги</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'tag-reader':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Настройки чтения</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Теги (через запятую)</Label>
            <Input value={String(c('tags', ''))} onChange={e => onUpdate('tags', e.target.value)} className="h-8 text-sm" placeholder="tag-1, tag-2" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Частота сканирования (мс)</Label>
            <Input type="number" value={Number(c('scanRate', 500))} onChange={e => onUpdate('scanRate', Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
      );

    case 'data-transform':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Преобразование</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Тип преобразования</Label>
            <Select value={String(c('transformType', 'multiply'))} onValueChange={v => onUpdate('transformType', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiply">Умножение</SelectItem>
                <SelectItem value="offset">Смещение</SelectItem>
                <SelectItem value="scale">Масштабирование</SelectItem>
                <SelectItem value="map">Маппинг</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Параметр 1</Label>
            <Input type="number" step="0.01" value={Number(c('param1', 1))} onChange={e => onUpdate('param1', Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
      );

    case 'filter':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Условия фильтра</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Поле</Label>
            <Input value={String(c('field', 'value'))} onChange={e => onUpdate('field', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Условие</Label>
            <Select value={String(c('condition', '>'))} onValueChange={v => onUpdate('condition', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value=">">&gt;</SelectItem>
                <SelectItem value="<">&lt;</SelectItem>
                <SelectItem value="==">=</SelectItem>
                <SelectItem value="!=">≠</SelectItem>
                <SelectItem value=">=">≥</SelectItem>
                <SelectItem value="<=">≤</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Значение</Label>
            <Input type="number" step="0.01" value={Number(c('value', 0))} onChange={e => onUpdate('value', Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
      );

    case 'aggregator':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Агрегация</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Функция</Label>
            <Select value={String(c('function', 'avg'))} onValueChange={v => onUpdate('function', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avg">Среднее (avg)</SelectItem>
                <SelectItem value="sum">Сумма (sum)</SelectItem>
                <SelectItem value="min">Минимум (min)</SelectItem>
                <SelectItem value="max">Максимум (max)</SelectItem>
                <SelectItem value="count">Количество (count)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Окно (значений)</Label>
            <Input type="number" value={Number(c('windowSize', 10))} onChange={e => onUpdate('windowSize', Number(e.target.value))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Группировка по</Label>
            <Select value={String(c('groupBy', 'device'))} onValueChange={v => onUpdate('groupBy', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="device">Устройство</SelectItem>
                <SelectItem value="tag">Тег</SelectItem>
                <SelectItem value="group">Группа</SelectItem>
                <SelectItem value="none">Без группировки</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'script':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">JavaScript скрипт</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Код обработки</Label>
            <Textarea
              value={String(c('code', ''))}
              onChange={e => onUpdate('code', e.target.value)}
              className="min-h-[180px] text-xs font-mono"
              placeholder="// Доступна переменная: data&#10;// Возвратите: return data;"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Переменная <code className="bg-muted px-1 rounded">data</code> содержит входные данные. Используйте <code className="bg-muted px-1 rounded">return</code> для результата.
          </p>
        </div>
      );

    case 'mqtt-publish':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">MQTT Настройки</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Шаблон топика</Label>
            <Input value={String(c('topic', ''))} onChange={e => onUpdate('topic', e.target.value)} className="h-8 text-sm font-mono" placeholder="neuron/data/{device}" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">QoS</Label>
            <Select value={String(c('qos', 0))} onValueChange={v => onUpdate('qos', Number(v))}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">QoS 0 — At most once</SelectItem>
                <SelectItem value="1">QoS 1 — At least once</SelectItem>
                <SelectItem value="2">QoS 2 — Exactly once</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Retain</Label>
            <Switch checked={!!c('retain', false)} onCheckedChange={v => onUpdate('retain', v)} />
          </div>
        </div>
      );

    case 'http-push':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">HTTP Настройки</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input value={String(c('url', ''))} onChange={e => onUpdate('url', e.target.value)} className="h-8 text-sm font-mono" placeholder="http://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Метод</Label>
            <Select value={String(c('method', 'POST'))} onValueChange={v => onUpdate('method', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Заголовки (JSON)</Label>
            <Textarea value={String(c('headers', '{}'))} onChange={e => onUpdate('headers', e.target.value)} className="min-h-[80px] text-xs font-mono" />
          </div>
        </div>
      );

    case 'kafka-producer':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Kafka Настройки</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Топик</Label>
            <Input value={String(c('topic', ''))} onChange={e => onUpdate('topic', e.target.value)} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ключ (поле)</Label>
            <Input value={String(c('keyField', ''))} onChange={e => onUpdate('keyField', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Стратегия партицирования</Label>
            <Select value={String(c('partitionStrategy', 'round-robin'))} onValueChange={v => onUpdate('partitionStrategy', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin">Round Robin</SelectItem>
                <SelectItem value="by-key">По ключу</SelectItem>
                <SelectItem value="random">Случайно</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'websocket':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">WebSocket Настройки</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input value={String(c('url', ''))} onChange={e => onUpdate('url', e.target.value)} className="h-8 text-sm font-mono" placeholder="ws://..." />
          </div>
        </div>
      );

    case 'logger':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Настройки журнала</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Уровень логирования</Label>
            <Select value={String(c('logLevel', 'info'))} onValueChange={v => onUpdate('logLevel', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Макс. записей</Label>
            <Input type="number" value={Number(c('maxEntries', 1000))} onChange={e => onUpdate('maxEntries', Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
      );

    case 'alarm-check':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Проверка аварий</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Тег</Label>
            <Input value={String(c('tag', ''))} onChange={e => onUpdate('tag', e.target.value)} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Условие</Label>
            <Select value={String(c('condition', '>'))} onValueChange={v => onUpdate('condition', v)}>
              <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value=">">&gt; Выше</SelectItem>
                <SelectItem value="<">&lt; Ниже</SelectItem>
                <SelectItem value="==">= Равно</SelectItem>
                <SelectItem value="!=">≠ Не равно</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Уставка</Label>
            <Input type="number" step="0.1" value={Number(c('setpoint', 100))} onChange={e => onUpdate('setpoint', Number(e.target.value))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Зона нечувствительности (deadband)</Label>
            <Input type="number" step="0.1" value={Number(c('deadband', 1))} onChange={e => onUpdate('deadband', Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
      );

    case 'delay':
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Задержка</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Задержка (мс)</Label>
            <Input type="number" value={Number(c('delayMs', 1000))} onChange={e => onUpdate('delayMs', Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-muted-foreground">Нет настроек для данного типа узла</p>;
  }
}

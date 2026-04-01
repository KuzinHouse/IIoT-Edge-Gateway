/**
 * Pipeline Templates Library
 *
 * Pre-defined IoT pipeline templates for common data flow patterns.
 * Each template defines nodes, connections, and default configurations
 * that map to the PipelineView's node types.
 *
 * Uses the same data model as PipelineView.tsx (PipelineNode / PipelineEdge).
 */

import React from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Layers, Shuffle, Filter,
  Calculator, Code, Radio, Globe, Wifi, FileText, Bell, Timer,
  Copy, GitBranch, Database, CloudUpload, ShieldCheck,
} from 'lucide-react';

/* ================================================================
   TYPES
   ================================================================ */

export interface PipelineTemplateNode {
  /** Unique key within the template (mapped to real IDs on instantiation) */
  key: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Record<string, string | number | boolean>;
}

export interface PipelineTemplateEdge {
  sourceKey: string;
  sourceHandle: string;
  targetKey: string;
  targetHandle: string;
}

export interface PipelineTemplateCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  iconColor: string;
  tags: string[];
  nodes: PipelineTemplateNode[];
  edges: PipelineTemplateEdge[];
}

/* ================================================================
   CATEGORIES
   ================================================================ */

export const PIPELINE_TEMPLATE_CATEGORIES: PipelineTemplateCategory[] = [
  { id: 'basic', name: 'Базовые', icon: <Copy className="h-4 w-4" /> },
  { id: 'data-processing', name: 'Обработка данных', icon: <Calculator className="h-4 w-4" /> },
  { id: 'alarms', name: 'Аварии и уведомления', icon: <Bell className="h-4 w-4" /> },
  { id: 'cloud', name: 'Облачные сервисы', icon: <CloudUpload className="h-4 w-4" /> },
  { id: 'advanced', name: 'Продвинутые', icon: <GitBranch className="h-4 w-4" /> },
];

/* ================================================================
   HELPER: NODE INPUTS / OUTPUTS
   ================================================================ */

const NODE_IO: Record<string, { inputs: number; outputs: number }> = {
  'south-device-source': { inputs: 0, outputs: 1 },
  'tag-reader': { inputs: 0, outputs: 1 },
  'data-transform': { inputs: 1, outputs: 1 },
  'filter': { inputs: 1, outputs: 1 },
  'aggregator': { inputs: 1, outputs: 1 },
  'script': { inputs: 1, outputs: 1 },
  'mqtt-publish': { inputs: 1, outputs: 0 },
  'http-push': { inputs: 1, outputs: 0 },
  'kafka-producer': { inputs: 1, outputs: 0 },
  'websocket': { inputs: 1, outputs: 0 },
  'logger': { inputs: 1, outputs: 1 },
  'alarm-check': { inputs: 1, outputs: 1 },
  'delay': { inputs: 1, outputs: 1 },
};

function inputsFor(type: string): string[] {
  const n = NODE_IO[type]?.inputs ?? 0;
  return Array.from({ length: n }, (_, i) => `input-${i}`);
}

function outputsFor(type: string): string[] {
  const n = NODE_IO[type]?.outputs ?? 0;
  return Array.from({ length: n }, (_, i) => `output-${i}`);
}

/* ================================================================
   TEMPLATES
   ================================================================ */

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  /* ----------------------------------------------------------------
     1. Simple Passthrough (South → North direct)
     ---------------------------------------------------------------- */
  {
    id: 'passthrough',
    name: 'Простой сквозной пайплайн',
    description: 'Напрямую передаёт данные с южного устройства в MQTT. Минимальная конфигурация для быстрого старта.',
    category: 'basic',
    icon: <ArrowDownToLine className="h-5 w-5" />,
    iconColor: '#3b82f6',
    tags: ['mqtt', 'modbus', 'быстрый старт', 'простой'],
    nodes: [
      {
        key: 'src', type: 'south-device-source', label: 'Источник Modbus',
        x: 80, y: 160,
        config: { device: 'plc-1', pollInterval: 1000, tagGroup: 'all' },
      },
      {
        key: 'out', type: 'mqtt-publish', label: 'MQTT Публикация',
        x: 380, y: 160,
        config: { topic: 'neuron/data/{device}/{tag}', qos: 1, retain: false },
      },
    ],
    edges: [
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'out', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     2. Data Scaling + MQTT Publish
     ---------------------------------------------------------------- */
  {
    id: 'scale-mqtt',
    name: 'Масштабирование + MQTT',
    description: 'Масштабирует сырые значения регистров (например, 0–40000 → 0–100°C) и публикует в MQTT.',
    category: 'data-processing',
    icon: <Shuffle className="h-5 w-5" />,
    iconColor: '#f97316',
    tags: ['масштабирование', 'преобразование', 'mqtt', 'temperature'],
    nodes: [
      {
        key: 'src', type: 'south-device-source', label: 'Источник данных',
        x: 60, y: 160,
        config: { device: 'plc-1', pollInterval: 1000, tagGroup: 'temperature' },
      },
      {
        key: 'transform', type: 'data-transform', label: 'Масштабирование',
        x: 300, y: 160,
        config: { transformType: 'scale', param1: 0.0025 },
      },
      {
        key: 'out', type: 'mqtt-publish', label: 'MQTT Топик',
        x: 540, y: 160,
        config: { topic: 'neuron/scaled/temperature', qos: 1, retain: false },
      },
    ],
    edges: [
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'transform', targetHandle: 'input-0' },
      { sourceKey: 'transform', sourceHandle: 'output-0', targetKey: 'out', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     3. Alarm Detection + Notification
     ---------------------------------------------------------------- */
  {
    id: 'alarm-notify',
    name: 'Обнаружение аварий + уведомления',
    description: 'Мониторинг аварийных тегов, проверка уставок, запись в журнал и отправка MQTT-уведомлений.',
    category: 'alarms',
    icon: <Bell className="h-5 w-5" />,
    iconColor: '#ef4444',
    tags: ['авария', 'аларм', 'уведомление', 'mqtt', 'журнал'],
    nodes: [
      {
        key: 'tags', type: 'tag-reader', label: 'Аварийные теги',
        x: 60, y: 200,
        config: { tags: 'temp-high, pressure-high, vibration', scanRate: 200 },
      },
      {
        key: 'alarm', type: 'alarm-check', label: 'Проверка аварий',
        x: 300, y: 200,
        config: { tag: 'temp-high', condition: '>', setpoint: 120, deadband: 2.0 },
      },
      {
        key: 'log', type: 'logger', label: 'Журнал аварий',
        x: 560, y: 120,
        config: { logLevel: 'warning', maxEntries: 5000 },
      },
      {
        key: 'mqtt', type: 'mqtt-publish', label: 'MQTT Оповещения',
        x: 560, y: 300,
        config: { topic: 'neuron/alarms/{tag}', qos: 2, retain: true },
      },
    ],
    edges: [
      { sourceKey: 'tags', sourceHandle: 'output-0', targetKey: 'alarm', targetHandle: 'input-0' },
      { sourceKey: 'alarm', sourceHandle: 'output-0', targetKey: 'log', targetHandle: 'input-0' },
      { sourceKey: 'alarm', sourceHandle: 'output-0', targetKey: 'mqtt', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     4. Data Aggregation + Time-series Storage
     ---------------------------------------------------------------- */
  {
    id: 'aggregate-storage',
    name: 'Агрегация + хранение временных рядов',
    description: 'Агрегирует данные (среднее за окно) и отправляет в HTTP API для хранения временных рядов (InfluxDB, TimescaleDB).',
    category: 'data-processing',
    icon: <Calculator className="h-5 w-5" />,
    iconColor: '#eab308',
    tags: ['агрегация', 'временные ряды', 'http', 'influxdb', 'timescaledb'],
    nodes: [
      {
        key: 'src', type: 'south-device-source', label: 'Источник данных',
        x: 60, y: 160,
        config: { device: 'plc-1', pollInterval: 500, tagGroup: 'all' },
      },
      {
        key: 'agg', type: 'aggregator', label: 'Агрегатор (среднее)',
        x: 300, y: 160,
        config: { function: 'avg', windowSize: 60, groupBy: 'tag' },
      },
      {
        key: 'http', type: 'http-push', label: 'InfluxDB API',
        x: 560, y: 160,
        config: { url: 'http://influxdb:8086/api/v2/write', method: 'POST', headers: '{"Authorization": "Token xxx"}' },
      },
    ],
    edges: [
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'agg', targetHandle: 'input-0' },
      { sourceKey: 'agg', sourceHandle: 'output-0', targetKey: 'http', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     5. Protocol Conversion (Modbus → OPC UA)
     ---------------------------------------------------------------- */
  {
    id: 'protocol-conversion',
    name: 'Конвертация протоколов',
    description: 'Читает данные по Modbus TCP и пересылает через OPC UA-совместимый HTTP endpoint. Прозрачная конвертация протоколов.',
    category: 'advanced',
    icon: <ShieldCheck className="h-5 w-5" />,
    iconColor: '#06b6d4',
    tags: ['modbus', 'opc ua', 'конвертация', 'протокол', 'промышленный'],
    nodes: [
      {
        key: 'modbus', type: 'south-device-source', label: 'Modbus TCP Источник',
        x: 60, y: 180,
        config: { device: 'plc-1', pollInterval: 1000, tagGroup: 'all' },
      },
      {
        key: 'transform', type: 'data-transform', label: 'Конвертация типов',
        x: 320, y: 180,
        config: { transformType: 'map', param1: 1 },
      },
      {
        key: 'http', type: 'http-push', label: 'OPC UA Endpoint',
        x: 580, y: 180,
        config: { url: 'http://opcua-gateway:4840/opcua/write', method: 'POST', headers: '{"Content-Type": "application/json"}' },
      },
    ],
    edges: [
      { sourceKey: 'modbus', sourceHandle: 'output-0', targetKey: 'transform', targetHandle: 'input-0' },
      { sourceKey: 'transform', sourceHandle: 'output-0', targetKey: 'http', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     6. Data Quality Filtering + Cloud Push
     ---------------------------------------------------------------- */
  {
    id: 'quality-filter-cloud',
    name: 'Фильтрация качества + облако',
    description: 'Фильтрует данные по качеству (good/bad/uncertain), записывает в журнал и отправляет только качественные данные в облако.',
    category: 'cloud',
    icon: <CloudUpload className="h-5 w-5" />,
    iconColor: '#22c55e',
    tags: ['качество', 'фильтр', 'облако', 'mqtt', 'aws', 'azure'],
    nodes: [
      {
        key: 'src', type: 'south-device-source', label: 'Источник данных',
        x: 40, y: 180,
        config: { device: 'plc-1', pollInterval: 1000, tagGroup: 'all' },
      },
      {
        key: 'filter', type: 'filter', label: 'Фильтр качества',
        x: 260, y: 180,
        config: { field: 'quality', condition: '==', value: 'good' },
      },
      {
        key: 'log', type: 'logger', label: 'ЖурналRejected',
        x: 260, y: 60,
        config: { logLevel: 'warning', maxEntries: 2000 },
      },
      {
        key: 'mqtt', type: 'mqtt-publish', label: 'AWS IoT Cloud',
        x: 500, y: 180,
        config: { topic: '$aws/things/gateway/data', qos: 1, retain: false },
      },
    ],
    edges: [
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'filter', targetHandle: 'input-0' },
      { sourceKey: 'filter', sourceHandle: 'output-0', targetKey: 'mqtt', targetHandle: 'input-0' },
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'log', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     7. Multi-destination Fanout (one South → multiple North)
     ---------------------------------------------------------------- */
  {
    id: 'fanout',
    name: 'Мульти-направленная маршрутизация',
    description: 'Распределяет данные одного источника в несколько назначений: MQTT, Kafka и WebSocket одновременно.',
    category: 'advanced',
    icon: <GitBranch className="h-5 w-5" />,
    iconColor: '#8b5cf6',
    tags: ['fanout', 'маршрутизация', 'mqtt', 'kafka', 'websocket', 'multi'],
    nodes: [
      {
        key: 'src', type: 'south-device-source', label: 'Источник данных',
        x: 60, y: 220,
        config: { device: 'plc-1', pollInterval: 1000, tagGroup: 'all' },
      },
      {
        key: 'mqtt', type: 'mqtt-publish', label: 'MQTT',
        x: 380, y: 80,
        config: { topic: 'neuron/fanout/mqtt', qos: 1, retain: false },
      },
      {
        key: 'kafka', type: 'kafka-producer', label: 'Kafka',
        x: 380, y: 220,
        config: { topic: 'neuron-fanout', keyField: 'tag', partitionStrategy: 'by-key' },
      },
      {
        key: 'ws', type: 'websocket', label: 'WebSocket',
        x: 380, y: 360,
        config: { url: 'ws://dashboard:8080/stream' },
      },
    ],
    edges: [
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'mqtt', targetHandle: 'input-0' },
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'kafka', targetHandle: 'input-0' },
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'ws', targetHandle: 'input-0' },
    ],
  },

  /* ----------------------------------------------------------------
     8. Batch Aggregation + Periodic Push
     ---------------------------------------------------------------- */
  {
    id: 'batch-push',
    name: 'Пакетная агрегация + периодическая отправка',
    description: 'Накапливает данные с задержкой, агрегирует по окну и периодически отправляет пачку через HTTP. Оптимизация сетевого трафика.',
    category: 'data-processing',
    icon: <Database className="h-5 w-5" />,
    iconColor: '#14b8a6',
    tags: ['пакет', 'batch', 'периодический', 'http', 'агрегация', 'оптимизация'],
    nodes: [
      {
        key: 'src', type: 'south-device-source', label: 'Источник данных',
        x: 40, y: 180,
        config: { device: 'plc-1', pollInterval: 500, tagGroup: 'all' },
      },
      {
        key: 'delay', type: 'delay', label: 'Буфер (10 сек)',
        x: 260, y: 180,
        config: { delayMs: 10000 },
      },
      {
        key: 'agg', type: 'aggregator', label: 'Пакетный агрегатор',
        x: 480, y: 180,
        config: { function: 'avg', windowSize: 20, groupBy: 'group' },
      },
      {
        key: 'http', type: 'http-push', label: 'REST API Пакет',
        x: 700, y: 180,
        config: { url: 'http://collector:8080/api/v1/batch', method: 'POST', headers: '{"Content-Type": "application/json"}' },
      },
    ],
    edges: [
      { sourceKey: 'src', sourceHandle: 'output-0', targetKey: 'delay', targetHandle: 'input-0' },
      { sourceKey: 'delay', sourceHandle: 'output-0', targetKey: 'agg', targetHandle: 'input-0' },
      { sourceKey: 'agg', sourceHandle: 'output-0', targetKey: 'http', targetHandle: 'input-0' },
    ],
  },
];

/* ================================================================
   INSTANTIATION HELPER
   ================================================================ */

/**
 * Creates a Pipeline (nodes + edges) from a template.
 * Generates unique IDs for each node and edge using the provided prefix.
 */
export function createPipelineFromTemplate(
  template: PipelineTemplate,
  pipelineId: string,
): {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    config?: Record<string, string | number | boolean>;
    inputs: string[];
    outputs: string[];
  }>;
  edges: Array<{
    id: string;
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
  }>;
} {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);

  /* Build node key → real ID map */
  const idMap = new Map<string, string>();
  template.nodes.forEach((n, idx) => {
    idMap.set(n.key, `n-${now}-${idx}-${rand.slice(0, 3)}`);
  });

  /* Build nodes */
  const nodes = template.nodes.map((n) => ({
    id: idMap.get(n.key)!,
    type: n.type,
    label: n.label,
    x: n.x,
    y: n.y,
    config: n.config ? { ...n.config } : undefined,
    inputs: inputsFor(n.type),
    outputs: outputsFor(n.type),
  }));

  /* Build edges */
  const edges = template.edges.map((e, idx) => ({
    id: `e-${now}-${idx}-${rand.slice(0, 3)}`,
    source: idMap.get(e.sourceKey)!,
    sourceHandle: e.sourceHandle,
    target: idMap.get(e.targetKey)!,
    targetHandle: e.targetHandle,
  }));

  return { nodes, edges };
}

/* ================================================================
   SEARCH / FILTER HELPERS
   ================================================================ */

export function getAllTemplates(): PipelineTemplate[] {
  return PIPELINE_TEMPLATES;
}

export function getTemplateById(id: string): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(categoryId: string): PipelineTemplate[] {
  return PIPELINE_TEMPLATES.filter(t => t.category === categoryId);
}

export function searchTemplates(query: string): PipelineTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return PIPELINE_TEMPLATES;
  return PIPELINE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)),
  );
}

export function getTemplateCategoryById(categoryId: string): PipelineTemplateCategory | undefined {
  return PIPELINE_TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
}

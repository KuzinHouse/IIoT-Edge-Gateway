/**
 * North App Templates Library
 *
 * Pre-defined northbound application templates covering common IoT edge patterns.
 * Each template includes: name, description, protocol type, icon, category,
 * and all default connection settings ready to be applied to a new NorthApp.
 *
 * Uses the same data model as NorthAppsView.tsx.
 */

import React from 'react';

// ============================================================
// Types
// ============================================================

export type LucideIconName =
  | 'MessageSquare' | 'Radio' | 'Zap' | 'Globe' | 'Cloud'
  | 'Database' | 'Lock' | 'Activity' | 'Server' | 'Wifi'
  | 'Send' | 'Link' | 'BarChart3' | 'Cpu' | 'HardDrive'
  | 'Layers' | 'BookmarkCheck' | 'FileJson' | 'ArrowUpDown';

export interface NorthAppTemplateConfig {
  [key: string]: string | number | boolean;
}

export interface NorthAppTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  protocolId: string;
  protocolName: string;
  category: NorthAppTemplateCategory;
  icon: LucideIconName;
  config: NorthAppTemplateConfig;
  dataFormat: 'JSON' | 'XML' | 'Protobuf';
  batchSize: number;
  flushInterval: number;
  compression: boolean;
  tags?: string[]; // sample topic/endpoint patterns
}

export interface NorthAppTemplateCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: LucideIconName;
  color: string; // tailwind text color
  bgColor: string; // tailwind bg color
}

// ============================================================
// Template Categories
// ============================================================

export const TEMPLATE_CATEGORIES: NorthAppTemplateCategory[] = [
  {
    id: 'mqtt',
    name: 'MQTT',
    nameEn: 'MQTT',
    icon: 'MessageSquare',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'streaming',
    name: 'Потоковая передача',
    nameEn: 'Streaming',
    icon: 'Activity',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'cloud',
    name: 'Облачные платформы',
    nameEn: 'Cloud Platforms',
    icon: 'Cloud',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
  {
    id: 'database',
    name: 'Базы данных',
    nameEn: 'Databases',
    icon: 'Database',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'industrial',
    name: 'Промышленные',
    nameEn: 'Industrial',
    icon: 'Cpu',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'api',
    name: 'API',
    nameEn: 'API',
    icon: 'Globe',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
];

// ============================================================
// Templates
// ============================================================

export const NORTH_APP_TEMPLATES: NorthAppTemplate[] = [
  // ─── MQTT ─────────────────────────────────────────────
  {
    id: 'tpl-mqtt-public',
    name: 'MQTT v5 — Публичный брокер',
    nameEn: 'MQTT v5 — Public Broker',
    description: 'Отправка данных на публичный MQTT брокер Eclipse Projects. Не требует аутентификации. Идеально для тестирования и демонстраций.',
    descriptionEn: 'Send data to Eclipse Projects public MQTT broker. No auth required. Ideal for testing and demos.',
    protocolId: 'mqtt-v5',
    protocolName: 'MQTT v5',
    category: TEMPLATE_CATEGORIES[0], // mqtt
    icon: 'MessageSquare',
    config: {
      host: 'mqtt.eclipseprojects.io',
      port: 1883,
      clientId: 'neuron-edge-gw',
      username: '',
      password: '',
      qos: '1',
      keepAlive: 60,
      cleanSession: true,
      tls: false,
      topic: 'neuron/data/#',
    },
    dataFormat: 'JSON',
    batchSize: 100,
    flushInterval: 5,
    compression: false,
    tags: ['neuron/data/#', 'neuron/telemetry/+', 'neuron/status'],
  },
  {
    id: 'tpl-mqtt-blue-traktor',
    name: 'MQTT v5 — Blue Traktor',
    nameEn: 'MQTT v5 — Blue Traktor',
    description: 'Тестовый MQTT брокер blue-traktor.ru:1888. Пустой логин и пароль. Используется для отладки IoT решений.',
    descriptionEn: 'Test MQTT broker blue-traktor.ru:1888. Empty login/password. Used for debugging IoT solutions.',
    protocolId: 'mqtt-v5',
    protocolName: 'MQTT v5',
    category: TEMPLATE_CATEGORIES[0], // mqtt
    icon: 'MessageSquare',
    config: {
      host: 'blue-traktor.ru',
      port: 1888,
      clientId: 'iot-edge-gw-01',
      username: '',
      password: '',
      qos: '1',
      keepAlive: 60,
      cleanSession: true,
      tls: false,
      topic: 'neuron/data/#',
    },
    dataFormat: 'JSON',
    batchSize: 100,
    flushInterval: 5,
    compression: false,
    tags: ['neuron/data/#', 'neuron/telemetry/+', 'neuron/alarms'],
  },
  {
    id: 'tpl-mqtt-sparkplug',
    name: 'MQTT Sparkplug B',
    nameEn: 'MQTT Sparkplug B',
    description: 'MQTT v5 с промышленным профилем Sparkplug B. Используется в SCADA-системах Ignition, MQTT Module для стандартизированного обмена данными.',
    descriptionEn: 'MQTT v5 with Sparkplug B industrial profile. Used in Ignition SCADA, MQTT Module for standardized data exchange.',
    protocolId: 'mqtt-v5',
    protocolName: 'MQTT v5',
    category: TEMPLATE_CATEGORIES[0], // mqtt
    icon: 'Zap',
    config: {
      host: 'mqtt.local',
      port: 1883,
      clientId: 'neuron-sparkplug-edge',
      username: 'sparkplug_user',
      password: '',
      qos: '0',
      keepAlive: 30,
      cleanSession: false,
      tls: false,
      topic: 'spBv1.0/neuron_edge_gw/DBIRTH',
    },
    dataFormat: 'Protobuf',
    batchSize: 200,
    flushInterval: 5,
    compression: true,
    tags: [
      'spBv1.0/neuron_edge_gw/DBIRTH',
      'spBv1.0/neuron_edge_gw/DDATA',
      'spBv1.0/neuron_edge_gw/DCMD',
    ],
  },

  // ─── Streaming ─────────────────────────────────────────
  {
    id: 'tpl-kafka',
    name: 'Apache Kafka',
    nameEn: 'Apache Kafka',
    description: 'Отправка данных в Apache Kafka топик. Подходит для потоковой обработки, Big Data и микросервисной архитектуры.',
    descriptionEn: 'Send data to Apache Kafka topic. Suitable for stream processing, Big Data, and microservices architecture.',
    protocolId: 'kafka',
    protocolName: 'Kafka',
    category: TEMPLATE_CATEGORIES[1], // streaming
    icon: 'Activity',
    config: {
      bootstrapServers: 'kafka.local:9092',
      topic: 'iot-data',
      clientId: 'neuron-kafka-producer',
      acks: 'all',
      saslMechanism: 'PLAIN',
    },
    dataFormat: 'JSON',
    batchSize: 500,
    flushInterval: 10,
    compression: true,
    tags: ['iot-data', 'iot-telemetry', 'iot-alarms'],
  },
  {
    id: 'tpl-websocket',
    name: 'WebSocket Stream',
    nameEn: 'WebSocket Stream',
    description: 'Потоковая передача данных через WebSocket в реальном времени. Подходит для дашбордов, мониторинга и визуализации.',
    descriptionEn: 'Real-time data streaming via WebSocket. Suitable for dashboards, monitoring, and visualization.',
    protocolId: 'websocket',
    protocolName: 'WebSocket',
    category: TEMPLATE_CATEGORIES[1], // streaming
    icon: 'Wifi',
    config: {
      url: 'ws://localhost:8080/ws',
      tls: false,
    },
    dataFormat: 'JSON',
    batchSize: 10,
    flushInterval: 1,
    compression: false,
    tags: [],
  },

  // ─── Cloud Platforms ──────────────────────────────────
  {
    id: 'tpl-aws-iot',
    name: 'AWS IoT Core',
    nameEn: 'AWS IoT Core',
    description: 'Подключение к AWS IoT Core для отправки телеметрии. Использует MQTT с TLS и X.509 сертификатами.',
    descriptionEn: 'Connect to AWS IoT Core for telemetry. Uses MQTT with TLS and X.509 certificates.',
    protocolId: 'aws-iot',
    protocolName: 'AWS IoT',
    category: TEMPLATE_CATEGORIES[2], // cloud
    icon: 'Cloud',
    config: {
      endpoint: 'xxxxxx.iot.eu-west-1.amazonaws.com',
      port: 8883,
      clientId: 'neuron-aws-iot',
      thingName: 'edge-gateway-01',
      tls: true,
    },
    dataFormat: 'JSON',
    batchSize: 100,
    flushInterval: 5,
    compression: false,
    tags: ['$aws/things/edge-gateway-01/shadow/update', 'iot/data'],
  },
  {
    id: 'tpl-azure-iot',
    name: 'Azure IoT Hub',
    nameEn: 'Azure IoT Hub',
    description: 'Интеграция с Azure IoT Hub для отправки данных в облако Microsoft Azure. Поддерживает Device Twin и модули.',
    descriptionEn: 'Integration with Azure IoT Hub for sending data to Microsoft Azure cloud. Supports Device Twin and modules.',
    protocolId: 'azure-iot',
    protocolName: 'Azure IoT Hub',
    category: TEMPLATE_CATEGORIES[2], // cloud
    icon: 'Cloud',
    config: {
      host: 'myhub.azure-devices.net',
      port: 8883,
      deviceId: 'neuron-edge-gw',
      tls: true,
    },
    dataFormat: 'JSON',
    batchSize: 200,
    flushInterval: 8,
    compression: true,
    tags: ['devices/neuron-edge-gw/messages/events'],
  },

  // ─── Databases ────────────────────────────────────────
  {
    id: 'tpl-influxdb',
    name: 'InfluxDB',
    nameEn: 'InfluxDB',
    description: 'Запись телеметрических данных в InfluxDB — оптимизированную СУБД временных рядов (time-series). Поддерживает InfluxDB 2.x с токен-аутентификацией.',
    descriptionEn: 'Write telemetry to InfluxDB — optimized time-series database. Supports InfluxDB 2.x with token authentication.',
    protocolId: 'influxdb',
    protocolName: 'InfluxDB',
    category: TEMPLATE_CATEGORIES[3], // database
    icon: 'Database',
    config: {
      host: 'influxdb.local',
      port: 8086,
      token: '',
      org: 'iot',
      bucket: 'telemetry',
      measurement: 'sensor_data',
      batchSize: 500,
      flushInterval: 5,
      tls: false,
    },
    dataFormat: 'JSON',
    batchSize: 500,
    flushInterval: 5,
    compression: false,
    tags: ['sensor_data', 'telemetry', 'alarms'],
  },
  {
    id: 'tpl-timescaledb',
    name: 'TimescaleDB',
    nameEn: 'TimescaleDB',
    description: 'Хранение исторических данных в TimescaleDB — расширение PostgreSQL для временных рядов. Поддерживает гипертаблицы и непрерывные агрегаты.',
    descriptionEn: 'Store historical data in TimescaleDB — PostgreSQL extension for time-series. Supports hypertables and continuous aggregates.',
    protocolId: 'timescaledb',
    protocolName: 'TimescaleDB',
    category: TEMPLATE_CATEGORIES[3], // database
    icon: 'Database',
    config: {
      host: 'tsdb.local',
      port: 5432,
      database: 'iot_data',
      schema: 'public',
      table: 'tag_values',
      user: 'iot_writer',
      password: '',
      batchSize: 1000,
      flushInterval: 10,
      ssl: false,
    },
    dataFormat: 'JSON',
    batchSize: 1000,
    flushInterval: 10,
    compression: false,
    tags: ['tag_values', 'alarms', 'events'],
  },
  {
    id: 'tpl-elasticsearch',
    name: 'Elasticsearch',
    nameEn: 'Elasticsearch',
    description: 'Индексация и поиск IoT данных в Elasticsearch. Подходит для логов, аналитики и визуализации в Kibana.',
    descriptionEn: 'Index and search IoT data in Elasticsearch. Suitable for logs, analytics, and Kibana visualization.',
    protocolId: 'elasticsearch',
    protocolName: 'Elasticsearch',
    category: TEMPLATE_CATEGORIES[3], // database
    icon: 'BarChart3',
    config: {
      host: 'elasticsearch.local',
      port: 9200,
      index: 'iot-data',
      username: 'elastic',
      password: '',
      tls: false,
      timeout: 10000,
      batchSize: 500,
    },
    dataFormat: 'JSON',
    batchSize: 500,
    flushInterval: 5,
    compression: false,
    tags: ['iot-data', 'iot-logs', 'iot-alarms'],
  },
  {
    id: 'tpl-pi-system',
    name: 'OSIsoft PI System',
    nameEn: 'OSIsoft PI System',
    description: 'Отправка данных в OSIsoft PI System — корпоративный историк для промышленности (нефтегаз, энергетика, производство).',
    descriptionEn: 'Send data to OSIsoft PI System — enterprise historian for industry (oil & gas, energy, manufacturing).',
    protocolId: 'pi-system',
    protocolName: 'OSIsoft PI System',
    category: TEMPLATE_CATEGORIES[3], // database
    icon: 'HardDrive',
    config: {
      host: 'piserver.local',
      port: 5450,
      serverName: 'DefaultPI',
      authMode: 'windows',
      dataMode: 'insert',
      piTagPrefix: 'IOT_',
      batchSize: 500,
      flushInterval: 5,
      timeout: 30000,
    },
    dataFormat: 'JSON',
    batchSize: 500,
    flushInterval: 5,
    compression: false,
    tags: ['IOT_', 'SENSOR_'],
  },

  // ─── Industrial ───────────────────────────────────────
  {
    id: 'tpl-opcua-server',
    name: 'OPC UA Сервер',
    nameEn: 'OPC UA Server',
    description: 'Экспозиция данных шлюза как OPC UA сервер. Позволяет внешним OPC UA клиентам (SCADA, MES, ERP) подключаться и читать данные.',
    descriptionEn: 'Expose gateway data as OPC UA server. Allows external OPC UA clients (SCADA, MES, ERP) to connect and read data.',
    protocolId: 'opcua',
    protocolName: 'OPC UA',
    category: TEMPLATE_CATEGORIES[4], // industrial
    icon: 'Link',
    config: {
      endpoint: 'opc.tcp://0.0.0.0:4840',
      securityMode: 'SignAndEncrypt',
      securityPolicy: 'Basic256Sha256',
      authMode: 'username',
      username: 'scada_reader',
      password: '',
      timeout: 10000,
      sessionTimeout: 60000,
      pollInterval: 500,
      keepAlive: 10000,
      autoReconnect: true,
      minSamplingInterval: 100,
      queueSize: 10,
      useBinaryEncoding: true,
    },
    dataFormat: 'JSON',
    batchSize: 100,
    flushInterval: 1,
    compression: false,
    tags: ['ns=2;s=Temperature', 'ns=2;s=Pressure', 'ns=2;s=Status'],
  },

  // ─── API ──────────────────────────────────────────────
  {
    id: 'tpl-http-rest',
    name: 'HTTP REST API Push',
    nameEn: 'HTTP REST API Push',
    description: 'Отправка данных на HTTP REST API методом POST. Подходит для интеграции с собственными backend-сервисами, microservices и SaaS.',
    descriptionEn: 'Push data to HTTP REST API via POST. Suitable for integration with custom backends, microservices, and SaaS.',
    protocolId: 'http-rest',
    protocolName: 'HTTP REST',
    category: TEMPLATE_CATEGORIES[5], // api
    icon: 'Globe',
    config: {
      url: 'https://api.example.com/data',
      method: 'POST',
      timeout: 30,
      retryCount: 3,
    },
    dataFormat: 'JSON',
    batchSize: 50,
    flushInterval: 3,
    compression: false,
    tags: ['/api/data', '/api/telemetry', '/api/alarms'],
  },
];

// ============================================================
// Helper Functions
// ============================================================

/** Get all templates */
export function getAllTemplates(): NorthAppTemplate[] {
  return NORTH_APP_TEMPLATES;
}

/** Get template by ID */
export function getTemplateById(id: string): NorthAppTemplate | undefined {
  return NORTH_APP_TEMPLATES.find(t => t.id === id);
}

/** Get templates by category ID */
export function getTemplatesByCategory(categoryId: string): NorthAppTemplate[] {
  return NORTH_APP_TEMPLATES.filter(t => t.category.id === categoryId);
}

/** Get templates by protocol ID */
export function getTemplatesByProtocol(protocolId: string): NorthAppTemplate[] {
  return NORTH_APP_TEMPLATES.filter(t => t.protocolId === protocolId);
}

/** Search templates by name, description, protocol */
export function searchTemplates(query: string): NorthAppTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return NORTH_APP_TEMPLATES;
  return NORTH_APP_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.nameEn.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.descriptionEn.toLowerCase().includes(q) ||
    t.protocolName.toLowerCase().includes(q) ||
    t.protocolId.toLowerCase().includes(q) ||
    t.category.name.toLowerCase().includes(q) ||
    t.category.nameEn.toLowerCase().includes(q)
  );
}

/** Create a template config override map for template selection.
 *  Returns the template's config merged on top of the protocol defaults.
 */
export function getTemplateConfig(template: NorthAppTemplate): NorthAppTemplateConfig {
  return { ...template.config };
}

/** Get unique protocol IDs from all templates */
export function getTemplateProtocolIds(): string[] {
  const ids = new Set<string>();
  NORTH_APP_TEMPLATES.forEach(t => ids.add(t.protocolId));
  return Array.from(ids);
}

/** Get category by ID */
export function getCategoryById(categoryId: string): NorthAppTemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
}

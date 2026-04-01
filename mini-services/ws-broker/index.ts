/**
 * WebSocket Real-Time Data Broker (JSON-LD)
 * 
 * Provides real-time streaming of simulated IoT tag values, system metrics,
 * alarm events, and connection status updates to connected clients.
 * All data is output in flat JSON-LD format with @context, @id, @type.
 * 
 * Channels:
 *   tags      - Live tag value updates (JSON-LD Tag nodes)
 *   metrics   - System metrics (JSON-LD Metric nodes)
 *   alarms    - Alarm events (JSON-LD Alarm nodes)
 *   status    - Connection/device status changes (with @context reference)
 *   all       - All channels
 */

const PORT = 8503;

// ====== JSON-LD @context (standalone — cannot import from src/lib) ======
const IOT_CONTEXT: Record<string, string> = {
  "iot": "https://iot-schema.org/",
  "schema": "https://schema.org/",
  "qudt": "https://qudt.org/schema/qudt/",
  "sosa": "http://www.w3.org/ns/sosa/",
  "time": "http://www.w3.org/2006/time#",
  "xsd": "http://www.w3.org/2001/XMLSchema#",
  "id": "@id",
  "type": "@type",
  "Device": "iot:Device",
  "Tag": "iot:Tag",
  "Alarm": "iot:Alarm",
  "Metric": "iot:Metric",
  "Pipeline": "iot:Pipeline",
  "value": "schema:value",
  "quality": "iot:quality",
  "timestamp": "schema:timestamp",
  "unit": "qudt:unit",
  "address": "iot:address",
  "deviceId": "iot:deviceId",
  "deviceName": "iot:deviceName",
  "protocol": "iot:protocol",
  "status": "schema:status",
  "name": "schema:name",
  "description": "schema:description",
  "severity": "iot:severity",
  "event": "iot:event",
  "message": "schema:description",
  "dataType": "iot:dataType",
  "groupName": "iot:groupName",
  "scanRate": "iot:scanRate",
  "tag": "iot:tag",
  "tagAddress": "iot:tagAddress",
  "setpoint": "iot:setpoint",
  "deadband": "iot:deadband",
};

// ====== JSON-LD Helpers ======
function toJsonLd(ldType: string, id: string, data: Record<string, unknown>): Record<string, unknown> {
  return {
    "@context": IOT_CONTEXT,
    "@id": id,
    "@type": ldType,
    ...data,
  };
}

function tagToJsonLd(tag: TagValue): Record<string, unknown> {
  return toJsonLd("Tag", `tag:${tag.deviceId}:${tag.address.replace(':', '_')}`, {
    name: tag.name,
    address: tag.address,
    value: tag.value,
    quality: tag.quality,
    unit: tag.unit,
    deviceId: tag.deviceId,
    deviceName: tag.deviceName,
    groupName: tag.groupName,
    dataType: tag.dataType,
    timestamp: tag.timestamp || new Date().toISOString(),
    scanRate: tag.scanRate,
    protocol: tag.protocol,
  });
}

function metricToJsonLd(name: string, value: number, unit: string): Record<string, unknown> {
  return toJsonLd("Metric", `metric:${name}`, {
    name,
    value,
    unit,
    timestamp: new Date().toISOString(),
  });
}

function alarmToJsonLd(alarm: AlarmEvent): Record<string, unknown> {
  return toJsonLd("Alarm", `alarm:${alarm.tag.replace(/\s+/g, '_')}:${alarm.timestamp}`, {
    name: alarm.name,
    severity: alarm.severity,
    tag: alarm.tag,
    tagAddress: alarm.tagAddress,
    deviceId: alarm.deviceId,
    event: alarm.event,
    message: alarm.message,
    timestamp: alarm.timestamp,
    value: alarm.value,
    setpoint: alarm.setpoint,
    deadband: alarm.deadband,
  });
}

// ====== Client Management ======
interface Client {
  id: string;
  ws: any;
  channels: Set<string>;
  connectedAt: Date;
}

const clients = new Map<string, Client>();
let clientIdCounter = 0;

// ====== Simulated Tag Data ======
interface TagValue {
  name: string;
  address: string;
  value: number;
  quality: 'good' | 'bad' | 'uncertain';
  unit: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  groupName: string;
  dataType: string;
  scanRate: number;
  protocol: string;
}

const TAGS: TagValue[] = [
  { name: 'Температура подшипника', address: 'Holding:0', value: 235.0, quality: 'good', unit: '°C', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Температуры', dataType: 'FLOAT', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Температура насоса', address: 'Holding:1', value: 187.0, quality: 'good', unit: '°C', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Температуры', dataType: 'FLOAT', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Давление линии', address: 'Holding:10', value: 42.0, quality: 'good', unit: 'бар', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Давление', dataType: 'FLOAT', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Расходомер', address: 'Holding:20', value: 12.34, quality: 'good', unit: 'м³/ч', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Расход', dataType: 'FLOAT', scanRate: 2000, protocol: 'Modbus TCP' },
  { name: 'Уровень бака 1', address: 'Holding:30', value: 7540, quality: 'good', unit: 'л', timestamp: '', deviceId: 'PLC-2', deviceName: 'Modbus TCP — Линия 2', groupName: 'Уровни', dataType: 'INT32', scanRate: 2000, protocol: 'Modbus TCP' },
  { name: 'Скорость двигателя', address: 'Holding:40', value: 1480, quality: 'good', unit: 'об/мин', timestamp: '', deviceId: 'PLC-2', deviceName: 'Modbus TCP — Линия 2', groupName: 'Двигатели', dataType: 'INT16', scanRate: 500, protocol: 'Modbus TCP' },
  { name: 'Вибрация опоры', address: 'Holding:50', value: 2.3, quality: 'good', unit: 'мм/с', timestamp: '', deviceId: 'PLC-2', deviceName: 'Modbus TCP — Линия 2', groupName: 'Вибрация', dataType: 'FLOAT', scanRate: 500, protocol: 'Modbus TCP' },
  { name: 'Ток фазы A', address: 'Holding:60', value: 15.6, quality: 'good', unit: 'А', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Электричество', dataType: 'FLOAT', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Мощность', address: 'Holding:70', value: 75.0, quality: 'good', unit: 'кВт', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Электричество', dataType: 'FLOAT', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Влажность', address: 'Holding:80', value: 65.0, quality: 'good', unit: '%', timestamp: '', deviceId: 'PLC-3', deviceName: 'Modbus RTU — Склад', groupName: 'Окружающая среда', dataType: 'FLOAT', scanRate: 5000, protocol: 'Modbus RTU' },
  { name: 'Температура помещения', address: 'Holding:2', value: 45.0, quality: 'good', unit: '°C', timestamp: '', deviceId: 'PLC-3', deviceName: 'Modbus RTU — Склад', groupName: 'Окружающая среда', dataType: 'FLOAT', scanRate: 5000, protocol: 'Modbus RTU' },
  { name: 'Вибрация двигателя', address: 'Holding:51', value: 4.5, quality: 'uncertain', unit: 'мм/с', timestamp: '', deviceId: 'PLC-2', deviceName: 'Modbus TCP — Линия 2', groupName: 'Вибрация', dataType: 'FLOAT', scanRate: 500, protocol: 'Modbus TCP' },
  { name: 'Давление газа', address: 'Holding:11', value: 38.0, quality: 'good', unit: 'бар', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Давление', dataType: 'FLOAT', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Уровень бака 2', address: 'Holding:31', value: 3200, quality: 'good', unit: 'л', timestamp: '', deviceId: 'PLC-2', deviceName: 'Modbus TCP — Линия 2', groupName: 'Уровни', dataType: 'INT32', scanRate: 2000, protocol: 'Modbus TCP' },
  { name: 'Управление насосом', address: 'Coil:0', value: 1, quality: 'good', unit: '', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Управление', dataType: 'BOOL', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Управление клапаном', address: 'Coil:3', value: 1, quality: 'good', unit: '', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Управление', dataType: 'BOOL', scanRate: 1000, protocol: 'Modbus TCP' },
  { name: 'Аварийная кнопка', address: 'Discrete:7', value: 0, quality: 'good', unit: '', timestamp: '', deviceId: 'PLC-1', deviceName: 'Modbus TCP — Цех 1', groupName: 'Безопасность', dataType: 'BOOL', scanRate: 100, protocol: 'Modbus TCP' },
  { name: 'Высокий уровень', address: 'Discrete:0', value: 1, quality: 'good', unit: '', timestamp: '', deviceId: 'PLC-2', deviceName: 'Modbus TCP — Линия 2', groupName: 'Уровни', dataType: 'BOOL', scanRate: 500, protocol: 'Modbus TCP' },
];

// ====== System metrics simulation ======
let cpuUsage = 34;
let memUsage = 62;
let diskUsage = 45;
let netIn = 0;
let netOut = 0;
let tagRate = 125;

// ====== Alarm simulation ======
interface AlarmTemplate {
  name: string;
  severity: 'critical' | 'warning' | 'info';
  tag: string;
  tagAddress: string;
  deviceId: string;
  condition: string;
  setpoint: number;
}

const ALARM_TEMPLATES: AlarmTemplate[] = [
  { name: 'Высокая температура подшипника', severity: 'critical', tag: 'Температура подшипника', tagAddress: 'Holding:0', deviceId: 'PLC-1', condition: '>', setpoint: 250 },
  { name: 'Повышенная вибрация двигателя', severity: 'warning', tag: 'Вибрация двигателя', tagAddress: 'Holding:51', deviceId: 'PLC-2', condition: '>', setpoint: 5.0 },
  { name: 'Низкое давление в линии', severity: 'warning', tag: 'Давление линии', tagAddress: 'Holding:10', deviceId: 'PLC-1', condition: '<', setpoint: 35 },
  { name: 'Высокий ток фазы A', severity: 'critical', tag: 'Ток фазы A', tagAddress: 'Holding:60', deviceId: 'PLC-1', condition: '>', setpoint: 20 },
  { name: 'Низкий уровень бака', severity: 'warning', tag: 'Уровень бака 1', tagAddress: 'Holding:30', deviceId: 'PLC-2', condition: '<', setpoint: 1000 },
];

interface AlarmEvent {
  id: string;
  name: string;
  severity: string;
  tag: string;
  tagAddress: string;
  deviceId: string;
  event: string;
  timestamp: string;
  message: string;
  value: number;
  setpoint: number;
  deadband: number;
}

// ====== Connection status simulation ======
const CONNECTIONS = [
  { id: 'conn-1', name: 'Modbus TCP - Цех 1', status: 'connected', protocol: 'Modbus TCP' },
  { id: 'conn-2', name: 'Modbus RTU - Линия 2', status: 'connected', protocol: 'Modbus RTU' },
  { id: 'conn-3', name: 'OPC UA - Сервер 1', status: 'disconnected', protocol: 'OPC UA' },
  { id: 'conn-4', name: 'SNMP - Core Switch', status: 'connected', protocol: 'SNMP' },
  { id: 'conn-5', name: 'MQTT Cloud Bridge', status: 'connected', protocol: 'MQTT v5' },
  { id: 'conn-6', name: 'Siemens S7 - ЧПУ', status: 'connected', protocol: 'S7' },
];

// ====== Broadcast to clients ======
function broadcast(channel: string, data: any) {
  const message = JSON.stringify({ channel, data, timestamp: new Date().toISOString() });
  let sent = 0;
  clients.forEach((client) => {
    if (client.channels.has(channel) || client.channels.has('all')) {
      try {
        client.ws.send(message);
        sent++;
      } catch {
        // Client disconnected
        clients.delete(client.id);
      }
    }
  });
  return sent;
}

// ====== Simulate tag value changes (JSON-LD output) ======
function simulateTagUpdate() {
  const updates: TagValue[] = [];

  TAGS.forEach(tag => {
    // Only update some tags each cycle
    if (Math.random() > 0.4) return;

    let delta = 0;
    switch (tag.groupName) {
      case 'Температуры':
        delta = (Math.random() - 0.5) * 2;
        break;
      case 'Давление':
        delta = (Math.random() - 0.5) * 0.5;
        break;
      case 'Расход':
        delta = (Math.random() - 0.5) * 0.3;
        break;
      case 'Уровни':
        delta = (Math.random() - 0.5) * 20;
        break;
      case 'Двигатели':
        delta = (Math.random() - 0.5) * 5;
        break;
      case 'Вибрация':
        delta = (Math.random() - 0.5) * 0.2;
        break;
      case 'Электричество':
        delta = (Math.random() - 0.5) * 0.3;
        break;
      case 'Окружающая среда':
        delta = (Math.random() - 0.5) * 0.5;
        break;
    }

    if (tag.dataType === 'BOOL') {
      if (Math.random() > 0.98) {
        tag.value = tag.value ? 0 : 1;
        updates.push({ ...tag });
      }
    } else if (tag.dataType === 'INT32' || tag.dataType === 'INT16') {
      tag.value = Math.max(0, tag.value + delta);
      updates.push({ ...tag });
    } else {
      tag.value = Math.max(0, parseFloat((tag.value + delta).toFixed(2)));
      updates.push({ ...tag });
    }
  });

  if (updates.length > 0) {
    // Convert each tag to JSON-LD format
    const jsonLdTags = updates.map(t => tagToJsonLd(t));
    broadcast('tags', { type: 'update', tags: jsonLdTags });
  }
}

// ====== Simulate system metrics (JSON-LD output) ======
function simulateMetrics() {
  cpuUsage = Math.max(5, Math.min(95, cpuUsage + (Math.random() - 0.5) * 8));
  memUsage = Math.max(30, Math.min(90, memUsage + (Math.random() - 0.5) * 4));
  diskUsage = Math.max(30, Math.min(80, diskUsage + (Math.random() - 0.5) * 1));
  netIn = Math.max(0, netIn + (Math.random() - 0.5) * 1000);
  netOut = Math.max(0, netOut + (Math.random() - 0.5) * 800);
  tagRate = Math.max(50, Math.min(300, tagRate + (Math.random() - 0.5) * 20));

  // Convert each metric to JSON-LD format
  const metrics = [
    metricToJsonLd('cpu', Math.round(cpuUsage * 10) / 10, '%'),
    metricToJsonLd('memory', Math.round(memUsage * 10) / 10, '%'),
    metricToJsonLd('disk', Math.round(diskUsage * 10) / 10, '%'),
    metricToJsonLd('networkIn', Math.round(netIn), 'Б/с'),
    metricToJsonLd('networkOut', Math.round(netOut), 'Б/с'),
    metricToJsonLd('tagsPerSecond', Math.round(tagRate), 'тэг/с'),
    metricToJsonLd('connections_active', CONNECTIONS.filter(c => c.status === 'connected').length, ''),
    metricToJsonLd('connections_total', CONNECTIONS.length, ''),
    metricToJsonLd('uptime', Math.floor(process.uptime()), 'с'),
  ];

  broadcast('metrics', metrics);
}

// ====== Simulate alarms (JSON-LD output) ======
function simulateAlarm() {
  if (Math.random() > 0.15) return; // 15% chance per interval

  const template = ALARM_TEMPLATES[Math.floor(Math.random() * ALARM_TEMPLATES.length)];
  const eventType = Math.random() > 0.3 ? 'triggered' : 'cleared';
  const now = new Date().toISOString();

  const alarm: AlarmEvent = {
    id: `alarm-${Date.now()}`,
    name: template.name,
    severity: template.severity,
    tag: template.tag,
    tagAddress: template.tagAddress,
    deviceId: template.deviceId,
    event: eventType,
    timestamp: now,
    message: eventType === 'triggered'
      ? `${template.name}: ${template.tag} ${template.condition} ${template.setpoint}`
      : `${template.name}: нормализовано`,
    value: eventType === 'triggered' ? template.setpoint + (Math.random() - 0.5) * 5 : template.setpoint - Math.random() * 5,
    setpoint: template.setpoint,
    deadband: template.setpoint * 0.05,
  };

  const jsonLdAlarm = toJsonLd("Alarm", `alarm:${alarm.tag.replace(/\s+/g, '_')}:${now}`, {
    name: alarm.name,
    severity: alarm.severity,
    tag: alarm.tag,
    tagAddress: alarm.tagAddress,
    deviceId: alarm.deviceId,
    event: alarm.event,
    message: alarm.message,
    timestamp: alarm.timestamp,
    value: alarm.value,
    setpoint: alarm.setpoint,
    deadband: alarm.deadband,
  });

  broadcast('alarms', jsonLdAlarm);
}

// ====== Periodic status broadcast (with @context reference) ======
function broadcastStatus() {
  const status = {
    "@context": IOT_CONTEXT,
    connections: CONNECTIONS.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      protocol: c.protocol,
    })),
    devicesOnline: CONNECTIONS.filter(c => c.status === 'connected').length,
    totalTags: TAGS.length,
    activeAlarms: Math.floor(Math.random() * 3),
    timestamp: new Date().toISOString(),
  };

  broadcast('status', status);
}

// ====== REST API ======
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    const headers = {
      'Content-Type': 'application/ld+json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check (plain JSON for monitoring tools)
    if (path === '/api/health') {
      return new Response(JSON.stringify({
        status: 'running',
        uptime: process.uptime(),
        port: PORT,
        clients: clients.size,
        tags: TAGS.length,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Get current tag values (JSON-LD)
    if (path === '/api/tags' && req.method === 'GET') {
      const jsonLdTags = TAGS.map(t => tagToJsonLd({ ...t, timestamp: t.timestamp || new Date().toISOString() }));
      return new Response(JSON.stringify({
        "@context": IOT_CONTEXT,
        tags: jsonLdTags,
        count: TAGS.length,
        timestamp: new Date().toISOString(),
      }), { headers });
    }

    // Get current metrics (JSON-LD)
    if (path === '/api/metrics' && req.method === 'GET') {
      const metrics = [
        metricToJsonLd('cpu', Math.round(cpuUsage), '%'),
        metricToJsonLd('memory', Math.round(memUsage), '%'),
        metricToJsonLd('disk', Math.round(diskUsage), '%'),
        metricToJsonLd('networkIn', Math.round(netIn), 'Б/с'),
        metricToJsonLd('networkOut', Math.round(netOut), 'Б/с'),
        metricToJsonLd('tagsPerSecond', Math.round(tagRate), 'тэг/с'),
      ];
      return new Response(JSON.stringify({
        "@context": IOT_CONTEXT,
        metrics,
        timestamp: new Date().toISOString(),
      }), { headers });
    }

    // Write tag value
    if (path === '/api/tags/write' && req.method === 'POST') {
      return req.json().then((body: any) => {
        const { name, value } = body;
        const tag = TAGS.find(t => t.name === name);
        if (tag) {
          tag.value = value;
          tag.timestamp = new Date().toISOString();
          const jsonLdTag = tagToJsonLd(tag);
          broadcast('tags', { type: 'write', tags: [jsonLdTag] });
          return new Response(JSON.stringify({ success: true, tag: jsonLdTag }), { headers });
        }
        return new Response(JSON.stringify({ error: 'Tag not found' }), { status: 404, headers });
      });
    }

    // Get alarm history (JSON-LD)
    if (path === '/api/alarms' && req.method === 'GET') {
      const jsonLdAlarms = ALARM_TEMPLATES.map(t => {
        const now = new Date(Date.now() - Math.random() * 86400000).toISOString();
        return toJsonLd("Alarm", `alarm:${t.tag.replace(/\s+/g, '_')}:${now}`, {
          name: t.name,
          severity: t.severity,
          tag: t.tag,
          tagAddress: t.tagAddress,
          deviceId: t.deviceId,
          event: 'cleared',
          message: `${t.name}: нормализовано`,
          timestamp: now,
          value: 0,
          setpoint: t.setpoint,
          deadband: t.setpoint * 0.05,
        });
      });
      return new Response(JSON.stringify({
        "@context": IOT_CONTEXT,
        alarms: jsonLdAlarms,
        timestamp: new Date().toISOString(),
      }), { headers });
    }

    // WebSocket upgrade
    if (path === '/' || path === '/ws') {
      if (server.upgrade(req)) return;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  },
  websocket: {
    open(ws) {
      const id = `client-${++clientIdCounter}`;
      clients.set(id, {
        id,
        ws,
        channels: new Set(['all']),
        connectedAt: new Date(),
      });
      console.log(`[WS] Client ${id} connected. Total: ${clients.size}`);

      // Send initial system message
      ws.send(JSON.stringify({
        channel: 'system',
        data: { type: 'connected', clientId: id, channels: ['all'] },
        timestamp: new Date().toISOString(),
      }));

      // Send current tag values as JSON-LD
      const jsonLdTags = TAGS.map(t => tagToJsonLd({ ...t, timestamp: t.timestamp || new Date().toISOString() }));
      ws.send(JSON.stringify({
        channel: 'tags',
        data: { type: 'snapshot', tags: jsonLdTags },
        timestamp: new Date().toISOString(),
      }));
    },
    message(ws, message) {
      try {
        const msg = JSON.parse(message as string);

        if (msg.type === 'subscribe') {
          const client = findClient(ws);
          if (client) {
            client.channels = new Set(msg.channels || ['all']);
            console.log(`[WS] Client ${client.id} subscribed to: ${[...client.channels].join(', ')}`);
          }
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (e) {
        console.log(`[WS] Invalid message:`, message);
      }
    },
    close(ws, code, reason) {
      const client = findClient(ws);
      if (client) {
        clients.delete(client.id);
        console.log(`[WS] Client ${client.id} disconnected. Total: ${clients.size}`);
      }
    },
  },
});

function findClient(ws: any): Client | undefined {
  for (const [, client] of clients) {
    if (client.ws === ws) return client;
  }
  return undefined;
}

// Start simulation intervals
setInterval(simulateTagUpdate, 2000);
setInterval(simulateMetrics, 3000);
setInterval(simulateAlarm, 5000);
setInterval(broadcastStatus, 10000);

console.log(`[WS Broker] Real-time data broker running on port ${PORT} (JSON-LD mode)`);
console.log(`[WS Broker] WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
console.log(`[WS Broker] REST endpoints (Content-Type: application/ld+json):`);
console.log(`  GET  /api/health       - Health check`);
console.log(`  GET  /api/tags         - Current tag values (JSON-LD Tag nodes)`);
console.log(`  GET  /api/metrics      - System metrics (JSON-LD Metric nodes)`);
console.log(`  POST /api/tags/write   - Write tag value`);
console.log(`  GET  /api/alarms       - Alarm templates (JSON-LD Alarm nodes)`);
console.log(`\n[WS Broker] Channels: tags (Tag), metrics (Metric), alarms (Alarm), status (@context), all`);
console.log(`[WS Broker] Tag simulation: every 2s`);
console.log(`[WS Broker] Metrics simulation: every 3s`);
console.log(`[WS Broker] Alarm simulation: every 5s`);

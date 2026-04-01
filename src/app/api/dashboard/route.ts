import { NextResponse } from 'next/server';

// GET /api/dashboard - Aggregated dashboard statistics
export async function GET() {
  try {
    return NextResponse.json(getMockDashboard());
  } catch {
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}

function getMockDashboard() {
  const now = new Date();
  return {
    stats: {
      devices: { total: 8, online: 5, offline: 2, error: 1 },
      connections: { total: 8, connected: 5, disconnected: 2, error: 1 },
      tags: { total: 18, active: 15, good: 15, bad: 1, uncertain: 2 },
      alarms: { total: 5, active: 4, critical: 2, warning: 2, acknowledged: 2 },
      flows: { total: 3, running: 2, stopped: 1 },
      northApps: { total: 6, running: 3, stopped: 2, error: 1 },
    },
    recentAlarms: [
      { id: 'alarm-1', name: 'Высокая температура насоса', severity: 'critical', state: 'active', deviceName: 'PLC S7-1200', triggeredAt: new Date(now.getTime() - 1800000).toISOString(), message: 'Температура 87.3°C превышает порог 85°C' },
      { id: 'alarm-2', name: 'Потеря связи с OPC UA', severity: 'critical', state: 'active', deviceName: 'OPC UA Server', triggeredAt: new Date(now.getTime() - 7200000).toISOString(), message: 'Нет ответа от OPC UA сервера более 2 часов' },
      { id: 'alarm-3', name: 'Низкое давление в линии', severity: 'warning', state: 'acknowledged', deviceName: 'PLC S7-1200', triggeredAt: new Date(now.getTime() - 5400000).toISOString(), message: 'Давление 2.1 бар ниже порога 2.5 бар' },
      { id: 'alarm-4', name: 'Высокая вибрация двигателя', severity: 'warning', state: 'active', deviceName: 'Motor Drive ABB', triggeredAt: new Date(now.getTime() - 3600000).toISOString(), message: 'Вибрация 4.8 мм/с превышает порог 4.0 мм/с' },
      { id: 'alarm-5', name: 'Обновление прошивки', severity: 'info', state: 'acknowledged', deviceName: null, triggeredAt: new Date(now.getTime() - 86400000).toISOString(), message: 'Доступна новая версия прошивки v2.2.0' },
    ],
    recentActivity: [
      { id: 'act1', action: 'Соединение Modbus TCP восстановлено', type: 'success', timestamp: new Date(now.getTime() - 120000).toISOString() },
      { id: 'act2', action: 'Авария: Высокая температура насоса', type: 'error', timestamp: new Date(now.getTime() - 600000).toISOString() },
      { id: 'act3', action: 'Устройство "PLC Siemens S7-1200" онлайн', type: 'success', timestamp: new Date(now.getTime() - 1800000).toISOString() },
      { id: 'act4', action: 'Поток "Modbus → MQTT Bridge" запущен', type: 'info', timestamp: new Date(now.getTime() - 3600000).toISOString() },
      { id: 'act5', action: 'Потеря связи с Pressure Transmitter', type: 'warning', timestamp: new Date(now.getTime() - 5400000).toISOString() },
      { id: 'act6', action: 'Тег "Давление линии" записан: 3.2 бар', type: 'info', timestamp: new Date(now.getTime() - 7200000).toISOString() },
      { id: 'act7', action: 'Новое устройство "SNMP Switch" добавлено', type: 'success', timestamp: new Date(now.getTime() - 10800000).toISOString() },
    ],
    connections: [
      { id: 'c1', name: 'Modbus TCP - Цех 1', type: 'Modbus TCP', status: 'connected', host: '192.168.1.10:502', protocol: 'south' },
      { id: 'c2', name: 'Modbus RTU - Линия 2', type: 'Modbus RTU', status: 'connected', host: '/dev/ttyUSB0', protocol: 'south' },
      { id: 'c3', name: 'OPC UA Server', type: 'OPC UA', status: 'disconnected', host: '192.168.1.100:4840', protocol: 'south' },
      { id: 'c4', name: 'SNMP Switch', type: 'SNMP v2c', status: 'connected', host: '192.168.1.1:161', protocol: 'south' },
      { id: 'c5', name: 'BACnet ОВК', type: 'BACnet/IP', status: 'error', host: '192.168.1.200:47808', protocol: 'south' },
      { id: 'c6', name: 'MQTT Cloud', type: 'MQTT v5', status: 'running', host: 'mqtt.eclipseprojects.io:1883', protocol: 'north' },
      { id: 'c7', name: 'Kafka Pipeline', type: 'Kafka', status: 'running', host: 'kafka.local:9092', protocol: 'north' },
      { id: 'c8', name: 'HTTP API Push', type: 'HTTP REST', status: 'stopped', host: 'api.example.com', protocol: 'north' },
    ],
    systemHealth: {
      status: 'healthy',
      uptime: 864000,
      version: '2.1.0',
      startedAt: new Date(now.getTime() - 864000000).toISOString(),
      lastCheck: now.toISOString(),
      components: {
        database: 'healthy',
        modbusEngine: 'healthy',
        mqttBroker: 'healthy',
        flowEngine: 'healthy',
        opcuaClient: 'degraded',
      },
    },
    performance: {
      cpu: 34,
      memory: 62,
      network: { inbound: 1024, outbound: 512 },
      disk: { used: 2.3, total: 16.0 },
      tagsPerSecond: 125,
      avgResponseTime: 12,
      uptimePercent: 99.97,
    },
    topTags: [
      { name: 'Температура насоса', value: 87.3, unit: '°C', quality: 'good', trend: 'up' },
      { name: 'Давление линии', value: 2.1, unit: 'бар', quality: 'good', trend: 'down' },
      { name: 'Скорость двигателя', value: 1450, unit: 'об/мин', quality: 'bad', trend: 'down' },
      { name: 'Вибрация', value: 4.8, unit: 'мм/с', quality: 'uncertain', trend: 'up' },
      { name: 'Уровень бака', value: 678, unit: 'мм', quality: 'good', trend: 'up' },
      { name: 'Мощность', value: 15.3, unit: 'кВт', quality: 'good', trend: 'stable' },
    ],
  };
}

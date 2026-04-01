import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { IOT_CONTEXT, tagToJsonLd, alarmToJsonLd, deviceToJsonLd, metricToJsonLd } from '@/lib/jsonld-model';

const JSONLD_HEADERS = {
  'Content-Type': 'application/ld+json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: JSONLD_HEADERS });
}

/**
 * GET /api/jsonld?resource=tags|alarms|devices|metrics|all&format=expanded|flat
 *
 * Returns data from the IoT Edge Gateway in flat JSON-LD format.
 * Each entity is a flat key-value node with @context, @id, @type.
 *
 * Query params:
 *   resource  - tags | alarms | devices | metrics | all (default: all)
 *   format    - expanded | flat (default: flat)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource') || 'all';
  const format = searchParams.get('format') || 'flat';
  const now = new Date().toISOString();

  try {
    if (resource === 'tags' || resource === 'all') {
      const tags = await getTagsAsJsonLd();
      if (resource === 'tags') {
        return jsonResponse(wrapCollection('Tag', tags, now), format);
      }
    }

    if (resource === 'alarms' || resource === 'all') {
      const alarms = await getAlarmsAsJsonLd();
      if (resource === 'alarms') {
        return jsonResponse(wrapCollection('Alarm', alarms, now), format);
      }
    }

    if (resource === 'devices' || resource === 'all') {
      const devices = await getDevicesAsJsonLd();
      if (resource === 'devices') {
        return jsonResponse(wrapCollection('Device', devices, now), format);
      }
    }

    if (resource === 'metrics' || resource === 'all') {
      const metrics = getMetricsAsJsonLd();
      if (resource === 'metrics') {
        return jsonResponse(wrapCollection('Metric', metrics, now), format);
      }
    }

    // 'all' — combined response
    const [tags, alarms, devices, metrics] = await Promise.all([
      getTagsAsJsonLd(),
      getAlarmsAsJsonLd(),
      getDevicesAsJsonLd(),
      Promise.resolve(getMetricsAsJsonLd()),
    ]);

    const combined = {
      "@context": IOT_CONTEXT,
      "@id": "iot-edge-gateway:export:all",
      "@type": "iot:GatewayExport",
      name: "IoT Edge Gateway — Full Export",
      timestamp: now,
      tags: wrapCollection('Tag', tags, now),
      alarms: wrapCollection('Alarm', alarms, now),
      devices: wrapCollection('Device', devices, now),
      metrics: wrapCollection('Metric', metrics, now),
    };

    return jsonResponse(combined, format);
  } catch (error) {
    return NextResponse.json(
      { "@context": IOT_CONTEXT, "@type": "Error", error: String(error) },
      { status: 500, headers: JSONLD_HEADERS }
    );
  }
}

// ─── Data Fetchers ──────────────────────────────────────────

async function getTagsAsJsonLd() {
  try {
    const tags = await db.tag.findMany({
      where: { deletedAt: null },
      include: { device: true, connection: true },
      orderBy: { createdAt: 'desc' },
    });

    if (tags.length > 0) {
      return tags.map(t => tagToJsonLd({
        name: t.name,
        address: t.address || '',
        value: (t as any).lastValue?.value ?? 0,
        quality: ((t as any).lastValue?.quality as any) || 'good',
        unit: t.unit || '',
        deviceId: t.deviceId || '',
        deviceName: t.device?.name || '',
        groupName: t.group || '',
        dataType: t.dataType || 'FLOAT',
        timestamp: ((t as any).lastValue?.timestamp as string) || new Date().toISOString(),
        scanRate: t.scanRate || 1000,
        protocol: t.connection?.type || 'unknown',
      }));
    }
  } catch { /* fallback to mock */ }

  return getMockTagsAsJsonLd();
}

async function getAlarmsAsJsonLd() {
  try {
    const alarms = await db.alarm.findMany({
      where: { deletedAt: null },
      include: { device: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (alarms.length > 0) {
      return alarms.map(a => alarmToJsonLd({
        name: a.name,
        severity: (a.severity as any) || 'warning',
        tag: a.name,
        tagAddress: '',
        deviceId: a.deviceId || '',
        event: a.state === 'active' ? 'triggered' : 'cleared',
        message: a.description || a.name,
        timestamp: a.triggeredAt?.toISOString() || a.createdAt.toISOString(),
        value: (a as any).triggerValue ?? 0,
        setpoint: 0,
        deadband: 0,
      }));
    }
  } catch { /* fallback to mock */ }

  return getMockAlarmsAsJsonLd();
}

async function getDevicesAsJsonLd() {
  try {
    const devices = await db.device.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (devices.length > 0) {
      return devices.map(d => deviceToJsonLd({
        name: d.name,
        description: d.description || undefined,
        protocolId: d.deviceType || 'unknown',
        protocol: d.deviceType || 'unknown',
        host: d.host || undefined,
        port: d.port || undefined,
        status: d.isActive ? 'connected' : 'disconnected',
        tagCount: 0,
      }));
    }
  } catch { /* fallback to mock */ }

  return getMockDevicesAsJsonLd();
}

function getMetricsAsJsonLd() {
  const uptime = Math.floor(process.uptime?.() ?? 0);
  return [
    metricToJsonLd({ name: 'cpu', value: 34.2, unit: '%' }),
    metricToJsonLd({ name: 'memory', value: 62.1, unit: '%' }),
    metricToJsonLd({ name: 'disk', value: 45.3, unit: '%' }),
    metricToJsonLd({ name: 'uptime', value: uptime, unit: 'с' }),
    metricToJsonLd({ name: 'tagsPolled', value: 18, unit: '' }),
    metricToJsonLd({ name: 'activeConnections', value: 4, unit: '' }),
  ];
}

// ─── Mock Data (fallback when DB is empty) ──────────────────

function getMockTagsAsJsonLd() {
  return [
    tagToJsonLd({ name: 'Температура насоса', address: '40001', value: 23.5, quality: 'good', unit: '°C', deviceId: 'dev-1', deviceName: 'PLC S7-1200', groupName: 'Температура', dataType: 'FLOAT', timestamp: new Date().toISOString(), scanRate: 1000, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Давление линии', address: '40002', value: 101.3, quality: 'good', unit: 'kPa', deviceId: 'dev-1', deviceName: 'PLC S7-1200', groupName: 'Давление', dataType: 'FLOAT', timestamp: new Date().toISOString(), scanRate: 500, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Расход воды', address: '40003', value: 125.4, quality: 'good', unit: 'м³/ч', deviceId: 'dev-4', deviceName: 'Flow Meter', groupName: 'Расход', dataType: 'FLOAT', timestamp: new Date().toISOString(), scanRate: 2000, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Уровень бака', address: '30001', value: 678, quality: 'good', unit: 'мм', deviceId: 'dev-1', deviceName: 'PLC S7-1200', groupName: 'Уровень', dataType: 'INT16', timestamp: new Date().toISOString(), scanRate: 1000, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Скорость двигателя', address: '40004', value: 1450, quality: 'bad', unit: 'об/мин', deviceId: 'dev-5', deviceName: 'Motor Drive ABB', groupName: 'Двигатели', dataType: 'UINT16', timestamp: new Date().toISOString(), scanRate: 500, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Включение насоса', address: '00001', value: 1, quality: 'good', unit: '', deviceId: 'dev-1', deviceName: 'PLC S7-1200', groupName: 'Управление', dataType: 'BOOL', timestamp: new Date().toISOString(), scanRate: 100, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Вибрация', address: '40007', value: 4.2, quality: 'uncertain', unit: 'мм/с', deviceId: 'dev-5', deviceName: 'Motor Drive ABB', groupName: 'Вибрация', dataType: 'FLOAT', timestamp: new Date().toISOString(), scanRate: 100, protocol: 'Modbus TCP' }),
    tagToJsonLd({ name: 'Мощность', address: '40010', value: 15.3, quality: 'good', unit: 'кВт', deviceId: 'dev-5', deviceName: 'Motor Drive ABB', groupName: 'Электричество', dataType: 'FLOAT', timestamp: new Date().toISOString(), scanRate: 500, protocol: 'Modbus TCP' }),
  ];
}

function getMockAlarmsAsJsonLd() {
  return [
    alarmToJsonLd({ name: 'Высокая температура', severity: 'critical', tag: 'Температура насоса', tagAddress: '40001', deviceId: 'dev-1', event: 'triggered', message: 'Температура насоса превысила порог 80°C', timestamp: new Date().toISOString(), value: 85.2, setpoint: 80, deadband: 2 }),
    alarmToJsonLd({ name: 'Повышенная вибрация', severity: 'warning', tag: 'Вибрация', tagAddress: '40007', deviceId: 'dev-5', event: 'triggered', message: 'Вибрация подшипника превышает норму', timestamp: new Date(Date.now() - 300000).toISOString(), value: 4.2, setpoint: 4.0, deadband: 0.5 }),
    alarmToJsonLd({ name: 'Низкое давление', severity: 'warning', tag: 'Давление линии', tagAddress: '40002', deviceId: 'dev-1', event: 'cleared', message: 'Давление в линии нормализовалось', timestamp: new Date(Date.now() - 600000).toISOString(), value: 101.3, setpoint: 90, deadband: 5 }),
  ];
}

function getMockDevicesAsJsonLd() {
  return [
    deviceToJsonLd({ name: 'PLC S7-1200', protocolId: 'modbus-tcp', protocol: 'Modbus TCP', host: '192.168.1.10', port: 502, status: 'connected', tagCount: 8 }),
    deviceToJsonLd({ name: 'Flow Meter', protocolId: 'modbus-tcp', protocol: 'Modbus TCP', host: '192.168.1.20', port: 502, status: 'connected', tagCount: 3 }),
    deviceToJsonLd({ name: 'Motor Drive ABB', protocolId: 'modbus-tcp', protocol: 'Modbus TCP', host: '192.168.1.30', port: 502, status: 'connected', tagCount: 5 }),
    deviceToJsonLd({ name: 'OPC UA Server', protocolId: 'opcua', protocol: 'OPC UA', host: '192.168.1.40', port: 4840, status: 'disconnected', tagCount: 0 }),
  ];
}

// ─── Helpers ────────────────────────────────────────────────

function wrapCollection(type: string, items: unknown[], timestamp: string) {
  return {
    "@context": IOT_CONTEXT,
    "@id": `iot-edge-gateway:collection:${type.toLowerCase()}s`,
    "@type": `iot:${type}Collection`,
    count: items.length,
    timestamp,
    items,
  };
}

function jsonResponse(data: unknown, format: string) {
  const payload = format === 'flat' && typeof data === 'object' && data !== null
    ? flattenAll(data as Record<string, unknown>)
    : data;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: JSONLD_HEADERS,
  });
}

function flattenAll(obj: Record<string, unknown>): unknown {
  if (Array.isArray(obj)) {
    return obj.map(item => flattenAll(item as Record<string, unknown>));
  }

  if (obj && typeof obj === 'object' && '@context' in obj) {
    const { "@context": _ctx, "@type": type, "@id": id, ...rest } = obj;
    return { _id: id, _type: type, ...flattenNested(rest) };
  }

  if (obj && typeof obj === 'object') {
    return flattenNested(obj);
  }

  return obj;
}

function flattenNested(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if ('@context' in nested) {
        const { "@context": _c, "@type": nType, "@id": nId, ...nRest } = nested;
        result[key] = { _id: nId, _type: nType, ...flattenNested(nRest) };
      } else {
        result[key] = flattenNested(nested);
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        item && typeof item === 'object' && !Array.isArray(item) && '@context' in (item as Record<string, unknown>)
          ? flattenAll(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

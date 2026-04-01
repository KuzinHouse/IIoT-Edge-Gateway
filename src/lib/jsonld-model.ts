/**
 * Flat JSON-LD Data Model for IoT Edge Gateway
 *
 * All data inside the system flows through models in flat JSON-LD format.
 * Each entity is represented as a flat key-value node with @id, @type, and @context.
 */

// ─── JSON-LD @context ───────────────────────────────────────────────
export const IOT_CONTEXT: Record<string, string> = {
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
  "Pipeline": "iot:Pipeline",
  "NorthApp": "iot:NorthApp",
  "SouthDevice": "iot:SouthDevice",
  "value": "schema:value",
  "quality": "iot:quality",
  "timestamp": "schema:timestamp",
  "unit": "qudt:unit",
  "address": "iot:address",
  "deviceId": "iot:deviceId",
  "deviceName": "iot:deviceName",
  "protocol": "iot:protocol",
  "protocolId": "iot:protocolId",
  "status": "schema:status",
  "name": "schema:name",
  "description": "schema:description",
  "severity": "iot:severity",
  "event": "iot:event",
  "message": "schema:description",
  "dataType": "iot:dataType",
  "groupName": "iot:groupName",
  "scanRate": "iot:scanRate",
  "host": "schema:url",
  "port": "schema:portNumber",
  "pollInterval": "iot:pollInterval",
  "nodeId": "iot:nodeId",
  "pipelineId": "iot:pipelineId",
  "source": "sosa:hasSource",
  "observedProperty": "sosa:observedProperty",
  "resultTime": "sosa:resultTime",
};

// ─── Types ──────────────────────────────────────────────────────────

export interface JsonLdNode {
  "@context": Record<string, string>;
  "@id": string;
  "@type": string;
  [key: string]: unknown;
}

export interface TagJsonLd extends JsonLdNode {
  "@type": "Tag";
  name: string;
  address: string;
  value: number | string | boolean;
  quality: "good" | "bad" | "uncertain";
  unit: string;
  deviceId: string;
  deviceName: string;
  groupName: string;
  dataType: string;
  timestamp: string;
  scanRate: number;
  protocol: string;
}

export interface AlarmJsonLd extends JsonLdNode {
  "@type": "Alarm";
  name: string;
  severity: "critical" | "warning" | "info";
  tag: string;
  tagAddress: string;
  deviceId: string;
  event: "triggered" | "cleared" | "acknowledged";
  message: string;
  timestamp: string;
  value: number | string | boolean;
  setpoint: number;
  deadband: number;
}

export interface DeviceJsonLd extends JsonLdNode {
  "@type": "Device";
  name: string;
  description?: string;
  protocol: string;
  protocolId: string;
  host?: string;
  port?: number;
  status: string;
  tagCount: number;
  timestamp: string;
}

export interface PipelineMessageJsonLd extends JsonLdNode {
  "@type": "Pipeline";
  pipelineId: string;
  nodeId: string;
  nodeType: string;
  status: string;
  tagsProcessed: number;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface MetricJsonLd extends JsonLdNode {
  "@type": "Metric";
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  deviceId?: string;
}

// ─── Core Helpers ───────────────────────────────────────────────────

export function toJsonLd(
  type: string,
  id: string,
  data: Record<string, unknown>
): JsonLdNode {
  return {
    "@context": IOT_CONTEXT,
    "@id": id,
    "@type": type,
    ...data,
  };
}

export function fromJsonLd(doc: Record<string, unknown>): {
  type: string;
  id: string;
  data: Record<string, unknown>;
} {
  const { "@context": _ctx, "@id": id, "@type": type, ...data } = doc;
  return {
    type: (type as string) || "Unknown",
    id: (id as string) || "",
    data: data as Record<string, unknown>,
  };
}

// ─── Entity Converters ─────────────────────────────────────────────

export function tagToJsonLd(tag: {
  name: string;
  address: string;
  value: number | string | boolean;
  quality: "good" | "bad" | "uncertain";
  unit: string;
  deviceId: string;
  deviceName: string;
  groupName: string;
  dataType: string;
  timestamp: string;
  scanRate?: number;
  protocol?: string;
}): TagJsonLd {
  return toJsonLd("Tag", `tag:${tag.deviceId}:${tag.address}`, {
    name: tag.name,
    address: tag.address,
    value: tag.value,
    quality: tag.quality,
    unit: tag.unit,
    deviceId: tag.deviceId,
    deviceName: tag.deviceName,
    groupName: tag.groupName,
    dataType: tag.dataType,
    timestamp: tag.timestamp,
    scanRate: tag.scanRate ?? 1000,
    protocol: tag.protocol ?? "unknown",
  }) as TagJsonLd;
}

export function alarmToJsonLd(alarm: {
  name: string;
  severity: "critical" | "warning" | "info";
  tag: string;
  tagAddress?: string;
  deviceId?: string;
  event: "triggered" | "cleared" | "acknowledged";
  message: string;
  timestamp: string;
  value?: number | string | boolean;
  setpoint?: number;
  deadband?: number;
}): AlarmJsonLd {
  return toJsonLd("Alarm", `alarm:${alarm.tag}:${alarm.timestamp}`, {
    name: alarm.name,
    severity: alarm.severity,
    tag: alarm.tag,
    tagAddress: alarm.tagAddress ?? "",
    deviceId: alarm.deviceId ?? "",
    event: alarm.event,
    message: alarm.message,
    timestamp: alarm.timestamp,
    value: alarm.value ?? 0,
    setpoint: alarm.setpoint ?? 0,
    deadband: alarm.deadband ?? 0,
  }) as AlarmJsonLd;
}

export function deviceToJsonLd(device: {
  name: string;
  description?: string;
  protocolId: string;
  protocol: string;
  host?: string;
  port?: number;
  status: string;
  tagCount?: number;
}): DeviceJsonLd {
  return toJsonLd("Device", `device:${device.protocolId}:${device.name}`, {
    name: device.name,
    description: device.description ?? "",
    protocol: device.protocol,
    protocolId: device.protocolId,
    host: device.host ?? "",
    port: device.port ?? 0,
    status: device.status,
    tagCount: device.tagCount ?? 0,
    timestamp: new Date().toISOString(),
  }) as DeviceJsonLd;
}

export function pipelineMessageToJsonLd(
  pipelineId: string,
  nodeId: string,
  nodeType: string,
  data: Record<string, unknown>
): PipelineMessageJsonLd {
  return toJsonLd("Pipeline", `pipeline:${pipelineId}:node:${nodeId}`, {
    pipelineId,
    nodeId,
    nodeType,
    status: "processed",
    tagsProcessed: Object.keys(data).length,
    timestamp: new Date().toISOString(),
    data,
  }) as PipelineMessageJsonLd;
}

export function metricToJsonLd(metric: {
  name: string;
  value: number;
  unit?: string;
  deviceId?: string;
}): MetricJsonLd {
  return toJsonLd("Metric", `metric:${metric.name}`, {
    name: metric.name,
    value: metric.value,
    unit: metric.unit ?? "",
    deviceId: metric.deviceId ?? "",
    timestamp: new Date().toISOString(),
  }) as MetricJsonLd;
}

// ─── Validation ─────────────────────────────────────────────────────

export function validateJsonLd(doc: Record<string, unknown>): boolean {
  if (typeof doc !== "object" || doc === null) return false;
  if (typeof doc["@type"] !== "string") return false;
  if (typeof doc["@id"] !== "string") return false;
  return true;
}

// ─── Flatten / Expand ──────────────────────────────────────────────

export function flattenJsonLd(doc: Record<string, unknown>): Record<string, unknown> {
  const { "@context": _ctx, "@type": type, "@id": id, ...rest } = doc;
  return {
    _id: id,
    _type: type,
    ...rest,
  };
}

export function expandJsonLd(doc: Record<string, unknown>): Record<string, unknown> {
  const { "_id": id, "_type": type, ...rest } = doc;
  if (!id || !type) return doc;
  return {
    "@context": IOT_CONTEXT,
    "@id": id,
    "@type": type,
    ...rest,
  };
}

// ─── Batch Conversion ──────────────────────────────────────────────

export function tagsToJsonLdBatch(
  tags: Array<{
    name: string;
    address: string;
    value: number | string | boolean;
    quality: "good" | "bad" | "uncertain";
    unit: string;
    deviceId: string;
    deviceName: string;
    groupName: string;
    dataType: string;
    timestamp: string;
    scanRate?: number;
    protocol?: string;
  }>
): TagJsonLd[] {
  return tags.map(tagToJsonLd);
}

export function alarmsToJsonLdBatch(
  alarms: Array<{
    name: string;
    severity: "critical" | "warning" | "info";
    tag: string;
    tagAddress?: string;
    deviceId?: string;
    event: "triggered" | "cleared" | "acknowledged";
    message: string;
    timestamp: string;
    value?: number | string | boolean;
  }>
): AlarmJsonLd[] {
  return alarms.map(alarmToJsonLd);
}

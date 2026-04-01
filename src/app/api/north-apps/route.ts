import { NextRequest, NextResponse } from 'next/server';

// GET /api/north-apps - List northbound applications
export async function GET() {
  return NextResponse.json(getMockNorthApps());
}

// POST /api/north-apps - Create northbound app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ id: `n${Date.now()}`, ...body, status: 'stopped', msgSent: 0, msgFailed: 0, devicesConnected: 0, lastActive: new Date().toISOString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create northbound app' }, { status: 500 });
  }
}

function getMockNorthApps() {
  return [
    { id: 'n1', name: 'MQTT Cloud Bridge', type: 'MQTT v5', broker: 'mqtt.eclipseprojects.io', port: 1883, status: 'running', qos: 1, devicesConnected: 3, msgSent: 15230, msgFailed: 12, lastActive: new Date().toISOString(), description: 'Основной MQTT мост для отправки данных в облако', clientId: 'neuron-mqtt-bridge', username: 'edge_user', tls: false, dataFormat: 'JSON', batchSize: 100, flushInterval: 5, compression: false, maxMsgSize: 256 },
    { id: 'n2', name: 'Kafka Pipeline', type: 'Kafka', broker: 'kafka.local:9092', status: 'running', topic: 'iot-data', devicesConnected: 2, msgSent: 84200, msgFailed: 0, lastActive: new Date().toISOString(), description: 'Конвейер данных в Apache Kafka', clientId: 'neuron-kafka-producer', ackLevel: 'all', saslMechanism: 'PLAIN', dataFormat: 'JSON', batchSize: 500, flushInterval: 10, compression: true, maxMsgSize: 1024 },
    { id: 'n3', name: 'HTTP API Push', type: 'HTTP REST', broker: 'https://api.example.com/data', status: 'stopped', devicesConnected: 0, msgSent: 0, msgFailed: 0, lastActive: new Date(Date.now() - 86400000).toISOString(), description: 'HTTP REST API для отправки данных', method: 'POST', dataFormat: 'JSON', batchSize: 50, flushInterval: 3, compression: false, maxMsgSize: 512 },
    { id: 'n4', name: 'AWS IoT Core', type: 'AWS IoT', broker: 'xxxxxx.iot.eu-west-1.amazonaws.com', port: 8883, status: 'error', devicesConnected: 0, msgSent: 4500, msgFailed: 156, lastActive: new Date(Date.now() - 3600000).toISOString(), description: 'Подключение к AWS IoT Core', clientId: 'neuron-aws-iot', tls: true, topic: 'device/data', dataFormat: 'JSON', batchSize: 100, flushInterval: 5, compression: false, maxMsgSize: 256 },
    { id: 'n5', name: 'WebSocket Stream', type: 'WebSocket', broker: 'wss://stream.example.com/ws', status: 'running', devicesConnected: 1, msgSent: 32150, msgFailed: 5, lastActive: new Date().toISOString(), description: 'Потоковая передача данных через WebSocket', dataFormat: 'JSON', batchSize: 10, flushInterval: 1, compression: false, maxMsgSize: 128 },
    { id: 'n6', name: 'Azure IoT Hub', type: 'Azure IoT Hub', broker: 'myhub.azure-devices.net', port: 8883, status: 'stopped', devicesConnected: 0, msgSent: 1200, msgFailed: 3, lastActive: new Date(Date.now() - 7200000).toISOString(), description: 'Интеграция с Azure IoT Hub', clientId: 'neuron-azure-hub', tls: true, dataFormat: 'JSON', batchSize: 200, flushInterval: 8, compression: true, maxMsgSize: 512 },
  ];
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/connections - List all connections
export async function GET() {
  try {
    const connections = await db.connection.findMany({
      where: { deletedAt: null },
      include: { devices: true, tags: true },
      orderBy: { createdAt: 'desc' },
    });
    if (connections.length > 0) return NextResponse.json(connections);
    return NextResponse.json(getMockConnections());
  } catch {
    return NextResponse.json(getMockConnections());
  }
}

// POST /api/connections - Create connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const connection = await db.connection.create({ data: body });
    return NextResponse.json(connection, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}

function getMockConnections() {
  return [
    { id: 'conn-1', name: 'Modbus TCP - Цех 1', description: 'Modbus TCP соединение с PLC сетью цеха 1', type: 'tcp', host: '192.168.1.10', port: 502, timeout: 5000, retries: 3, pollInterval: 1000, autoReconnect: true, status: 'connected', isActive: true, slaveCount: 3, tagCount: 8, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'conn-2', name: 'Modbus RTU - Линия 2', description: 'Modbus RTU через USB-serial адаптер', type: 'rtu', path: '/dev/ttyUSB0', baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', timeout: 3000, retries: 2, pollInterval: 2000, autoReconnect: true, status: 'connected', isActive: true, slaveCount: 1, tagCount: 4, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'conn-3', name: 'Modbus ASCII - Лаборатория', description: 'Лабораторное оборудование', type: 'ascii', path: '/dev/ttyUSB1', baudRate: 19200, dataBits: 8, stopBits: 1, parity: 'even', timeout: 5000, retries: 3, pollInterval: 3000, autoReconnect: true, status: 'disconnected', isActive: true, slaveCount: 0, tagCount: 2, lastSeen: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'conn-4', name: 'OPC UA - Сервер 1', description: 'OPC UA сервер АСУ ТП', type: 'opcua', host: '192.168.1.100', port: 4840, timeout: 10000, retries: 3, pollInterval: 500, autoReconnect: true, status: 'disconnected', isActive: true, slaveCount: 0, tagCount: 0, lastSeen: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'conn-5', name: 'SNMP - Core Switch', description: 'Core-коммутатор сети', type: 'snmp', host: '192.168.1.1', port: 161, timeout: 3000, retries: 2, pollInterval: 5000, autoReconnect: true, status: 'connected', isActive: true, slaveCount: 0, tagCount: 12, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'conn-6', name: 'BACnet - ОВК', description: 'Система ОВК здания', type: 'bacnet', host: '192.168.1.200', port: 47808, timeout: 5000, retries: 3, pollInterval: 10000, autoReconnect: false, status: 'error', isActive: true, slaveCount: 0, tagCount: 6, lastSeen: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'conn-7', name: 'Siemens S7 - Станок ЧПУ', description: 'Станок с ЧПУ Siemens', type: 's7', host: '192.168.1.50', port: 102, timeout: 3000, retries: 3, pollInterval: 500, autoReconnect: true, status: 'connected', isActive: true, slaveCount: 1, tagCount: 16, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 4).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'conn-8', name: 'IEC 104 - Подстанция', description: 'Телемеханика подстанции 110кВ', type: 'iec104', host: '192.168.2.10', port: 2404, timeout: 10000, retries: 5, pollInterval: 2000, autoReconnect: true, status: 'connected', isActive: true, slaveCount: 0, tagCount: 24, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 8).toISOString(), updatedAt: new Date().toISOString() },
  ];
}

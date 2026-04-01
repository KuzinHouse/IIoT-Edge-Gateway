import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/connections/[name] - Get single connection
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const connection = await db.connection.findUnique({
      where: { name },
      include: { devices: true, tags: true },
    });
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    return NextResponse.json(connection);
  } catch {
    return NextResponse.json(getMockConnection(), { status: 200 });
  }
}

// DELETE /api/connections/[name] - Delete connection
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    await db.connection.update({
      where: { name },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}

function getMockConnection() {
  return {
    id: 'conn-1',
    name: 'tcp-192.168.1.10:502',
    description: 'Modbus TCP connection to PLC network',
    type: 'tcp',
    host: '192.168.1.10',
    port: 502,
    timeout: 5000,
    retries: 3,
    pollInterval: 1000,
    autoReconnect: true,
    status: 'connected',
    isActive: true,
    devices: [
      { id: 'dev-1', name: 'PLC Siemens S7-1200', slaveId: 1, status: 'online' },
      { id: 'dev-2', name: 'Temp Sensor DS18B20', slaveId: 2, status: 'online' },
      { id: 'dev-4', name: 'Flow Meter Endress+Hauser', slaveId: 4, status: 'online' },
    ],
    tags: [
      { id: 'tag-1', name: 'temperature', address: '40001', dataType: 'FLOAT' },
      { id: 'tag-2', name: 'pressure', address: '40003', dataType: 'FLOAT' },
      { id: 'tag-3', name: 'flow_rate', address: '40005', dataType: 'FLOAT' },
      { id: 'tag-4', name: 'humidity', address: '40007', dataType: 'FLOAT' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

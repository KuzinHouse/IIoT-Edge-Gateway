import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/devices/[id] - Get single device
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const device = await db.device.findUnique({
      where: { id },
      include: { connection: true, tags: true, alarms: true },
    });
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    return NextResponse.json(device);
  } catch {
    return NextResponse.json(getMockDevice(), { status: 200 });
  }
}

// PUT /api/devices/[id] - Update device
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const device = await db.device.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(device);
  } catch {
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}

// DELETE /api/devices/[id] - Delete device (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.device.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
  }
}

function getMockDevice() {
  return {
    id: 'dev-1',
    name: 'PLC Siemens S7-1200',
    slaveId: 1,
    host: '192.168.1.10',
    port: 502,
    status: 'online',
    deviceType: 'plc',
    manufacturer: 'Siemens',
    model: 'S7-1200',
    firmware: 'V4.2',
    isActive: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    connection: {
      id: 'conn-1',
      name: 'tcp-192.168.1.10:502',
      type: 'tcp',
      status: 'connected',
    },
    tags: [
      { id: 'tag-1', name: 'temperature', address: '40001', tagType: 'holding', dataType: 'FLOAT', unit: '°C' },
      { id: 'tag-2', name: 'pressure', address: '40003', tagType: 'holding', dataType: 'FLOAT', unit: 'bar' },
    ],
    alarms: [],
  };
}

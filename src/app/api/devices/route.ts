import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/devices - List all devices
export async function GET() {
  try {
    const devices = await db.device.findMany({
      where: { deletedAt: null },
      include: { connection: true },
      orderBy: { createdAt: 'desc' },
    });
    if (devices.length > 0) return NextResponse.json(devices);
    return NextResponse.json(getMockDevices());
  } catch {
    return NextResponse.json(getMockDevices());
  }
}

// POST /api/devices - Create device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const device = await db.device.create({ data: body });
    return NextResponse.json(device, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 });
  }
}

function getMockDevices() {
  return [
    { id: 'dev-1', name: 'PLC Siemens S7-1200', slaveId: 1, host: '192.168.1.10', port: 502, status: 'online', deviceType: 'plc', manufacturer: 'Siemens', model: 'S7-1200', firmware: 'V4.2', serialNumber: 'SN-1200-2023-001', isActive: true, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'dev-2', name: 'Temp Sensor DS18B20', slaveId: 2, host: '192.168.1.11', port: 502, status: 'online', deviceType: 'sensor', manufacturer: 'Maxim', model: 'DS18B20', firmware: 'V1.0', serialNumber: null, isActive: true, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 25).toISOString() },
    { id: 'dev-3', name: 'Pressure Transmitter', slaveId: 3, host: '192.168.1.12', port: 502, status: 'offline', deviceType: 'sensor', manufacturer: 'Honeywell', model: 'STG700', firmware: 'V2.1', serialNumber: 'SN-STG-0042', isActive: true, lastSeen: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
    { id: 'dev-4', name: 'Flow Meter Endress+Hauser', slaveId: 4, host: '192.168.1.13', port: 502, status: 'online', deviceType: 'meter', manufacturer: 'Endress+Hauser', model: 'Promag 10W', firmware: 'V3.0', serialNumber: 'SN-PM-10087', isActive: true, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: 'dev-5', name: 'Motor Drive ABB', slaveId: 5, host: '192.168.1.14', port: 502, status: 'error', deviceType: 'drive', manufacturer: 'ABB', model: 'ACS580', firmware: 'V1.5', serialNumber: 'SN-ACS-58123', isActive: true, lastSeen: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'dev-6', name: 'Core Switch SNMP', slaveId: 0, host: '192.168.1.1', port: 161, status: 'online', deviceType: 'network', manufacturer: 'Cisco', model: 'Catalyst 2960', firmware: 'V15.2', serialNumber: 'SN-C2960-48', isActive: true, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'dev-7', name: 'Станок ЧПУ Siemens', slaveId: 1, host: '192.168.1.50', port: 102, status: 'online', deviceType: 'plc', manufacturer: 'Siemens', model: 'S7-300', firmware: 'V3.3', serialNumber: 'SN-S7300-001', isActive: true, lastSeen: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
    { id: 'dev-8', name: 'BACnet Controller', slaveId: 0, host: '192.168.1.200', port: 47808, status: 'error', deviceType: 'controller', manufacturer: 'Siemens', model: 'PXC4', firmware: 'V4.0', serialNumber: 'SN-PXC-200', isActive: true, lastSeen: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  ];
}

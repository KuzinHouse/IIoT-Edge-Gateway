import { NextResponse } from 'next/server';

// GET /api/license - Get current license info
export async function GET() {
  return NextResponse.json(getMockLicense());
}

// POST /api/license - Activate license
export async function POST() {
  return NextResponse.json({ success: true, message: 'Лицензия активирована успешно' });
}

function getMockLicense() {
  return {
    type: 'Enterprise',
    owner: 'ООО ПромАвтоматика',
    organization: 'Завод ПромСталь',
    email: 'license@promavtomatika.ru',
    key: 'NEUR-ENTP-2024-XXXX-XXXX-XXXX',
    isActive: true,
    isExpired: false,
    maxDevices: 100,
    maxTags: 10000,
    maxConnections: 50,
    maxUsers: 20,
    maxNorthApps: 10,
    purchaseDate: '2024-01-15T00:00:00.000Z',
    activationDate: '2024-01-15T10:30:00.000Z',
    expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    features: ['modbus-tcp', 'modbus-rtu', 'modbus-ascii', 'opcua', 'snmp', 'bacnet', 's7', 'iec104', 'mqtt', 'kafka', 'http', 'dnp3', 'ethernet-ip', 'flow-engine', 'alarms', 'uns', 'audit-log', 'tls'],
    usage: {
      devices: 8,
      tags: 18,
      connections: 8,
      users: 3,
      northApps: 6,
    },
  };
}

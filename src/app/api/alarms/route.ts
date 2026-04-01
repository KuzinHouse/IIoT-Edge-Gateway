import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/alarms - List alarms
export async function GET() {
  try {
    const alarms = await db.alarm.findMany({
      where: { deletedAt: null },
      include: { device: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (alarms.length > 0) return NextResponse.json(alarms);
    return NextResponse.json(getMockAlarms());
  } catch {
    return NextResponse.json(getMockAlarms());
  }
}

// POST /api/alarms - Create alarm rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const alarm = await db.alarm.create({ data: body });
    return NextResponse.json(alarm, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create alarm' }, { status: 500 });
  }
}

function getMockAlarms() {
  const now = new Date();
  return [
    { id: 'a1', name: 'Высокая температура насоса', description: 'Температура корпуса насоса превысила порог', severity: 'critical', state: 'active', isActive: true, isAcknowledged: false, device: { name: 'PLC S7-1200' }, tag: 'Температура насоса', value: '87.3°C', setpoint: '85°C', triggeredAt: new Date(now.getTime() - 1800000).toISOString(), acknowledgedAt: null, clearedAt: null },
    { id: 'a2', name: 'Потеря связи с OPC UA', description: 'Нет ответа от OPC UA сервера', severity: 'critical', state: 'active', isActive: true, isAcknowledged: false, device: { name: 'OPC UA Server' }, tag: null, value: null, setpoint: null, triggeredAt: new Date(now.getTime() - 7200000).toISOString(), acknowledgedAt: null, clearedAt: null },
    { id: 'a3', name: 'Низкое давление в линии', description: 'Давление в напорной линии ниже порога', severity: 'warning', state: 'acknowledged', isActive: true, isAcknowledged: true, device: { name: 'PLC S7-1200' }, tag: 'Давление линии', value: '2.1 бар', setpoint: '2.5 бар', triggeredAt: new Date(now.getTime() - 5400000).toISOString(), acknowledgedAt: new Date(now.getTime() - 2700000).toISOString(), clearedAt: null },
    { id: 'a4', name: 'Высокая вибрация двигателя', description: 'Вибрация привода ABB превышает порог', severity: 'warning', state: 'active', isActive: true, isAcknowledged: false, device: { name: 'Motor Drive ABB' }, tag: 'Вибрация', value: '4.8 мм/с', setpoint: '4.0 мм/с', triggeredAt: new Date(now.getTime() - 3600000).toISOString(), acknowledgedAt: null, clearedAt: null },
    { id: 'a5', name: 'Обновление прошивки', description: 'Доступна прошивка v2.2.0', severity: 'info', state: 'acknowledged', isActive: true, isAcknowledged: true, device: null, tag: null, value: null, setpoint: null, triggeredAt: new Date(now.getTime() - 86400000).toISOString(), acknowledgedAt: new Date(now.getTime() - 82800000).toISOString(), clearedAt: null },
    { id: 'a6', name: 'Высокий ток фазы A', description: 'Ток фазы A превысил порог', severity: 'warning', state: 'normal', isActive: false, isAcknowledged: true, device: { name: 'Motor Drive ABB' }, tag: 'Ток фазы A', value: '35.2A', setpoint: '30.0A', triggeredAt: new Date(now.getTime() - 10800000).toISOString(), acknowledgedAt: new Date(now.getTime() - 9000000).toISOString(), clearedAt: new Date(now.getTime() - 86400000).toISOString() },
  ];
}

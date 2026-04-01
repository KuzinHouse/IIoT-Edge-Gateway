import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tags - List all tags with current values
export async function GET() {
  try {
    const tags = await db.tag.findMany({
      where: { deletedAt: null },
      include: { device: true, connection: true },
      orderBy: { createdAt: 'desc' },
    });
    if (tags.length > 0) return NextResponse.json(tags);
    return NextResponse.json(getMockTags());
  } catch {
    return NextResponse.json(getMockTags());
  }
}

// POST /api/tags - Create tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tag = await db.tag.create({ data: body });
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

function getMockTags() {
  return [
    { id: 't1', name: 'Температура насоса', address: '40001', group: 'Температура', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: '°C', scale: 1, offset: 0, scanRate: 1000, isActive: true, deviceId: 'dev-1', device: { name: 'PLC S7-1200' }, description: 'Температура корпуса насоса', lastValue: { value: 23.5, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't2', name: 'Давление линии', address: '40002', group: 'Давление', tagType: 'holding', dataType: 'FLOAT', access: 'readWrite', unit: 'kPa', scale: 1, offset: 0, scanRate: 500, isActive: true, deviceId: 'dev-1', device: { name: 'PLC S7-1200' }, description: 'Давление в напорной линии', lastValue: { value: 101.3, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't3', name: 'Расход воды', address: '40003', group: 'Расход', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: 'м³/ч', scale: 1, offset: 0, scanRate: 2000, isActive: true, deviceId: 'dev-4', device: { name: 'Flow Meter' }, description: 'Объёмный расход воды', lastValue: { value: 125.4, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't4', name: 'Уровень бака', address: '30001', group: 'Уровень', tagType: 'input', dataType: 'INT16', access: 'read', unit: 'мм', scale: 1, offset: 0, scanRate: 1000, isActive: true, deviceId: 'dev-1', device: { name: 'PLC S7-1200' }, description: 'Уровень в накопительном баке', lastValue: { value: 678, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't5', name: 'Скорость двигателя', address: '40004', group: 'Двигатели', tagType: 'holding', dataType: 'UINT16', access: 'readWrite', unit: 'об/мин', scale: 1, offset: 0, scanRate: 500, isActive: true, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Скорость вращения двигателя', lastValue: { value: 1450, quality: 'bad', timestamp: new Date().toISOString() } },
    { id: 't6', name: 'Включение насоса', address: '00001', group: 'Управление', tagType: 'coil', dataType: 'BOOL', access: 'readWrite', unit: '', scale: 1, offset: 0, scanRate: 100, isActive: true, deviceId: 'dev-1', device: { name: 'PLC S7-1200' }, description: 'Команда включения насоса', lastValue: { value: 1, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't7', name: 'Влажность', address: '40005', group: 'Окружающая среда', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: '%', scale: 1, offset: 0, scanRate: 5000, isActive: true, deviceId: 'dev-2', device: { name: 'Temp Sensor' }, description: 'Относительная влажность', lastValue: { value: 45.2, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't8', name: 'Ток фазы A', address: '40006', group: 'Электричество', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: 'A', scale: 1, offset: 0, scanRate: 250, isActive: true, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Сила тока фазы A', lastValue: { value: 12.7, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't9', name: 'Вибрация', address: '40007', group: 'Вибрация', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: 'мм/с', scale: 1, offset: 0, scanRate: 100, isActive: true, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Вибрация подшипника', lastValue: { value: 4.2, quality: 'uncertain', timestamp: new Date().toISOString() } },
    { id: 't10', name: 'Температура подшипника', address: '40008', group: 'Температура', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: '°C', scale: 1, offset: 0, scanRate: 1000, isActive: true, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Температура подшипника', lastValue: { value: 52.1, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't11', name: 'Давление воздуха', address: '40009', group: 'Давление', tagType: 'holding', dataType: 'FLOAT', access: 'readWrite', unit: 'бар', scale: 1, offset: 0, scanRate: 1000, isActive: true, deviceId: 'dev-1', device: { name: 'PLC S7-1200' }, description: 'Давление сжатого воздуха', lastValue: { value: 6.2, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't12', name: 'Мощность', address: '40010', group: 'Электричество', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: 'кВт', scale: 1, offset: 0, scanRate: 500, isActive: true, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Потребляемая мощность', lastValue: { value: 15.3, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't13', name: 'Температура подачи', address: '40011', group: 'Температура', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: '°C', scale: 0.1, offset: 0, scanRate: 2000, isActive: true, deviceId: 'dev-2', device: { name: 'Temp Sensor' }, description: 'Температура подачи воды', lastValue: { value: 18.7, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't14', name: 'Частота преобразователя', address: '40012', group: 'Двигатели', tagType: 'holding', dataType: 'FLOAT', access: 'readWrite', unit: 'Гц', scale: 1, offset: 0, scanRate: 500, isActive: true, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Частота ПЧ', lastValue: { value: 48.5, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't15', name: 'pH воды', address: '40013', group: 'Окружающая среда', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: '', scale: 1, offset: 0, scanRate: 10000, isActive: true, deviceId: 'dev-2', device: { name: 'Temp Sensor' }, description: 'Водородный показатель', lastValue: { value: 7.2, quality: 'uncertain', timestamp: new Date().toISOString() } },
    { id: 't16', name: 'Общий расход', address: '40014', group: 'Расход', tagType: 'holding', dataType: 'DOUBLE', access: 'read', unit: 'м³', scale: 1, offset: 0, scanRate: 5000, isActive: true, deviceId: 'dev-4', device: { name: 'Flow Meter' }, description: 'Суммарный расход (итого)', lastValue: { value: 15234.7, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't17', name: 'Статус насоса 2', address: '00002', group: 'Управление', tagType: 'coil', dataType: 'BOOL', access: 'readWrite', unit: '', scale: 1, offset: 0, scanRate: 100, isActive: true, deviceId: 'dev-1', device: { name: 'PLC S7-1200' }, description: 'Команда включения насоса 2', lastValue: { value: 0, quality: 'good', timestamp: new Date().toISOString() } },
    { id: 't18', name: 'Ток фазы B', address: '40015', group: 'Электричество', tagType: 'holding', dataType: 'FLOAT', access: 'read', unit: 'A', scale: 1, offset: 0, scanRate: 250, isActive: false, deviceId: 'dev-5', device: { name: 'Motor Drive ABB' }, description: 'Сила тока фазы B', lastValue: { value: 12.3, quality: 'good', timestamp: new Date(Date.now() - 60000).toISOString() } },
  ];
}

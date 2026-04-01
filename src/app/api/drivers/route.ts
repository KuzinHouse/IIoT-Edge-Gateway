import { NextResponse } from 'next/server';
import { PROTOCOLS, PROTOCOL_CATEGORIES } from '@/lib/protocol-registry';

// GET /api/drivers - List all available drivers
export async function GET() {
  try {
    return NextResponse.json({
      drivers: PROTOCOLS.map(p => ({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        category: p.category,
        categoryName: PROTOCOL_CATEGORIES.find(c => c.id === p.category)?.name || p.category,
        description: p.description,
        descriptionEn: p.descriptionEn,
        version: p.version,
        status: 'available',
        stability: p.status,
        transport: p.transport,
        defaultPort: p.defaultPort,
        isSerial: p.isSerial,
        icon: p.icon,
        color: p.color,
        fieldGroups: Object.keys(p.fields.reduce((acc, f) => {
          acc[f.group || 'general'] = true;
          return acc;
        }, {} as Record<string, boolean>)),
        fieldCount: p.fields.length,
        serialFieldCount: p.serialFields?.length || 0,
        defaultTagCount: p.defaultTags?.length || 0,
        supportedFC: p.supportedFC,
      })),
      categories: PROTOCOL_CATEGORIES,
      totalDrivers: PROTOCOLS.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load drivers' }, { status: 500 });
  }
}

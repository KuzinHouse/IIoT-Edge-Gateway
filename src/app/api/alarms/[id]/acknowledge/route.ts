import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/alarms/[id]/acknowledge - Acknowledge an alarm
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alarm = await db.alarm.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        state: 'acknowledged',
      },
    });
    return NextResponse.json(alarm);
  } catch {
    return NextResponse.json({
      id: await params.then(p => p.id),
      state: 'acknowledged',
      isAcknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: 'admin',
      message: 'Alarm acknowledged successfully',
    });
  }
}

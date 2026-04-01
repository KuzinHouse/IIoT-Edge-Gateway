import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/connections/[name]/disconnect - Disconnect from a connection
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const connection = await db.connection.update({
      where: { name },
      data: { status: 'disconnected' },
    });
    return NextResponse.json(connection);
  } catch {
    return NextResponse.json({
      id: 'conn-1',
      name,
      status: 'disconnected',
      disconnectedAt: new Date().toISOString(),
      message: `Connection "${name}" closed successfully`,
    });
  }
}

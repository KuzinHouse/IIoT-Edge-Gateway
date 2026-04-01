import { NextRequest, NextResponse } from 'next/server';

// GET /api/users - List all users
export async function GET() {
  return NextResponse.json(getMockUsers());
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ id: `u${Date.now()}`, ...body, status: 'active', lastLogin: null, createdAt: new Date().toISOString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

function getMockUsers() {
  return [
    { id: 'u1', name: 'Администратор', email: 'admin@iot.local', role: 'admin', status: 'active', lastLogin: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'u2', name: 'Оператор Иванов', email: 'operator@iot.local', role: 'operator', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: 'u3', name: 'Наблюдатель Петров', email: 'viewer@iot.local', role: 'viewer', status: 'inactive', lastLogin: new Date(Date.now() - 604800000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];
}

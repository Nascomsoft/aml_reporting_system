import { NextResponse } from 'next/server';

const entries: Array<{ user: string; message: string; timestamp: string }> = [];

export async function GET() {
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body || {};
  entries.push({ user: 'system', message, timestamp: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

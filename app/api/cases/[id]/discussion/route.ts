import { NextResponse } from 'next/server';

let entries: Array<{ user: string; message: string; timestamp: string }> = [];

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ entries });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { message } = body || {};
  entries.push({ user: 'system', message, timestamp: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

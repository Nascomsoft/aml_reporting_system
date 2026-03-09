import { NextResponse } from 'next/server';

const timeline: Array<{ event: string; user: string; timestamp: string; ip?: string }> = [];

export async function GET() {
  return NextResponse.json({ timeline });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { event, user, ip } = body || {};
  timeline.push({ event, user, timestamp: new Date().toISOString(), ip });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';

let timeline: Array<{ event: string; user: string; timestamp: string; ip?: string }> = [];

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ timeline });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { event, user, ip } = body || {};
  timeline.push({ event, user, timestamp: new Date().toISOString(), ip });
  return NextResponse.json({ success: true });
}

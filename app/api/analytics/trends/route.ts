import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const timeRange = url.searchParams.get('timeRange') || '24h';
  // generate some trend points
  const points = Array.from({ length: 12 }, (_, i) => {
    return {
      timestamp: new Date(Date.now() - (11 - i) * 3600000).toISOString(),
      alerts: Math.floor(Math.random() * 50),
    };
  });
  return NextResponse.json({ data: points });
}

import { NextResponse } from 'next/server';

export async function GET(request: Request) { 
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '5', 10);
  const severity = url.searchParams.get('severity') || null; // choosable: 'critical', 'high', 'medium', 'low'
  const detectionType = url.searchParams.get('detectionType') || null; // choosable: 'edge', 'core'

  // generate dummy alerts
  const alerts = Array.from({ length: limit }, (_, i) => ({
    id: `alert-${i + 1}`,
    title: `High-risk transaction ${i + 1}`,
    severity: severity || (i % 3 === 0 ? 'critical' : 'high'),
    slsRemaining: Math.floor(Math.random() * 48),
    institution: `Bank ${i + 1}`,
    detectionType: detectionType || (i % 2 === 0 ? 'edge' : 'core'),
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  }));

  return NextResponse.json({ alerts, total: 100, page: 1, pageSize: limit });
}

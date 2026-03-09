import { NextResponse } from 'next/server';

// this route supports both listing with filters and patching individual alerts

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  // read filters
  const severity = url.searchParams.get('severity');
  const detectionType = url.searchParams.get('detectionType');
  const lifecycleStage = url.searchParams.get('lifecycleStage');
  const institution = url.searchParams.get('institution');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const amountMin = url.searchParams.get('amountMin');
  const amountMax = url.searchParams.get('amountMax');

  // In a real implementation, these params would be applied to a database query.
  // For now we return dummy alerts that echo the filters for visibility.

  const alerts = Array.from({ length: pageSize }, (_, i) => ({
    id: `alert-${(page-1)*pageSize + i + 1}`,
    title: `Alert ${(page-1)*pageSize + i + 1}`,
    severity: severity || (i % 3 === 0 ? 'critical' : 'high'),
    slsRemaining: Math.floor(Math.random() * 48),
    institution: institution || `Bank ${i + 1}`,
    detectionType: detectionType || (i % 2 === 0 ? 'edge' : 'core'),
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    lifecycleStage: lifecycleStage || 'new',
    riskScore: Math.floor(Math.random() * 100),
    amount: Math.floor(Math.random() * 10000),
    customerName: `Customer ${i + 1}`,
    ruleTriggered: `Rule ${i % 5}`,
  }));

  return NextResponse.json({ alerts, total: 500, page, pageSize });
}

export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 1];

  const body = await request.json();
  const { lifecycleStage } = body || {};

  // pretend to update the alert in database and audit log
  console.log(`Updating alert ${id} to stage ${lifecycleStage}`);

  return NextResponse.json({ success: true });
}
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  // return dummy case record; in real use query DB
  const caseRecord = {
    id,
    linkedAlerts: ['alert-1', 'alert-2'],
    customer: 'John Doe',
    riskLevel: 'high',
    investigator: 'Alice',
    status: 'underReview',
    escalationLevel: 1,
    complianceDeadline: '2026-03-05',
    slaRemainingHours: 12,
    overdue: false,
  };
  return NextResponse.json(caseRecord);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  const { status } = body || {};
  console.log(`update case ${id} status -> ${status}`);
  return NextResponse.json({ success: true });
}

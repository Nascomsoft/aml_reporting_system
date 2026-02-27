import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: [
      { institution: 'Bank A', riskScore: 88, trend: 5 },
      { institution: 'Bank B', riskScore: 72, trend: -3 },
      { institution: 'Bank C', riskScore: 65, trend: 1 },
      { institution: 'Bank D', riskScore: 50, trend: 0 },
    ],
  });
}

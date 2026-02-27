import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: [
      { region: 'North', riskScore: 70 },
      { region: 'East', riskScore: 82 },
      { region: 'South', riskScore: 45 },
      { region: 'West', riskScore: 60 },
    ],
  });
}

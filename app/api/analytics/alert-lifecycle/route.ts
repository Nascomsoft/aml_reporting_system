import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    new: 56,
    underReview: 102,
    escalated: 35,
    strSubmitted: 28,
    closed: 57,
  });
}

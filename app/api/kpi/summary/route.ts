import { NextResponse } from 'next/server';

export async function GET() {
  // sample KPI summary data
  return NextResponse.json({
    totalTransactions: 124578,
    transactionsTrend: 3.4,
    totalAlerts: 278,
    alertSegmentation: {
      new: 56,
      underReview: 102,
      escalated: 35,
      strSubmitted: 28,
      closed: 57,
    },
    overdueCases: 4,
    slaCountdown: '1h 23m',
    strSubmittedToday: 7,
    edgeDetection: 84,
    coreDetection: 194,
    pendingRegulatoryReviews: 12,
  });
}

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      liveNotifications: Math.floor(Math.random() * 20),
      edgeDetectionCount: Math.floor(Math.random() * 200),
      coreDetectionCount: Math.floor(Math.random() * 500),
      recentlyEscalated: Math.floor(Math.random() * 10),
      approachingSLA: Math.floor(Math.random() * 5),
    });
  } catch (err) {
    console.error('realtime indicator route error', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}

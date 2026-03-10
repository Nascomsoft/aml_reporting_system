import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";

export async function GET() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [
      liveNotifications,
      edgeDetectionCount,
      coreDetectionCount,
      recentlyEscalated,
      approachingSLA,
    ] = await Promise.all([
      prisma.notification.count({ where: { isRead: false } }),
      prisma.alert.count({ where: { detectionType: "EDGE" } }),
      prisma.alert.count({ where: { detectionType: "CORE" } }),
      prisma.alert.count({
        where: {
          lifecycleStage: "ESCALATED",
          updatedAt: { gte: oneHourAgo },
        },
      }),
      prisma.case.count({
        where: {
          slaRemainingHours: { lte: 4 },
          overdue: false,
          status: { not: "CLOSED" },
        },
      }),
    ]);

    return NextResponse.json({
      liveNotifications,
      edgeDetectionCount,
      coreDetectionCount,
      recentlyEscalated,
      approachingSLA,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

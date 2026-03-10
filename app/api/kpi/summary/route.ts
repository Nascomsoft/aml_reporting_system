import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Run all counts in parallel
    const [
      totalTransactions,
      totalAlerts,
      newAlerts,
      underReviewAlerts,
      escalatedAlerts,
      strSubmittedAlerts,
      closedAlerts,
      overdueCases,
      strSubmittedToday,
      edgeDetection,
      coreDetection,
      pendingRegulatoryReviews,
      recentTransactions,
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.alert.count(),
      prisma.alert.count({ where: { lifecycleStage: "NEW" } }),
      prisma.alert.count({ where: { lifecycleStage: "UNDER_REVIEW" } }),
      prisma.alert.count({ where: { lifecycleStage: "ESCALATED" } }),
      prisma.alert.count({ where: { lifecycleStage: "STR_SUBMITTED" } }),
      prisma.alert.count({ where: { lifecycleStage: "CLOSED" } }),
      prisma.case.count({ where: { overdue: true } }),
      prisma.sTRSubmission.count({
        where: { submittedDate: { gte: todayStart } },
      }),
      prisma.alert.count({ where: { detectionType: "EDGE" } }),
      prisma.alert.count({ where: { detectionType: "CORE" } }),
      prisma.sTRSubmission.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.transaction.count({ where: { date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);

    // Calculate trend (recent week vs previous)
    const previousWeekTx = await prisma.transaction.count({
      where: {
        date: {
          gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    const trend = previousWeekTx > 0 ? ((recentTransactions - previousWeekTx) / previousWeekTx) * 100 : 0;

    // Closest SLA
    const urgentCase = await prisma.case.findFirst({
      where: { overdue: false, status: { not: "CLOSED" } },
      orderBy: { slaRemainingHours: "asc" },
      select: { slaRemainingHours: true },
    });
    const slaHours = urgentCase?.slaRemainingHours ?? 0;
    const slaH = Math.floor(slaHours);
    const slaM = Math.round((slaHours - slaH) * 60);

    return NextResponse.json({
      totalTransactions,
      transactionsTrend: Math.round(trend * 10) / 10,
      totalAlerts,
      alertSegmentation: {
        new: newAlerts,
        underReview: underReviewAlerts,
        escalated: escalatedAlerts,
        strSubmitted: strSubmittedAlerts,
        closed: closedAlerts,
      },
      overdueCases,
      slaCountdown: `${slaH}h ${slaM}m`,
      strSubmittedToday,
      edgeDetection,
      coreDetection,
      pendingRegulatoryReviews,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

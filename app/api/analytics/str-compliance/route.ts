import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    await requireRole("regulator");

    // Get STR submission metrics
    const [
      totalSubmissions,
      draftCount,
      submittedCount,
      underReviewCount,
      closedCount,
    ] = await Promise.all([
      prisma.sTRSubmission.count(),
      prisma.sTRSubmission.count({ where: { status: "DRAFT" } }),
      prisma.sTRSubmission.count({ where: { status: "SUBMITTED" } }),
      prisma.sTRSubmission.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.sTRSubmission.count({ where: { status: "CLOSED" } }),
    ]);

    // Get institution-wise submission stats
    const institutionStats = await prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        riskScore: true,
        _count: {
          select: {
            alerts: true,
          },
        },
      },
      orderBy: { riskScore: "desc" },
      take: 10, // Top 10 institutions by risk
    });

    // Get submission trends for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSubmissions = await prisma.sTRSubmission.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Group submissions by day
    const submissionsByDay = new Map<string, Record<string, number>>();
    for (const sub of recentSubmissions) {
      const dateKey = sub.createdAt.toISOString().split("T")[0];
      const dayData = submissionsByDay.get(dateKey) ?? {
        DRAFT: 0,
        SUBMITTED: 0,
        UNDER_REVIEW: 0,
        CLOSED: 0,
      };
      dayData[sub.status] = (dayData[sub.status] ?? 0) + 1;
      submissionsByDay.set(dateKey, dayData);
    }

    const complianceTrends = Array.from(submissionsByDay.entries()).map(
      ([date, counts]) => ({
        date,
        ...counts,
      })
    );

    // Calculate compliance rate
    const complianceRate =
      totalSubmissions > 0
        ? Math.round(((submittedCount + underReviewCount) / totalSubmissions) * 100)
        : 0;

    return NextResponse.json({
      summary: {
        totalSubmissions,
        draft: draftCount,
        submitted: submittedCount,
        underReview: underReviewCount,
        closed: closedCount,
        complianceRate: `${complianceRate}%`,
      },
      institutionStats: institutionStats.map((inst) => ({
        institution: inst.name,
        riskScore: Math.round(inst.riskScore),
        alertCount: inst._count.alerts,
      })),
      complianceTrends,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

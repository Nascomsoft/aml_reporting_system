import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    await requireRole("admin", "regulator");

    // Get STR submission metrics
    const [totalSubmissions, draftCount, submittedCount, underReviewCount, closedCount] =
      await Promise.all([
      prisma.sTRSubmission.count(),
      prisma.sTRSubmission.count({ where: { status: "DRAFT" } }),
      prisma.sTRSubmission.count({ where: { status: "SUBMITTED" } }),
      prisma.sTRSubmission.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.sTRSubmission.count({ where: { status: "CLOSED" } }),
    ]);

    // Get institution-wise submission stats by querying STR submissions through User
    const submissionsByInstitution = await prisma.sTRSubmission.groupBy({
      by: ["submittedById"],
      _count: true,
    });

    // Fetch user institutions and count
    const userIds = submissionsByInstitution.map(s => s.submittedById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        institution: {
          select: {
            id: true,
            name: true,
            riskScore: true,
          },
        },
      },
    });

    const userInstitutionMap = new Map(users.map(u => [u.id, u.institution]));

    // Group submissions by institution and create stats
    const institutionMap = new Map<string, {
      name: string;
      riskScore: number;
      submissionCount: number;
    }>();

    for (const submission of submissionsByInstitution) {
      const institution = userInstitutionMap.get(submission.submittedById);
      if (!institution) continue;

      const key = institution.id;
      if (!institutionMap.has(key)) {
        institutionMap.set(key, {
          name: institution.name,
          riskScore: institution.riskScore,
          submissionCount: 0,
        });
      }

      const stats = institutionMap.get(key)!;
      stats.submissionCount += submission._count;
    }

    // Convert to sorted array (top 10 by risk score)
    const institutionStats = Array.from(institutionMap.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map((inst) => ({
        institution: inst.name,
        riskScore: Math.round(inst.riskScore),
        alertCount: inst.submissionCount,
      }));

    // Get submission trends for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSubmissions = await prisma.sTRSubmission.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Group submissions by day with corrected status mapping
    const submissionsByDay = new Map<string, Record<string, number>>();
    for (const sub of recentSubmissions) {
      const dateKey = sub.createdAt.toISOString().split("T")[0];
      const dayData = submissionsByDay.get(dateKey) ?? {
        PENDING: 0,
        SUBMITTED: 0,
        APPROVED: 0,
        REJECTED: 0,
      };

      // Corrected status mapping:
      // DRAFT -> PENDING
      // SUBMITTED -> PENDING
      // UNDER_REVIEW -> SUBMITTED
      // CLOSED -> APPROVED
      if (sub.status === "CLOSED") {
        dayData.APPROVED += 1;
      } else if (sub.status === "UNDER_REVIEW") {
        dayData.SUBMITTED += 1;
      } else if (sub.status === "SUBMITTED" || sub.status === "DRAFT") {
        dayData.PENDING += 1;
      }

      submissionsByDay.set(dateKey, dayData);
    }

    const complianceTrends = Array.from(submissionsByDay.entries()).map(
      ([date, counts]) => ({
        date,
        ...counts,
      })
    );

    // Calculate compliance rate (SUBMITTED + UNDER_REVIEW + CLOSED as compliant)
    const compliantSubmissions = submittedCount + underReviewCount + closedCount;
    const complianceRate =
      totalSubmissions > 0
        ? Math.round((compliantSubmissions / totalSubmissions) * 100)
        : 0;

    return NextResponse.json({
      summary: {
        totalSubmissions,
        submitted: submittedCount,
        pending: draftCount,
        approved: closedCount,
        rejected: 0,
        complianceRate: `${complianceRate}%`,
      },
      institutionStats,
      complianceTrends,
    });
  } catch (error) {
    console.error("STR Compliance API Error:", error);
    return handleApiError(error);
  }
}

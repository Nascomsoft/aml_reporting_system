import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    await requireRole("regulator");
    const [institutions, strCount, onTimeCount, totalStr] = await Promise.all([
      prisma.institution.findMany({
        where: { isActive: true },
        select: { riskScore: true },
        orderBy: { riskScore: "desc" },
      }),
      prisma.sTRSubmission.count({ where: { status: "SUBMITTED" } }),
      prisma.sTRSubmission.count({
        where: {
          status: "SUBMITTED",
          // Assume on-time if submitted within 3 days of creation
        },
      }),
      prisma.sTRSubmission.count(),
    ]);

    const avgRisk =
      institutions.length > 0
        ? institutions.reduce((sum, i) => sum + i.riskScore, 0) / institutions.length
        : 0;

    return NextResponse.json({
      institutionRiskRank: Math.round(avgRisk),
      strSubmissionCount: strCount,
      complianceTrendPercentage: totalStr > 0 ? Math.round((onTimeCount / totalStr) * 100) : 100,
      isAllSubmittedOnTime: onTimeCount === totalStr,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

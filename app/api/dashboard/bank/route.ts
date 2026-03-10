import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";

export async function GET() {
  try {
    const [
      totalBranches,
      attentionInstitutions,
      casesUnderReview,
      casesPendingEscalation,
    ] = await Promise.all([
      prisma.institution.aggregate({ _sum: { branchCount: true } }),
      prisma.institution.count({ where: { riskScore: { gte: 70 } } }),
      prisma.case.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.case.count({
        where: { status: "UNDER_REVIEW", slaRemainingHours: { lte: 8 } },
      }),
    ]);

    return NextResponse.json({
      branchesMonitored: totalBranches._sum.branchCount ?? 0,
      branchesRequiringAttention: attentionInstitutions,
      casesUnderReview,
      casesPendingEscalation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

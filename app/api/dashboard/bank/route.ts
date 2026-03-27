import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireRole("compliance_officer");
    // Filter data for the officer's institution
    const [
      totalBranches,
      attentionInstitutions,
      casesUnderReview,
      casesPendingEscalation,
    ] = await Promise.all([
      prisma.institution.aggregate({
        where: user.institutionId ? { id: user.institutionId } : {},
        _sum: { branchCount: true },
      }),
      prisma.institution.count({
        where: {
          ...(user.institutionId ? { id: user.institutionId } : {}),
          riskScore: { gte: 70 },
        },
      }),
      prisma.case.count({
        where: {
          ...(user.institutionId
            ? { caseInstitutionId: user.institutionId }
            : {}),
          status: "UNDER_REVIEW",
        },
      }),
      prisma.case.count({
        where: {
          ...(user.institutionId
            ? { caseInstitutionId: user.institutionId }
            : {}),
          status: "UNDER_REVIEW",
          slaRemainingHours: { lte: 8 },
        },
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

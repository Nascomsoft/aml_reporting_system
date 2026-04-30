import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireRole("admin", "regulator");
    const caseWhere =
      user.role === "regulator" && user.institutionId
        ? {
            status: "UNDER_REVIEW" as const,
            linkedAlerts: {
              some: {
                institutionId: user.institutionId,
              },
            },
          }
        : {
            status: "UNDER_REVIEW" as const,
          };

    // Filter data for the non-admin user's institution when available
    const [
      totalBranches,
      attentionInstitutions,
      casesUnderReview,
      casesPendingEscalation,
    ] = await Promise.all([
      prisma.institution.aggregate({
        where: user.role === "regulator" && user.institutionId ? { id: user.institutionId } : {},
        _sum: { branchCount: true },
      }),
      prisma.institution.count({
        where: {
          ...(user.role === "regulator" && user.institutionId ? { id: user.institutionId } : {}),
          riskScore: { gte: 70 },
        },
      }),
      prisma.case.count({
        where: caseWhere,
      }),
      prisma.case.count({
        where: {
          ...caseWhere,
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

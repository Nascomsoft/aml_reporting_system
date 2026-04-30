import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

function getRiskLevel(riskScore: number): "low" | "medium" | "high" | "critical" {
  if (riskScore >= 85) return "critical";
  if (riskScore >= 70) return "high";
  if (riskScore >= 50) return "medium";
  return "low";
}

function getComplianceStatus(
  isActive: boolean,
  riskScore: number
): "compliant" | "warning" | "non_compliant" {
  if (!isActive) return "non_compliant";
  if (riskScore >= 80) return "warning";
  return "compliant";
}

export async function GET() {
  try {
    await requireRole("admin", "regulator");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const institutions = await prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        riskScore: true,
      },
      orderBy: { name: "asc" },
    });

    const financialInstitutions = await Promise.all(
      institutions.map(async (financialInstitution) => {
        const [alertsThisMonth, submissions] = await Promise.all([
          prisma.alert.count({
            where: {
              institutionId: financialInstitution.id,
              timestamp: { gte: startOfMonth },
            },
          }),
          prisma.sTRSubmission.findMany({
            where: {
              submittedBy: {
                institutionId: financialInstitution.id,
              },
            },
            select: {
              createdAt: true,
              submittedDate: true,
              updatedAt: true,
            },
          }),
        ]);

        const reviewDurations = submissions.map((submission) => {
          const endDate = submission.submittedDate ?? submission.updatedAt;
          return (endDate.getTime() - submission.createdAt.getTime()) / 86_400_000;
        });

        const averageReviewTime =
          reviewDurations.length > 0
            ? Number(
                (
                  reviewDurations.reduce((sum, duration) => sum + duration, 0) /
                  reviewDurations.length
                ).toFixed(1)
              )
            : 0;

        return {
          id: financialInstitution.id,
          name: financialInstitution.name,
          code: financialInstitution.code,
          status: financialInstitution.isActive ? "verified" : "suspended",
          alertsThisMonth,
          riskScore: Math.round(financialInstitution.riskScore),
          riskLevel: getRiskLevel(financialInstitution.riskScore),
          strSubmissions: submissions.length,
          averageReviewTime,
          complianceStatus: getComplianceStatus(
            financialInstitution.isActive,
            financialInstitution.riskScore
          ),
        };
      })
    );

    return NextResponse.json({ financialInstitutions });
  } catch (error) {
    return handleApiError(error);
  }
}

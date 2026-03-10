import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";

export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      where: { isActive: true },
      select: { name: true, riskScore: true },
      orderBy: { riskScore: "desc" },
    });

    // Compute trend as delta between current risk and alert count-based approximation
    const data = await Promise.all(
      institutions.map(async (inst) => {
        const recentAlerts = await prisma.alert.count({
          where: {
            institution: { name: inst.name },
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });
        const olderAlerts = await prisma.alert.count({
          where: {
            institution: { name: inst.name },
            timestamp: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });
        const trend = recentAlerts - olderAlerts;
        return {
          institution: inst.name,
          riskScore: Math.round(inst.riskScore),
          trend,
        };
      })
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

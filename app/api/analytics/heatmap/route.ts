import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireAuth();
    
    // Officers see only their institution; admin/regulator see all
    let institutions;
    if (user.role === "regulator" && user.institutionId) {
      institutions = await prisma.institution.findMany({
        where: { isActive: true, id: user.institutionId },
        select: { region: true, riskScore: true },
      });
    } else {
      institutions = await prisma.institution.findMany({
        where: { isActive: true },
        select: { region: true, riskScore: true },
      });
    }

    const regionMap = new Map<string, number[]>();
    for (const inst of institutions) {
      const scores = regionMap.get(inst.region) ?? [];
      scores.push(inst.riskScore);
      regionMap.set(inst.region, scores);
    }

    const data = Array.from(regionMap.entries()).map(([region, scores]) => ({
      region,
      riskScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

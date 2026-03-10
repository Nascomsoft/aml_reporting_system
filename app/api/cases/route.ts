import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { fromSeverity, fromLifecycle } from "@/lib/enumMaps";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        include: {
          linkedAlerts: { select: { id: true } },
          investigator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.case.count(),
    ]);

    return NextResponse.json({
      cases: cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        linkedAlerts: c.linkedAlerts.map((a) => a.id),
        customer: c.customer,
        riskLevel: fromSeverity(c.riskLevel),
        investigator: c.investigator?.name ?? null,
        status: fromLifecycle(c.status),
        escalationLevel: c.escalationLevel,
        complianceDeadline: c.complianceDeadline.toISOString().split("T")[0],
        slaRemainingHours: c.slaRemainingHours,
        overdue: c.overdue,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { fromSeverity, fromLifecycle, toSeverity, toLifecycle } from "@/lib/enumMaps";
import { requireAuth } from "@/lib/session";
import { scopedCaseWhere } from "@/lib/workflowAuth";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
    const search = url.searchParams.get("search") || "";
    const riskLevel = url.searchParams.get("riskLevel");
    const status = url.searchParams.get("status");

    // Build filter conditions
    const where: Prisma.CaseWhereInput = scopedCaseWhere(user);
    
    if (search) {
      where.OR = [
        { caseNumber: { contains: search, mode: "insensitive" } },
        { customer: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (riskLevel && riskLevel !== "all") {
      where.riskLevel = toSeverity(riskLevel);
    }
    
    if (status && status !== "all") {
      const statusMap: Record<string, string> = {
        new: "new",
        underreview: "underReview",
        underReview: "underReview",
        escalated: "escalated",
        strsubmitted: "strSubmitted",
        strSubmitted: "strSubmitted",
        closed: "closed",
      };
      where.status = toLifecycle(statusMap[status] ?? status);
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          linkedAlerts: { select: { id: true } },
          investigator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.case.count({ where }),
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
        createdAt: c.createdAt.toISOString().split("T")[0],
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

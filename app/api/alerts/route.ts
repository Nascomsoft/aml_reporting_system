import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { alertFiltersSchema, alertUpdateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import {
  toSeverity,
  toLifecycle,
  fromSeverity,
  fromLifecycle,
} from "@/lib/enumMaps";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { scopedAlertWhere, assertAlertAccess } from "@/lib/workflowAuth";
import { createAuditLog } from "@/lib/auditLog";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams);
    const filters = alertFiltersSchema.parse(raw);

    const where: Prisma.AlertWhereInput = scopedAlertWhere(user);

    if (filters.severity) where.severity = toSeverity(filters.severity);
    if (filters.lifecycleStage) where.lifecycleStage = toLifecycle(filters.lifecycleStage);
    if (filters.institution) {
      where.institution = { name: { contains: filters.institution, mode: "insensitive" } };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.timestamp.lte = new Date(filters.dateTo);
    }
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where.amount = {};
      if (filters.amountMin !== undefined) where.amount.gte = filters.amountMin;
      if (filters.amountMax !== undefined) where.amount.lte = filters.amountMax;
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: { institution: { select: { name: true } } },
        orderBy:
          filters.sortBy === "timestamp"
            ? { timestamp: "desc" }
            : { slsRemaining: "asc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.alert.count({ where }),
    ]);

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        title: a.title,
        severity: fromSeverity(a.severity),
        slsRemaining: a.slsRemaining,
        institution: a.institution?.name ?? "",
        timestamp: a.timestamp.toISOString(),
        lifecycleStage: fromLifecycle(a.lifecycleStage),
        riskScore: a.riskScore,
        amount: a.amount,
        customerName: a.customerName,
        accountNumber: a.accountNumber,
        ruleTriggered: a.ruleTriggered,
        caseId: a.caseId,
        transactionIds: a.transactionIds,
      })),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "Alert id is required" }, { status: 400 });
    }
    const data = alertUpdateSchema.parse(rest);

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    assertAlertAccess(user, existing);

    const alert = await prisma.alert.update({
      where: { id },
      data: { lifecycleStage: toLifecycle(data.lifecycleStage) },
    });

    await createAuditLog({
      userId: user.id,
      action: "ALERT_UPDATE",
      resource: "alert",
      resourceId: alert.id,
      changes: { lifecycleStage: data.lifecycleStage },
    });

    return NextResponse.json({
      success: true,
      alert: { id: alert.id, lifecycleStage: fromLifecycle(alert.lifecycleStage) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

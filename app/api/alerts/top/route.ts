import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { toSeverity, toDetectionType, fromSeverity, fromDetectionType, fromLifecycle } from "@/lib/enumMaps";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);
    const severity = url.searchParams.get("severity");
    const detectionType = url.searchParams.get("detectionType");

    const where: Prisma.AlertWhereInput = {};
    if (severity && severity !== "all") where.severity = toSeverity(severity);
    if (detectionType && detectionType !== "all") where.detectionType = toDetectionType(detectionType);

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: { institution: { select: { name: true } } },
        orderBy: [{ riskScore: "desc" }, { slsRemaining: "asc" }],
        take: limit,
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
        detectionType: fromDetectionType(a.detectionType),
        timestamp: a.timestamp.toISOString(),
        lifecycleStage: fromLifecycle(a.lifecycleStage),
      })),
      total,
      page: 1,
      pageSize: limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

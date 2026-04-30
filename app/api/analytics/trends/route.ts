import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const timeRange = url.searchParams.get("timeRange") || "24h";

    // Determine the time window
    const rangeMs: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    const ms = rangeMs[timeRange] ?? rangeMs["24h"];
    const since = new Date(Date.now() - ms);

    // Build where clause based on role
    const whereClause = user.role === "regulator" && user.institutionId
      ? { timestamp: { gte: since }, institutionId: user.institutionId }
      : { timestamp: { gte: since } };

    // Fetch all alerts within the range
    const alerts = await prisma.alert.findMany({
      where: whereClause,
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
    });

    // Group into 12 buckets
    const bucketCount = 12;
    const bucketMs = ms / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      timestamp: new Date(since.getTime() + (i + 0.5) * bucketMs).toISOString(),
      alerts: 0,
    }));

    for (const a of alerts) {
      const idx = Math.min(
        Math.floor((a.timestamp.getTime() - since.getTime()) / bucketMs),
        bucketCount - 1
      );
      if (idx >= 0) buckets[idx].alerts++;
    }

    return NextResponse.json({ data: buckets });
  } catch (error) {
    return handleApiError(error);
  }
}

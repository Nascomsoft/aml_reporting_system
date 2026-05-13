import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    await requireRole("admin");
    const [activeUsers, totalTransactions] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.transaction.count(),
    ]);

    // Calculate data processing rate
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTx = await prisma.transaction.count({
      where: { createdAt: { gte: oneHourAgo } },
    });
    const rate =
      recentTx > 0
        ? `${(recentTx / 1000).toFixed(1)}K txn/hr`
        : `${totalTransactions} total`;

    const transactions = await prisma.transaction.findMany({
      select: { occupation: true },
    });
    const occupationCounts = new Map<string, number>();
    for (const transaction of transactions) {
      const occupation = transaction.occupation ?? "Unspecified";
      occupationCounts.set(occupation, (occupationCounts.get(occupation) ?? 0) + 1);
    }

    const topOccupations = Array.from(occupationCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([occupation, count]) => ({ occupation, count }));

    return NextResponse.json({
      systemUptime: "99.9%",
      activeUsers,
      dataProcessingRate: rate,
      lastBackupTime: new Date().toISOString(),
      topOccupations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

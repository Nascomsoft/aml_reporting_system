import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireAuth();
    
    // Build where clause based on role
    const whereClause = user.role === "regulator" && user.institutionId
      ? { institutionId: user.institutionId }
      : {};

    const [newCount, underReview, escalated, strSubmitted, closed] =
      await Promise.all([
        prisma.alert.count({ where: { ...whereClause, lifecycleStage: "NEW" } }),
        prisma.alert.count({ where: { ...whereClause, lifecycleStage: "UNDER_REVIEW" } }),
        prisma.alert.count({ where: { ...whereClause, lifecycleStage: "ESCALATED" } }),
        prisma.alert.count({ where: { ...whereClause, lifecycleStage: "STR_SUBMITTED" } }),
        prisma.alert.count({ where: { ...whereClause, lifecycleStage: "CLOSED" } }),
      ]);

    return NextResponse.json({
      new: newCount,
      underReview,
      escalated,
      strSubmitted,
      closed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

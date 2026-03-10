import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";

export async function GET() {
  try {
    const [newCount, underReview, escalated, strSubmitted, closed] =
      await Promise.all([
        prisma.alert.count({ where: { lifecycleStage: "NEW" } }),
        prisma.alert.count({ where: { lifecycleStage: "UNDER_REVIEW" } }),
        prisma.alert.count({ where: { lifecycleStage: "ESCALATED" } }),
        prisma.alert.count({ where: { lifecycleStage: "STR_SUBMITTED" } }),
        prisma.alert.count({ where: { lifecycleStage: "CLOSED" } }),
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

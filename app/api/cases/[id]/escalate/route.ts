import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseEscalateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { createCaseAudit } from "@/lib/auditLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = caseEscalateSchema.parse(body);

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: "ESCALATED",
        escalationLevel: { increment: 1 },
      },
    });

    // Also update linked alerts
    await prisma.alert.updateMany({
      where: { caseId: id },
      data: { lifecycleStage: "ESCALATED" },
    });

    await createCaseAudit({
      caseId: id,
      event: `Case escalated to regulator. Reason: ${data.reason}`,
      user: "system",
      details: data.reason,
    });

    return NextResponse.json({
      success: true,
      escalationLevel: updated.escalationLevel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

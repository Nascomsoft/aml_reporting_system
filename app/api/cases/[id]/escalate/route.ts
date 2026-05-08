import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseEscalateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { createCaseAudit } from "@/lib/auditLog";
import { requireAuth } from "@/lib/session";
import { assertCaseAccess } from "@/lib/workflowAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = caseEscalateSchema.parse(body);

    const existing = await prisma.case.findUnique({
      where: { id },
      include: { linkedAlerts: { select: { institutionId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    assertCaseAccess(user, existing);

    const updated = await prisma.$transaction(async (tx) => {
      const escalated = await tx.case.update({
        where: { id },
        data: {
          status: "ESCALATED",
          escalationLevel: { increment: 1 },
        },
      });

      await tx.alert.updateMany({
        where: { caseId: id },
        data: { lifecycleStage: "ESCALATED" },
      });

      return escalated;
    });

    await createCaseAudit({
      caseId: id,
      event: `Case escalated to regulator. Reason: ${data.reason}`,
      user: user.name,
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

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseUpdateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { fromSeverity, fromLifecycle, toLifecycle } from "@/lib/enumMaps";
import { createCaseAudit } from "@/lib/auditLog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        linkedAlerts: { select: { id: true, title: true } },
        investigator: { select: { name: true } },
      },
    });

    if (!c) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({
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
      summary: c.summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = caseUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = toLifecycle(data.status);
    if (data.investigatorId) updateData.investigatorId = data.investigatorId;
    if (data.escalationLevel !== undefined) updateData.escalationLevel = data.escalationLevel;
    if (data.summary) updateData.summary = data.summary;

    const updated = await prisma.case.update({
      where: { id },
      data: updateData,
    });

    await createCaseAudit({
      caseId: id,
      event: `Case updated: ${Object.keys(updateData).join(", ")}`,
      user: "system",
    });

    return NextResponse.json({
      success: true,
      case: { id: updated.id, status: fromLifecycle(updated.status) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

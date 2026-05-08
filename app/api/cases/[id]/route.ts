import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseUpdateSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { fromSeverity, fromLifecycle, toLifecycle } from "@/lib/enumMaps";
import { createCaseAudit } from "@/lib/auditLog";
import { requireAuth } from "@/lib/session";
import { assertCaseAccess } from "@/lib/workflowAuth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        linkedAlerts: {
          select: {
            id: true,
            title: true,
            severity: true,
            lifecycleStage: true,
            riskScore: true,
            amount: true,
            customerName: true,
            accountNumber: true,
            ruleTriggered: true,
            institutionId: true,
            transactionIds: true,
          },
        },
        investigator: { select: { name: true } },
      },
    });

    if (!c) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    assertCaseAccess(user, c);

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
      linkedAlertDetails: c.linkedAlerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        severity: fromSeverity(alert.severity),
        lifecycleStage: fromLifecycle(alert.lifecycleStage),
        riskScore: alert.riskScore,
        amount: alert.amount,
        customerName: alert.customerName,
        accountNumber: alert.accountNumber,
        ruleTriggered: alert.ruleTriggered,
        transactionIds: alert.transactionIds,
      })),
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
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = caseUpdateSchema.parse(body);

    const existing = await prisma.case.findUnique({
      where: { id },
      include: { linkedAlerts: { select: { institutionId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    assertCaseAccess(user, existing);

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
      user: user.name,
    });

    return NextResponse.json({
      success: true,
      case: { id: updated.id, status: fromLifecycle(updated.status) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { alertCaseTransitionSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";
import { assertAlertAccess, assertCaseAccess } from "@/lib/workflowAuth";
import { fromLifecycle } from "@/lib/enumMaps";
import { createAuditLog } from "@/lib/auditLog";

function makeCaseNumber(): string {
  return `CASE-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data = alertCaseTransitionSchema.parse(body);

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { case: { include: { linkedAlerts: { select: { institutionId: true } } } } },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    assertAlertAccess(user, alert);

    if (data.caseId) {
      const existingCase = await prisma.case.findUnique({
        where: { id: data.caseId },
        include: { linkedAlerts: { select: { institutionId: true } } },
      });

      if (!existingCase) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }

      assertCaseAccess(user, existingCase);

      const updatedCase = await prisma.$transaction(async (tx) => {
        const linkedCase = await tx.case.update({
          where: { id: existingCase.id },
          data: {
            status: existingCase.status === "NEW" ? "UNDER_REVIEW" : existingCase.status,
            summary: data.summary ?? existingCase.summary,
          },
        });

        await tx.alert.update({
          where: { id: alert.id },
          data: {
            caseId: existingCase.id,
            lifecycleStage: "UNDER_REVIEW",
          },
        });

        await tx.caseAuditEntry.create({
          data: {
            caseId: existingCase.id,
            event: `Alert linked: ${alert.title}`,
            user: user.name,
            details: data.note,
          },
        });

        return linkedCase;
      });

      await createAuditLog({
        userId: user.id,
        action: "CASE_UPDATE",
        resource: "case",
        resourceId: updatedCase.id,
        changes: { linkedAlertId: alert.id },
      });

      return NextResponse.json({
        success: true,
        case: {
          id: updatedCase.id,
          caseNumber: updatedCase.caseNumber,
          status: fromLifecycle(updatedCase.status),
        },
      });
    }

    const createdCase = await prisma.$transaction(async (tx) => {
      const nextCase = await tx.case.create({
        data: {
          caseNumber: makeCaseNumber(),
          customer: alert.customerName,
          riskLevel: alert.severity,
          status: "UNDER_REVIEW",
          complianceDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
          slaRemainingHours: alert.slsRemaining,
          overdue: alert.slsRemaining <= 0,
          summary:
            data.summary ??
            alert.description ??
            `Investigation opened from alert ${alert.title}`,
          investigatorId: user.id,
        },
      });

      await tx.alert.update({
        where: { id: alert.id },
        data: {
          caseId: nextCase.id,
          lifecycleStage: "UNDER_REVIEW",
        },
      });

      await tx.caseAuditEntry.createMany({
        data: [
          {
            caseId: nextCase.id,
            event: `Case created from alert: ${alert.title}`,
            user: user.name,
            details: data.note,
          },
          {
            caseId: nextCase.id,
            event: "Status changed to Under Review",
            user: user.name,
          },
        ],
      });

      return nextCase;
    });

    await createAuditLog({
      userId: user.id,
      action: "CASE_CREATE",
      resource: "case",
      resourceId: createdCase.id,
      changes: { alertId: alert.id },
    });

    return NextResponse.json(
      {
        success: true,
        case: {
          id: createdCase.id,
          caseNumber: createdCase.caseNumber,
          status: fromLifecycle(createdCase.status),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

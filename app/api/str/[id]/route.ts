import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { fromSeverity, fromSTRStatus, toSTRStatus } from "@/lib/enumMaps";
import { isMongoObjectId } from "@/lib/mongo";
import { requireAuth } from "@/lib/session";
import { strUpdateSchema } from "@/lib/validation";
import { assertSTRAccess } from "@/lib/workflowAuth";
import { createAuditLog } from "@/lib/auditLog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const submission = await prisma.sTRSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        transactionSummary: true,
        customerName: true,
        accountNumber: true,
        descriptionOfSuspicion: true,
        rulesTriggered: true,
        behavioralDeviations: true,
        narrative: true,
        riskClassification: true,
        status: true,
        transactionIds: true,
        submittedDate: true,
        createdAt: true,
        supportingDocuments: true,
        submittedById: true,
        caseId: true,
        case: { select: { linkedAlerts: { select: { institutionId: true } } } },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "STR submission not found" },
        { status: 404 }
      );
    }

    // Fetch user info separately to handle nulls
    let user = null;
    if (submission.submittedById) {
      user = await prisma.user.findUnique({
        where: { id: submission.submittedById },
        select: {
          id: true,
          name: true,
          email: true,
          institutionId: true,
          institution: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    assertSTRAccess(authUser, {
      submittedById: submission.submittedById,
      submittedBy: user ? { institutionId: user.institutionId ?? null } : null,
      case: submission.case,
    });

    // Fetch case info separately to handle nulls
    let caseRecord = null;
    if (submission.caseId) {
      caseRecord = await prisma.case.findUnique({
        where: { id: submission.caseId },
        select: {
          caseNumber: true,
        },
      });
    }

    // Fetch linked transactions, but handle errors gracefully
    let linkedTransactions: Awaited<ReturnType<typeof prisma.transaction.findMany>> = [];
    if (submission.transactionIds && submission.transactionIds.length > 0) {
      try {
        const objectIds = submission.transactionIds.filter(isMongoObjectId);
        const transactionRefs = submission.transactionIds.filter((id) => !isMongoObjectId(id));

        linkedTransactions = await prisma.transaction.findMany({
          where: {
            OR: [
              ...(objectIds.length > 0 ? [{ id: { in: objectIds } }] : []),
              ...(transactionRefs.length > 0
                ? [{ transactionRef: { in: transactionRefs } }]
                : []),
            ],
          },
        });
      } catch (err) {
        // Silently handle transaction lookup errors
        console.warn("Warning: Could not fetch linked transactions:", err);
      }
    }

    return NextResponse.json({
      id: submission.id,
      transactionSummary: submission.transactionSummary,
      customerName: submission.customerName,
      accountNumber: submission.accountNumber,
      descriptionOfSuspicion: submission.descriptionOfSuspicion,
      rulesTriggered: submission.rulesTriggered.map((rule) => ({
        ruleName: rule,
        severity: fromSeverity(submission.riskClassification),
        description: "Rule linked to this submitted STR",
      })),
      behavioralDeviations: (submission.behavioralDeviations || []).map((deviation) => ({
        metric: deviation,
        baseline: "Expected profile",
        current: "Observed investigation pattern",
        deviation,
        riskLevel: fromSeverity(submission.riskClassification),
      })),
      narrative: submission.narrative,
      riskClassification: fromSeverity(submission.riskClassification),
      status: fromSTRStatus(submission.status),
      caseNumber: caseRecord?.caseNumber ?? null,
      caseId: submission.caseId ?? null,
      submittedBy: user?.name ?? "System",
      submittingFinancialInstitution:
        user?.institution?.name ?? "Unassigned Institution",
      submittedDate: submission.submittedDate?.toISOString() ?? null,
      createdAt: submission.createdAt.toISOString(),
      linkedTransactions: linkedTransactions.map((t) => ({
        id: t.id,
        transactionRef: t.transactionRef,
        amount: t.amount,
        currency: t.currency,
        date: t.date?.toISOString() ?? null,
        origin: t.accountNumber || "",
        destination: t.country || "",
      })),
      supportingDocuments: submission.supportingDocuments || [],
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
    const data = strUpdateSchema.parse(body);

    const existing = await prisma.sTRSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        submittedById: true,
        caseId: true,
        status: true,
        transactionSummary: true,
        narrative: true,
        case: { select: { linkedAlerts: { select: { institutionId: true } } } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "STR submission not found" }, { status: 404 });
    }
    assertSTRAccess(user, existing);

    const nextStatus = data.status ? toSTRStatus(data.status) : existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.sTRSubmission.update({
        where: { id },
        data: {
          transactionSummary: data.transactionSummary,
          narrative: data.narrative,
          status: nextStatus,
        },
      });

      if (existing.caseId && nextStatus === "CLOSED") {
        await tx.case.update({
          where: { id: existing.caseId },
          data: { status: "CLOSED" },
        });
        await tx.alert.updateMany({
          where: { caseId: existing.caseId },
          data: { lifecycleStage: "CLOSED" },
        });
      }

      if (existing.caseId) {
        await tx.caseAuditEntry.create({
          data: {
            caseId: existing.caseId,
            event: `STR review status changed to ${nextStatus}`,
            user: user.name,
            details: data.reviewNote,
          },
        });
      }

      return submission;
    });

    await createAuditLog({
      userId: user.id,
      action: "STR_UPDATE",
      resource: "str",
      resourceId: updated.id,
      changes: { status: data.status, reviewNote: data.reviewNote },
    });

    return NextResponse.json({
      success: true,
      str: { id: updated.id, status: fromSTRStatus(updated.status) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

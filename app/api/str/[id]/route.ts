import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { fromSeverity, fromSTRStatus } from "@/lib/enumMaps";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
          name: true,
          email: true,
          institution: {
            select: {
              name: true,
            },
          },
        },
      });
    }

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
        linkedTransactions = await prisma.transaction.findMany({
          where: {
            id: {
              in: submission.transactionIds,
            },
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
      rulesTriggered: submission.rulesTriggered,
      behavioralDeviations: submission.behavioralDeviations || [],
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

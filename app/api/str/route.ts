import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { strSubmissionSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { toSeverity, fromSeverity, fromSTRStatus } from "@/lib/enumMaps";
import { getSessionUser } from "@/lib/session";
import { createAuditLog } from "@/lib/auditLog";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) {
      const statusMap: Record<string, string> = {
        draft: "DRAFT",
        submitted: "SUBMITTED",
        under_review: "UNDER_REVIEW",
        closed: "CLOSED",
      };
      where.status = statusMap[status] ?? undefined;
    }

    const [submissions, total] = await Promise.all([
      prisma.sTRSubmission.findMany({
        where,
        include: {
          submittedBy: {
            select: {
              name: true,
              email: true,
              institution: {
                select: {
                  name: true,
                },
              },
            },
          },
          case: { select: { caseNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sTRSubmission.count({ where }),
    ]);

    const transactionIds = Array.from(
      new Set(submissions.flatMap((submission) => submission.transactionIds))
    );

    const linkedTransactions =
      transactionIds.length > 0
        ? await prisma.transaction.findMany({
            where: {
              id: {
                in: transactionIds,
              },
            },
            select: {
              id: true,
              amount: true,
            },
          })
        : [];

    const transactionAmounts = new Map(
      linkedTransactions.map((transaction) => [transaction.id, transaction.amount])
    );

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        transactionSummary: s.transactionSummary,
        customerName: s.customerName,
        accountNumber: s.accountNumber,
        descriptionOfSuspicion: s.descriptionOfSuspicion,
        rulesTriggered: s.rulesTriggered,
        narrative: s.narrative,
        riskClassification: fromSeverity(s.riskClassification),
        status: fromSTRStatus(s.status),
        caseNumber: s.case?.caseNumber ?? null,
        submittedBy: s.submittedBy?.name ?? "",
        submittingFinancialInstitution:
          s.submittedBy?.institution?.name ?? "Unassigned Financial Institution",
        transactionAmount: s.transactionIds.reduce(
          (sum, transactionId) => sum + (transactionAmounts.get(transactionId) ?? 0),
          0
        ),
        submittedDate: s.submittedDate?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = strSubmissionSchema.parse(body);

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.sTRSubmission.create({
      data: {
        transactionSummary: data.transactionSummary,
        customerName: data.customerName,
        accountNumber: data.accountNumber,
        descriptionOfSuspicion: data.descriptionOfSuspicion,
        rulesTriggered: data.rulesTriggered,
        transactionIds: data.transactionIds,
        behavioralDeviations: data.behavioralDeviations,
        narrative: data.narrative,
        riskClassification: toSeverity(data.riskClassification),
        supportingDocuments: data.supportingDocuments,
        status: "SUBMITTED",
        submittedById: user.id,
        submittedDate: new Date(),
        caseId: data.caseId || undefined,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "STR_SUBMIT",
      resource: "str",
      resourceId: submission.id,
    });

    return NextResponse.json(
      { success: true, id: submission.id },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { strSubmissionSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { toSeverity, fromSeverity, fromSTRStatus } from "@/lib/enumMaps";
import { getSessionUser } from "@/lib/session";
import { createAuditLog } from "@/lib/auditLog";
import { isMongoObjectId } from "@/lib/mongo";

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
        select: {
          id: true,
          transactionSummary: true,
          customerName: true,
          accountNumber: true,
          descriptionOfSuspicion: true,
          rulesTriggered: true,
          narrative: true,
          riskClassification: true,
          status: true,
          transactionIds: true,
          submittedDate: true,
          createdAt: true,
          submittedById: true,
          caseId: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sTRSubmission.count({ where }),
    ]);

    // Fetch user and institution info separately to handle nulls
    const userIds = Array.from(
      new Set(submissions.map((s) => s.submittedById).filter((id): id is string => id !== null))
    );
    
    const users = new Map();
    if (userIds.length > 0) {
      const userData = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          institution: {
            select: {
              name: true,
            },
          },
        },
      });
      userData.forEach((u) => users.set(u.id, u));
    }

    // Fetch case info for linked cases
    const caseIds = Array.from(
      new Set(submissions.map((s) => s.caseId).filter((id): id is string => id !== null))
    );
    
    const cases = new Map();
    if (caseIds.length > 0) {
      const caseData = await prisma.case.findMany({
        where: { id: { in: caseIds } },
        select: {
          id: true,
          caseNumber: true,
        },
      });
      caseData.forEach((c) => cases.set(c.id, c));
    }

    const transactionIds = Array.from(
      new Set(submissions.flatMap((submission) => submission.transactionIds || []))
    );

    let transactionAmounts = new Map<string, number>();
    
    // Try to fetch transactions, but handle errors gracefully
    if (transactionIds.length > 0) {
      try {
        const objectIds = transactionIds.filter(isMongoObjectId);
        const transactionRefs = transactionIds.filter((id) => !isMongoObjectId(id));

        const linkedTransactions = await prisma.transaction.findMany({
          where: {
            OR: [
              ...(objectIds.length > 0 ? [{ id: { in: objectIds } }] : []),
              ...(transactionRefs.length > 0
                ? [{ transactionRef: { in: transactionRefs } }]
                : []),
            ],
          },
          select: {
            id: true,
            transactionRef: true,
            amount: true,
          },
        });
        
        transactionAmounts = new Map(
          linkedTransactions.flatMap((transaction) => [
            [transaction.id, transaction.amount],
            [transaction.transactionRef, transaction.amount],
          ])
        );
      } catch (err) {
        // Silently handle transaction lookup errors (e.g., invalid ObjectIDs)
        console.warn("Warning: Could not fetch linked transactions:", err);
      }
    }

    return NextResponse.json({
      submissions: submissions.map((s) => {
        const user = s.submittedById ? users.get(s.submittedById) : null;
        const linkedCase = s.caseId ? cases.get(s.caseId) : null;
        
        return {
          id: s.id,
          transactionSummary: s.transactionSummary,
          customerName: s.customerName,
          accountNumber: s.accountNumber,
          descriptionOfSuspicion: s.descriptionOfSuspicion,
          rulesTriggered: s.rulesTriggered,
          narrative: s.narrative,
          riskClassification: fromSeverity(s.riskClassification),
          status: fromSTRStatus(s.status),
          caseNumber: linkedCase?.caseNumber ?? null,
          submittedBy: user?.name ?? "System",
          submittingFinancialInstitution: user?.institution?.name ?? "Unassigned Institution",
          transactionAmount: (s.transactionIds || []).reduce(
            (sum, transactionId) => sum + (transactionAmounts.get(transactionId) ?? 0),
            0
          ),
          submittedDate: s.submittedDate?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        };
      }),
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

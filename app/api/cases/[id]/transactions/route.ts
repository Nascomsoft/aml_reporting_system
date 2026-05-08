import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";
import { assertCaseAccess } from "@/lib/workflowAuth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "5", 10), 1), 20);

    const caseRecord = await prisma.case.findUnique({
      where: { id },
      select: {
        customer: true,
        linkedAlerts: {
          select: {
            accountNumber: true,
            customerName: true,
            institutionId: true,
          },
        },
        investigatorId: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    assertCaseAccess(user, caseRecord);

    const accountNumbers = [...new Set(
      caseRecord.linkedAlerts
        .map((alert) => alert.accountNumber?.trim())
        .filter((accountNumber): accountNumber is string => Boolean(accountNumber))
    )];
    const customerNames = [...new Set(
      [caseRecord.customer, ...caseRecord.linkedAlerts.map((alert) => alert.customerName)]
        .map((name) => name.trim())
        .filter(Boolean)
    )];
    const institutionIds = [...new Set(
      caseRecord.linkedAlerts
        .map((alert) => alert.institutionId)
        .filter((institutionId): institutionId is string => Boolean(institutionId))
    )];

    if (institutionIds.length === 0 || (accountNumbers.length === 0 && customerNames.length === 0)) {
      return NextResponse.json({
        transactions: [],
        total: 0,
        limit,
        context: {
          customerName: caseRecord.customer,
          accountNumbers,
        },
      });
    }

    const searchConditions: Prisma.TransactionWhereInput[] = [
      ...accountNumbers.map((accountNumber) => ({
        accountNumber: { equals: accountNumber, mode: "insensitive" as const },
      })),
      ...customerNames.map((customerName) => ({
        customerName: { equals: customerName, mode: "insensitive" as const },
      })),
    ];

    const whereClause: Prisma.TransactionWhereInput = {
      institutionId: { in: institutionIds },
      OR: searchConditions,
    };

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where: whereClause }),
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          institution: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        transactionRef: transaction.transactionRef,
        customerName: transaction.customerName,
        accountNumber: transaction.accountNumber,
        amount: transaction.amount,
        currency: transaction.currency,
        transactionType: transaction.transactionType,
        country: transaction.country,
        riskScore: transaction.riskScore,
        status: transaction.status,
        flagReason: transaction.flagReason,
        date: transaction.date.toISOString(),
        institution: transaction.institution,
      })),
      total,
      limit,
      context: {
        customerName: caseRecord.customer,
        accountNumbers,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
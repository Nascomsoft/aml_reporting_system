import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { handleApiError } from "@/lib/errorHandler";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where clause based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    // Officers only see transactions from their institution
    if (user.role === "compliance_officer" && user.institutionId) {
      whereClause.institutionId = user.institutionId;
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Search by customer name or account number
    if (search) {
      whereClause.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { accountNumber: { contains: search, mode: "insensitive" } },
        { transactionRef: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.transaction.count({ where: whereClause });

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        institution: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

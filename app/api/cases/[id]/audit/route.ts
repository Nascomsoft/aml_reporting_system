import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { createCaseAudit } from "@/lib/auditLog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = await prisma.caseAuditEntry.findMany({
      where: { caseId: id },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({
      timeline: entries.map((e) => ({
        event: e.event,
        user: e.user,
        timestamp: e.timestamp.toISOString(),
        ip: e.ip ?? undefined,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { event, user, ip } = body || {};

    await createCaseAudit({ caseId: id, event, user, ip });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

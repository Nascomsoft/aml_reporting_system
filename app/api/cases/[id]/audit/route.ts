import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
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
    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: { linkedAlerts: { select: { institutionId: true } } },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    assertCaseAccess(user, caseRecord);

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
    const authUser = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { event, user, ip } = body || {};

    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: { linkedAlerts: { select: { institutionId: true } } },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    assertCaseAccess(authUser, caseRecord);

    await createCaseAudit({ caseId: id, event, user: user ?? authUser.name, ip });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

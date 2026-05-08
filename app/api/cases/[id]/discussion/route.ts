import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseDiscussionSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
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

    const entries = await prisma.caseDiscussion.findMany({
      where: { caseId: id },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        user: e.user,
        message: e.message,
        timestamp: e.timestamp.toISOString(),
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
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = caseDiscussionSchema.parse(body);

    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: { linkedAlerts: { select: { institutionId: true } } },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    assertCaseAccess(user, caseRecord);

    await prisma.caseDiscussion.create({
      data: {
        caseId: id,
        user: user.name,
        message: data.message,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

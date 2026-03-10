import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseDiscussionSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/errorHandler";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { id } = await params;
    const body = await request.json();
    const data = caseDiscussionSchema.parse(body);

    const user = await getSessionUser();
    const userName = user?.name ?? "system";

    await prisma.caseDiscussion.create({
      data: {
        caseId: id,
        user: userName,
        message: data.message,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

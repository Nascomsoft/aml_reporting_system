import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { caseTagSchema } from "@/lib/validation";
import { requireAuth } from "@/lib/session";
import { assertCaseAccess } from "@/lib/workflowAuth";
import { createCaseAudit } from "@/lib/auditLog";

async function getCaseWithScope(id: string) {
  return prisma.case.findUnique({
    where: { id },
    select: {
      investigatorId: true,
      tags: true,
      linkedAlerts: { select: { institutionId: true } },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const caseRecord = await getCaseWithScope(id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    assertCaseAccess(user, caseRecord);

    return NextResponse.json({ tags: caseRecord.tags ?? [] });
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
    const { tag } = caseTagSchema.parse(await request.json());
    const normalizedTag = tag.trim();
    const caseRecord = await getCaseWithScope(id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    assertCaseAccess(user, caseRecord);

    const tags = caseRecord.tags ?? [];
    const nextTags = tags.includes(normalizedTag) ? tags : [...tags, normalizedTag];

    if (nextTags !== tags) {
      await prisma.case.update({
        where: { id },
        data: { tags: nextTags },
      });

      await createCaseAudit({
        caseId: id,
        event: `Tag added: ${normalizedTag}`,
        user: user.name,
      });
    }

    return NextResponse.json({ tags: nextTags });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const tagValue = typeof payload.tag === "string" ? payload.tag : new URL(request.url).searchParams.get("tag") ?? "";
    const normalizedTag = tagValue.trim();

    if (!normalizedTag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    const caseRecord = await getCaseWithScope(id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    assertCaseAccess(user, caseRecord);

    const tags = caseRecord.tags ?? [];
    const nextTags = tags.filter((value) => value !== normalizedTag);

    await prisma.case.update({
      where: { id },
      data: { tags: nextTags },
    });

    await createCaseAudit({
      caseId: id,
      event: `Tag removed: ${normalizedTag}`,
      user: user.name,
    });

    return NextResponse.json({ tags: nextTags });
  } catch (error) {
    return handleApiError(error);
  }
}
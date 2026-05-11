export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import { unlink } from "fs/promises";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";
import { assertCaseAccess } from "@/lib/workflowAuth";
import { createCaseAudit } from "@/lib/auditLog";
import { deleteFileFromCloudinary } from "@/lib/cloudinary";

async function getCaseWithScope(id: string) {
  return prisma.case.findUnique({
    where: { id },
    select: {
      investigatorId: true,
      linkedAlerts: { select: { institutionId: true } },
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, attachmentId } = await params;
    const caseRecord = await getCaseWithScope(id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    assertCaseAccess(user, caseRecord);

    const attachment = await prisma.caseAttachment.findFirst({
      where: { id: attachmentId, caseId: id },
      select: {
        id: true,
        originalName: true,
        filePath: true,
        cloudinaryPublicId: true,
        cloudinaryResourceType: true,
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    if (attachment.cloudinaryPublicId) {
      try {
        await deleteFileFromCloudinary({
          publicId: attachment.cloudinaryPublicId,
          resourceType: attachment.cloudinaryResourceType || "image",
        });
      } catch {
        // Ignore cleanup errors so the database record can still be removed.
      }
    } else if (attachment.filePath.startsWith("/")) {
      const absolutePath = path.join(process.cwd(), "public", attachment.filePath);

      try {
        await unlink(absolutePath);
      } catch {
        // Ignore missing files so the database record can still be removed.
      }
    }

    await prisma.caseAttachment.delete({ where: { id: attachmentId } });

    await createCaseAudit({
      caseId: id,
      event: `Attachment removed: ${attachment.originalName}`,
      user: user.name,
    });

    const attachments = await prisma.caseAttachment.findMany({
      where: { caseId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      attachments: attachments.map((record) => ({
        id: record.id,
        originalName: record.originalName,
        storedName: record.storedName,
        filePath: record.filePath,
        url: record.filePath,
        cloudinaryPublicId: record.cloudinaryPublicId,
        cloudinaryResourceType: record.cloudinaryResourceType,
        mimeType: record.mimeType,
        size: record.size,
        uploadedBy: record.uploadedBy,
        createdAt: record.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";
import { assertCaseAccess } from "@/lib/workflowAuth";
import { createCaseAudit } from "@/lib/auditLog";
import { deleteFileFromCloudinary, uploadFileToCloudinary } from "@/lib/cloudinary";

async function getCaseWithScope(id: string) {
  return prisma.case.findUnique({
    where: { id },
    select: {
      investigatorId: true,
      linkedAlerts: { select: { institutionId: true } },
    },
  });
}

function toAttachmentResponse(attachment: {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  cloudinaryPublicId: string | null;
  cloudinaryResourceType: string | null;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    storedName: attachment.storedName,
    filePath: attachment.filePath,
    url: attachment.filePath,
    cloudinaryPublicId: attachment.cloudinaryPublicId,
    cloudinaryResourceType: attachment.cloudinaryResourceType,
    mimeType: attachment.mimeType,
    size: attachment.size,
    uploadedBy: attachment.uploadedBy,
    createdAt: attachment.createdAt.toISOString(),
  };
}

function safeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.replace(/^_+|_+$/g, "") || "attachment";
}

function isAllowedEvidenceFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage =
    file.type.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((extension) => lowerName.endsWith(extension));

  return isPdf || isImage;
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

    const attachments = await prisma.caseAttachment.findMany({
      where: { caseId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attachments: attachments.map(toAttachmentResponse) });
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
    const caseRecord = await getCaseWithScope(id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    assertCaseAccess(user, caseRecord);

    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files");
    const files = uploadedFiles.filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      const singleFile = formData.get("file");
      if (singleFile instanceof File) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
    }

    const invalidFile = files.find((file) => !isAllowedEvidenceFile(file));

    if (invalidFile) {
      return NextResponse.json(
        { error: "Only PDF and image files are allowed" },
        { status: 400 }
      );
    }

    const attachments = [] as Awaited<ReturnType<typeof prisma.caseAttachment.create>>[];
    const uploadedAssets: Array<{ publicId: string; resourceType: string }> = [];

    try {
      for (const file of files) {
        const storedName = `${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
        const uploadedAsset = await uploadFileToCloudinary({
          file,
          folder: `aml/cases/${id}`,
          publicId: storedName,
        });

        uploadedAssets.push({
          publicId: uploadedAsset.publicId,
          resourceType: uploadedAsset.resourceType,
        });

        const attachment = await prisma.caseAttachment.create({
          data: {
            caseId: id,
            originalName: file.name,
            storedName,
            filePath: uploadedAsset.secureUrl,
            cloudinaryPublicId: uploadedAsset.publicId,
            cloudinaryResourceType: uploadedAsset.resourceType,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            uploadedBy: user.name,
          },
        });

        attachments.push(attachment);
      }
    } catch (error) {
      await Promise.all(
        uploadedAssets.map(async (asset) => {
          try {
            await deleteFileFromCloudinary({
              publicId: asset.publicId,
              resourceType: asset.resourceType,
            });
          } catch {
            // Ignore cleanup errors.
          }
        })
      );

      await Promise.all(
        attachments.map(async (attachment) => {
          try {
            await prisma.caseAttachment.delete({ where: { id: attachment.id } });
          } catch {
            // Ignore cleanup errors.
          }
        })
      );

      throw error;
    }

    await createCaseAudit({
      caseId: id,
      event: `Attachment uploaded: ${attachments.map((attachment) => attachment.originalName).join(", ")}`,
      user: user.name,
    });

    return NextResponse.json({ attachments: attachments.map(toAttachmentResponse) });
  } catch (error) {
    return handleApiError(error);
  }
}
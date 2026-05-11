export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { deleteFileFromCloudinary, uploadFileToCloudinary } from "@/lib/cloudinary";
import { handleApiError } from "@/lib/errorHandler";
import { requireAuth } from "@/lib/session";

function safeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.replace(/^_+|_+$/g, "") || "evidence";
}

function isAllowedEvidenceFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage =
    file.type.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((extension) => lowerName.endsWith(extension));

  return isPdf || isImage;
}

function toEvidenceResponse(attachment: {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  cloudinaryPublicId: string;
  cloudinaryResourceType: string;
  mimeType: string;
  size: number;
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
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
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

    const uploadedAttachments = [] as Array<{
      id: string;
      originalName: string;
      storedName: string;
      filePath: string;
      cloudinaryPublicId: string;
      cloudinaryResourceType: string;
      mimeType: string;
      size: number;
    }>;

    try {
      for (const file of files) {
        const storedName = `${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
        const uploadedAsset = await uploadFileToCloudinary({
          file,
          folder: `aml/str-drafts/${user.id}`,
          publicId: storedName,
        });

        uploadedAttachments.push({
          id: uploadedAsset.publicId,
          originalName: file.name,
          storedName,
          filePath: uploadedAsset.secureUrl,
          cloudinaryPublicId: uploadedAsset.publicId,
          cloudinaryResourceType: uploadedAsset.resourceType,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        });
      }
    } catch (error) {
      await Promise.all(
        uploadedAttachments.map(async (attachment) => {
          try {
            await deleteFileFromCloudinary({
              publicId: attachment.cloudinaryPublicId,
              resourceType: attachment.cloudinaryResourceType,
            });
          } catch {
            // Ignore cleanup errors.
          }
        })
      );

      throw error;
    }

    return NextResponse.json({ attachments: uploadedAttachments.map(toEvidenceResponse) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth();
    const payload = await request.json().catch(() => ({}));
    const publicId = typeof payload.publicId === "string" ? payload.publicId : "";
    const resourceType = typeof payload.resourceType === "string" ? payload.resourceType : "image";

    if (!publicId) {
      return NextResponse.json({ error: "publicId is required" }, { status: 400 });
    }

    try {
      await deleteFileFromCloudinary({ publicId, resourceType });
    } catch {
      // Ignore cleanup errors so clients can discard stale draft records.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function ensureCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (!isConfigured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isConfigured = true;
  }

  return cloudinary;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
}

export async function uploadFileToCloudinary(options: {
  file: File;
  folder: string;
  publicId: string;
}) {
  const client = ensureCloudinaryConfig();
  const buffer = Buffer.from(await options.file.arrayBuffer());

  return await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: "auto",
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFileFromCloudinary(options: {
  publicId: string;
  resourceType?: string;
}) {
  const client = ensureCloudinaryConfig();

  return await client.uploader.destroy(options.publicId, {
    resource_type: options.resourceType || "image",
    invalidate: true,
  });
}
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const BUCKET = process.env.R2_BUCKET_NAME!;

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// Strips anything that could break a Content-Disposition header or look odd in a filename.
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function makeVideoKey(originalFilename: string): string {
  const ext = originalFilename.includes(".") ? originalFilename.split(".").pop() : "mp4";
  return `videos/${randomUUID()}.${sanitizeFilename(ext || "mp4")}`;
}

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2Client(), command, { expiresIn: 3600 });
}

export async function getPlaybackUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2Client(), command, { expiresIn: 3600 });
}

export async function getDownloadUrl(key: string, downloadFilename: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${sanitizeFilename(downloadFilename)}"`,
  });
  return getSignedUrl(r2Client(), command, { expiresIn: 3600 });
}

export async function deleteVideoObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await r2Client().send(command);
}

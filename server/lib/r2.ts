import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

let client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID) &&
      process.env.R2_BUCKET,
  );
}

function getEndpoint(): string {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID or R2_ENDPOINT is required");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET is required");
  return bucket;
}

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: getEndpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function validateAttachmentFile(file: {
  size: number;
  mimetype: string;
  originalname: string;
}): string | null {
  if (!file.size || file.size > MAX_BYTES) {
    return "File must be between 1 byte and 10 MB";
  }
  const type = file.mimetype || "application/octet-stream";
  if (!ALLOWED_TYPES.has(type)) {
    return "File type not allowed. Use PDF, images, or Office documents.";
  }
  if (!file.originalname?.trim()) {
    return "File name is required";
  }
  return null;
}

export function buildStorageKey(taskId: string, originalName: string): string {
  const safe = originalName
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return `tasks/${taskId}/${randomUUID()}-${safe || "file"}`;
}

export async function putR2Object(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const s3 = getR2Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}

export async function getR2Object(key: string) {
  const s3 = getR2Client();
  return s3.send(
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    }),
  );
}

export async function deleteR2Object(key: string): Promise<void> {
  const s3 = getR2Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    }),
  );
}

export { MAX_BYTES };

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// ════════════════════════════════════════════════════════════
// FamVault — Storage Abstraction Layer
// Supports: local filesystem (dev) and Cloudflare R2 (production)
// ════════════════════════════════════════════════════════════

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";
const UPLOAD_BASE = process.env.UPLOAD_DIR || "./public/uploads";

// ── R2 Configuration (lazy-loaded) ──
let s3Client: import("@aws-sdk/client-s3").S3Client | null = null;

async function getS3Client() {
  if (s3Client) return s3Client;

  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return s3Client;
}

// ── Storage Types ──
export type StorageType = "originals" | "thumbs" | "medium" | "faces" | "audio";

const LOCAL_DIRS: Record<StorageType, string> = {
  originals: path.join(UPLOAD_BASE, "originals"),
  thumbs: path.join(UPLOAD_BASE, "thumbs"),
  medium: path.join(UPLOAD_BASE, "medium"),
  faces: path.join(UPLOAD_BASE, "faces"),
  audio: path.join(UPLOAD_BASE, "audio"),
};

// ════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════

/**
 * Generate a unique storage key for a file.
 * Format: {type}/{year}/{month}/{uuid}.{ext}
 */
export function generateStorageKey(
  originalFilename: string,
  type: StorageType = "originals"
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const id = uuidv4();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${type}/${year}/${month}/${id}${ext}`;
}

/**
 * Ensure all local upload directories exist.
 */
export async function ensureUploadDirs(): Promise<void> {
  if (STORAGE_PROVIDER !== "local") return;
  for (const dir of Object.values(LOCAL_DIRS)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Save a buffer to storage.
 */
export async function saveFile(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  if (STORAGE_PROVIDER === "r2") {
    return saveToR2(key, buffer, contentType);
  }
  return saveToLocal(key, buffer);
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_PROVIDER === "r2") {
    return deleteFromR2(key);
  }
  return deleteFromLocal(key);
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(key: string): string {
  if (STORAGE_PROVIDER === "r2" && process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }
  // Local: key format is "{type}/2025/06/uuid.jpg"
  // URL becomes "/uploads/originals/2025/06/uuid.jpg"
  // But we store the full key, so just prefix with /uploads/
  return `/uploads/${key}`;
}

/**
 * Generate a presigned upload URL for direct client → R2 upload.
 * Returns null if using local storage (client should POST to server instead).
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; key: string } | null> {
  if (STORAGE_PROVIDER !== "r2") {
    return null; // Local storage doesn't support presigned URLs
  }

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getS3Client();

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return { uploadUrl, key };
}

/**
 * Generate a presigned download URL (short-lived, for private media).
 * Falls back to local URL if not using R2.
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (STORAGE_PROVIDER !== "r2") {
    return getPublicUrl(key);
  }

  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getS3Client();

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

// ════════════════════════════════════════════════════════════
// Convenience wrappers (backward compat)
// ════════════════════════════════════════════════════════════

export async function saveOriginal(key: string, buffer: Buffer): Promise<string> {
  return saveFile(key, buffer, "image/jpeg");
}

export async function saveThumbnail(key: string, buffer: Buffer): Promise<string> {
  const thumbKey = key.replace("originals/", "thumbs/");
  return saveFile(thumbKey, buffer, "image/jpeg");
}

export async function saveMedium(key: string, buffer: Buffer): Promise<string> {
  const mediumKey = key.replace("originals/", "medium/");
  return saveFile(mediumKey, buffer, "image/jpeg");
}

// ════════════════════════════════════════════════════════════
// Internal: Local Filesystem
// ════════════════════════════════════════════════════════════

async function saveToLocal(key: string, buffer: Buffer): Promise<string> {
  const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_BASE, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return key;
}

async function deleteFromLocal(key: string): Promise<void> {
  const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_BASE, key);
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be deleted — that's fine
  }
}

// ════════════════════════════════════════════════════════════
// Internal: Cloudflare R2
// ════════════════════════════════════════════════════════════

async function saveToR2(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return key;
}

async function deleteFromR2(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}

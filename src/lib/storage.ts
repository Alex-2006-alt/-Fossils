import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Storage abstraction layer for FamVault.
 * MVP: local filesystem. Swap to S3/R2 by reimplementing this module.
 */

const UPLOAD_BASE = process.env.UPLOAD_DIR || "./public/uploads";

const DIRS = {
  originals: path.join(UPLOAD_BASE, "originals"),
  thumbs: path.join(UPLOAD_BASE, "thumbs"),
  medium: path.join(UPLOAD_BASE, "medium"),
};

/**
 * Ensure all upload directories exist.
 */
export async function ensureUploadDirs() {
  for (const dir of Object.values(DIRS)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Generate a unique storage key for a file.
 */
export function generateStorageKey(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const id = uuidv4();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${id}${ext}`;
}

/**
 * Save a buffer to the originals directory.
 */
export async function saveOriginal(
  key: string,
  buffer: Buffer
): Promise<string> {
  const filePath = path.join(DIRS.originals, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return key;
}

/**
 * Save a thumbnail buffer.
 */
export async function saveThumbnail(
  key: string,
  buffer: Buffer
): Promise<string> {
  const filePath = path.join(DIRS.thumbs, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return key;
}

/**
 * Save a medium-res buffer.
 */
export async function saveMedium(
  key: string,
  buffer: Buffer
): Promise<string> {
  const filePath = path.join(DIRS.medium, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return key;
}

/**
 * Delete a file from storage by key and type.
 */
export async function deleteFile(
  key: string,
  type: "originals" | "thumbs" | "medium"
): Promise<void> {
  const filePath = path.join(DIRS[type], key);
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be deleted
  }
}

/**
 * Get the public URL for a stored file.
 */
export function getPublicUrl(key: string, type: "originals" | "thumbs" | "medium"): string {
  return `/uploads/${type}/${key}`;
}

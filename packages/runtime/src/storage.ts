import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
const provider = () => process.env.STORAGE_PROVIDER || "local";
let client: S3Client | undefined;
function s3() {
  return (client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  }));
}
export function validStorageKey(key: string) {
  return (
    /^(originals|thumbs|medium|faces|audio)\/[a-zA-Z0-9_./-]+$/.test(key) &&
    !key.split("/").some((p) => !p || p === "." || p === "..") &&
    !key.includes("\\")
  );
}
export function storageRoot() {
  const root = process.env.PRIVATE_UPLOAD_DIR;
  if (!root || !path.isAbsolute(root))
    throw new Error("PRIVATE_UPLOAD_DIR must be an absolute private directory");
  if (root.split(/[\\/]/).some((p) => p.toLowerCase() === "public"))
    throw new Error("Private media cannot be stored in public");
  return path.resolve(root);
}
export function storagePath(key: string) {
  if (!validStorageKey(key)) throw new Error("Invalid storage key");
  const root = storageRoot();
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(root + path.sep))
    throw new Error("Invalid storage path");
  return resolved;
}
export type StorageType = "originals" | "thumbs" | "medium" | "faces" | "audio";
export function generateStorageKey(
  filename: string,
  type: StorageType = "originals",
) {
  const ext = path
    .extname(filename)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, "");
  return `${type}/${new Date().getUTCFullYear()}/${randomUUID()}${ext}`;
}
export const getPublicUrl = (key: string) =>
  key ? `/api/media?key=${encodeURIComponent(key)}` : "";
export async function ensureUploadDirs() {
  if (provider() === "local")
    await fs.mkdir(storageRoot(), { recursive: true });
}
export async function saveFile(
  key: string,
  buffer: Buffer,
  contentType = "application/octet-stream",
) {
  if (!validStorageKey(key)) throw new Error("Invalid storage key");
  if (provider() === "r2")
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  else {
    const p = storagePath(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, buffer);
  }
  return key;
}
export async function getFileBuffer(key: string): Promise<Buffer | null> {
  if (!validStorageKey(key)) return null;
  try {
    if (provider() === "r2") {
      const response = await s3().send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
      );
      return response.Body
        ? Buffer.from(await response.Body.transformToByteArray())
        : null;
    }
    return await fs.readFile(storagePath(key));
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    const name = (e as Error).name;
    if (code === "ENOENT" || name === "NoSuchKey") return null;
    throw e;
  }
}
export async function deleteFile(key: string) {
  if (!key) return;
  if (!validStorageKey(key)) throw new Error("Invalid storage key");
  if (provider() === "r2") {
    await s3().send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      }),
    );
    return;
  }
  try {
    await fs.unlink(storagePath(key));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
export const generatePresignedDownloadUrl = async (key: string) =>
  getPublicUrl(key);

export async function deleteDerivatives(mediaId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(mediaId)) throw Error("Invalid media id");
  for (const key of [`thumbs/${mediaId}.jpg`, `medium/${mediaId}.jpg`])
    await deleteFile(key);
  const prefix = `faces/${mediaId}-`;
  if (provider() === "r2") {
    let continuationToken: string | undefined;
    do {
      const page = await s3().send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET_NAME!,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of page.Contents || [])
        if (object.Key) await deleteFile(object.Key);
      continuationToken = page.NextContinuationToken;
    } while (continuationToken);
  } else {
    const directory = path.join(storageRoot(), "faces");
    let names: string[];
    try {
      names = await fs.readdir(directory);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
      throw e;
    }
    for (const name of names)
      if (name.startsWith(mediaId + "-")) await deleteFile("faces/" + name);
  }
}

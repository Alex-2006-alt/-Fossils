import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(72, "Use at most 72 characters")
  .refine(
    (value) => Buffer.byteLength(value) <= 72,
    "Password exceeds 72 bytes",
  );
export const nameSchema = z.string().trim().min(1).max(100);
export const idSchema = z.string().min(1).max(100);
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export function checkOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new HttpError(503, "Application origin is not configured");
  const expected = new URL(configured || req.url).origin;
  if (
    req.headers.get("origin") !== expected ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Request origin not allowed");
}
export async function boundedBody(req: Request, maxBytes: number) {
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes)
    throw new HttpError(413, "Request is too large");
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}
export async function jsonBody(req: Request) {
  try {
    return JSON.parse(
      Buffer.from(await boundedBody(req, 64 * 1024)).toString("utf8"),
    );
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Invalid JSON");
  }
}
export const roles = {
  OWNER: 5,
  ADMIN: 4,
  MEMBER: 3,
  VIEWER: 2,
  GUEST: 1,
} as const;
export function canRole(role: string, minimum: keyof typeof roles) {
  return (roles[role as keyof typeof roles] || 0) >= roles[minimum];
}

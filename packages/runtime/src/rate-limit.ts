import { prisma } from "./db";
import { HttpError, tokenHash } from "./security";
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const window = Math.floor(Date.now() / windowMs);
  const id = tokenHash(key + ":" + window);
  const row = await prisma.rateLimitBucket.upsert({
    where: { id },
    create: { id, count: 1, expiresAt: new Date((window + 2) * windowMs) },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export function clientIp(req: Request) {
  return process.env.TRUST_PROXY === "true"
    ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "direct";
}

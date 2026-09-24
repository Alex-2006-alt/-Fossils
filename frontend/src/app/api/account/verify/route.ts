import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { newToken, tokenHash, HttpError } from "@famvault/runtime/security";
import { rateLimit } from "@famvault/runtime/rate-limit";
import { mailConfigured, sendAccountMail } from "@famvault/runtime/mail";
export const POST = withFamilyAuth(async (req, ctx) => {
  if (!mailConfigured())
    throw new HttpError(503, "Email delivery is not configured");
  await rateLimit("verify:" + ctx.userId, 3, 3600000);
  const token = newToken();
  await prisma.accountToken.create({
    data: {
      userId: ctx.userId,
      purpose: "VERIFY",
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 30 * 60000),
    },
  });
  try {
    await sendAccountMail(ctx.email, "VERIFY", token);
  } catch {
    await prisma.accountToken.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
    throw new HttpError(503, "Email delivery is temporarily unavailable");
  }
  return NextResponse.json({ success: true });
});

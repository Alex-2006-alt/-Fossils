import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/http";
import {
  checkOrigin,
  jsonBody,
  emailSchema,
  passwordSchema,
  newToken,
  tokenHash,
  HttpError,
} from "@famvault/runtime/security";
import { rateLimit, clientIp } from "@famvault/runtime/rate-limit";
import { mailConfigured, sendAccountMail } from "@famvault/runtime/mail";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!mailConfigured())
      throw new HttpError(
        503,
        "Email recovery is not configured. Contact your family administrator.",
      );
    const { email } = z
      .object({ email: emailSchema })
      .parse(await jsonBody(req));
    await rateLimit("recovery-ip:" + clientIp(req), 10, 3600000);
    await rateLimit("recovery:" + email, 3, 3600000);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.disabledAt) {
      const token = newToken();
      await prisma.accountToken.create({
        data: {
          userId: user.id,
          purpose: "RESET",
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + 30 * 60000),
        },
      });
      try {
        await sendAccountMail(email, "RESET", token);
      } catch {
        await prisma.accountToken.deleteMany({
          where: { tokenHash: tokenHash(token) },
        });
        console.error("Account email delivery failed");
      }
    }
    return NextResponse.json({
      message: "If an active account exists, a reset link will be sent.",
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    await rateLimit("consume-token:" + clientIp(req), 30, 3600000);
    const body = z
      .object({
        token: z.string().min(20).max(200),
        purpose: z.enum(["RESET", "VERIFY"]),
        password: passwordSchema.optional(),
      })
      .parse(await jsonBody(req));
    if (body.purpose === "RESET" && !body.password)
      throw new HttpError(400, "A new password is required");
    const password = body.password
      ? await bcrypt.hash(body.password, 12)
      : undefined;
    await prisma.$transaction(async (tx) => {
      const token = await tx.accountToken.findUnique({
        where: { tokenHash: tokenHash(body.token) },
      });
      if (
        !token ||
        token.purpose !== body.purpose ||
        token.usedAt ||
        token.expiresAt <= new Date()
      )
        throw new HttpError(400, "Link is invalid or expired");
      const user = await tx.user.findUnique({ where: { id: token.userId } });
      if (!user || user.disabledAt)
        throw new HttpError(400, "Link is invalid or expired");
      const claimed = await tx.accountToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!claimed.count)
        throw new HttpError(400, "Link is invalid or expired");
      await tx.user.update({
        where: { id: user.id },
        data:
          body.purpose === "RESET"
            ? {
                password,
                sessionVersion: { increment: 1 },
                emailVerifiedAt: new Date(),
              }
            : { emailVerifiedAt: new Date() },
      });
      await tx.accountToken.updateMany({
        where: { userId: user.id, purpose: body.purpose, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    return NextResponse.json({
      message:
        body.purpose === "RESET"
          ? "Password changed. Sign in with your new password."
          : "Email verified.",
    });
  } catch (error) {
    return apiError(error);
  }
}

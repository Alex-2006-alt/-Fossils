import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/http";
import {
  checkOrigin,
  jsonBody,
  emailSchema,
  passwordSchema,
  nameSchema,
  newToken,
  tokenHash,
  HttpError,
} from "@famvault/runtime/security";
import { rateLimit, clientIp } from "@famvault/runtime/rate-limit";
const common = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
async function signup(req: NextRequest, createFamily: boolean) {
  try {
    checkOrigin(req);
    await rateLimit("signup:" + clientIp(req), 10, 60 * 60 * 1000);
    const body = await jsonBody(req);
    const values = common.parse(body);
    const familyName = createFamily ? nameSchema.parse(body.familyName) : null;
    const inviteCode = createFamily
      ? null
      : z.string().min(20).max(200).parse(body.inviteCode);
    const password = await bcrypt.hash(values.password, 12);
    const result = await prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: values.email } }))
        throw new HttpError(409, "Unable to register this email");
      let familyId: string;
      let role = "OWNER";
      if (createFamily) {
        const family = await tx.family.create({
          data: { name: familyName!, inviteCode: tokenHash(newToken()) },
        });
        familyId = family.id;
      } else {
        const invitation = await tx.invitation.findUnique({
          where: { token: tokenHash(inviteCode!) },
        });
        if (
          !invitation ||
          invitation.usedAt ||
          invitation.expiresAt <= new Date() ||
          (invitation.email && invitation.email !== values.email)
        )
          throw new HttpError(400, "Invitation is invalid or expired");
        const claimed = await tx.invitation.updateMany({
          where: {
            id: invitation.id,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        });
        if (claimed.count !== 1)
          throw new HttpError(400, "Invitation is invalid or expired");
        familyId = invitation.familyId;
        role = invitation.role;
      }
      const user = await tx.user.create({
        data: { ...values, password, familyId, role },
      });
      if (inviteCode)
        await tx.invitation.update({
          where: { token: tokenHash(inviteCode) },
          data: { usedById: user.id },
        });
      await tx.auditLog.create({
        data: { familyId, userId: user.id, action: "SIGNUP" },
      });
      return { id: user.id, familyId };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
export const POST = (req: NextRequest) => signup(req, false);
export const PUT = (req: NextRequest) => signup(req, true);

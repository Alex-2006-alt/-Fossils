import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  jsonBody,
  HttpError,
  passwordSchema,
  nameSchema,
} from "@famvault/runtime/security";
export const GET = withFamilyAuth(async (req, ctx) =>
  NextResponse.json({ name: ctx.userName, email: ctx.email, role: ctx.role }),
);
export const PATCH = withFamilyAuth(async (req, ctx) => {
  const body = z
    .object({
      name: nameSchema.optional(),
      currentPassword: z.string().max(72).optional(),
      newPassword: passwordSchema.optional(),
      revokeSessions: z.boolean().optional(),
    })
    .parse(await jsonBody(req));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
  });
  if (
    body.newPassword &&
    (!body.currentPassword ||
      !(await bcrypt.compare(body.currentPassword, user.password)))
  )
    throw new HttpError(400, "Current password is incorrect");
  await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      name: body.name,
      password: body.newPassword
        ? await bcrypt.hash(body.newPassword, 12)
        : undefined,
      sessionVersion:
        body.newPassword || body.revokeSessions ? { increment: 1 } : undefined,
    },
  });
  return NextResponse.json({
    success: true,
    signInRequired: !!(body.newPassword || body.revokeSessions),
  });
});

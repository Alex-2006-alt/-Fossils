import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { jsonBody, HttpError, idSchema } from "@famvault/runtime/security";
export const GET = withFamilyAuth(
  async (req, ctx) =>
    NextResponse.json({
      items: await prisma.user.findMany({
        where: { familyId: ctx.familyId, disabledAt: null },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { createdAt: "asc" },
      }),
    }),
  { minRole: "ADMIN" },
);
export const PATCH = withFamilyAuth(
  async (req, ctx) => {
    const body = z
      .object({
        userId: idSchema,
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional(),
        remove: z.boolean().optional(),
        transferOwnership: z.boolean().optional(),
      })
      .parse(await jsonBody(req));
    await prisma.$transaction(async (tx) => {
      const member = await tx.user.findFirst({
        where: { id: body.userId, familyId: ctx.familyId, disabledAt: null },
      });
      if (!member) throw new HttpError(404, "Member not found");
      if (member.id === ctx.userId)
        throw new HttpError(400, "Choose another family member");
      if (member.role === "OWNER")
        throw new HttpError(403, "Transfer ownership before changing an owner");
      if (
        ctx.role !== "OWNER" &&
        (member.role === "ADMIN" ||
          body.role === "ADMIN" ||
          body.transferOwnership)
      )
        throw new HttpError(403, "Owner access required");
      if (body.transferOwnership) {
        await tx.user.update({
          where: { id: ctx.userId },
          data: { role: "ADMIN", sessionVersion: { increment: 1 } },
        });
        await tx.user.update({
          where: { id: member.id },
          data: { role: "OWNER", sessionVersion: { increment: 1 } },
        });
      } else
        await tx.user.update({
          where: { id: member.id },
          data: {
            role: body.role,
            disabledAt: body.remove ? new Date() : undefined,
            sessionVersion: { increment: 1 },
          },
        });
      await tx.auditLog.create({
        data: {
          familyId: ctx.familyId,
          userId: ctx.userId,
          action: "MEMBER_UPDATE",
          resourceId: member.id,
        },
      });
    });
    return NextResponse.json({ success: true });
  },
  { minRole: "ADMIN" },
);

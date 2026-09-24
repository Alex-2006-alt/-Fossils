import { NextResponse } from "next/server";
import { z } from "zod";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  jsonBody,
  emailSchema,
  newToken,
  tokenHash,
  HttpError,
} from "@famvault/runtime/security";
export const GET = withFamilyAuth(
  async (_, ctx) =>
    NextResponse.json({
      items: await prisma.invitation.findMany({
        where: { familyId: ctx.familyId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          usedAt: true,
          createdAt: true,
        },
      }),
    }),
  { minRole: "ADMIN" },
);
export const POST = withFamilyAuth(
  async (req, ctx) => {
    const body = z
      .object({
        email: emailSchema.nullish(),
        role: z.enum(["MEMBER", "VIEWER", "ADMIN"]).default("MEMBER"),
      })
      .parse(await jsonBody(req));
    if (body.role === "ADMIN" && ctx.role !== "OWNER")
      throw new HttpError(403, "Only the owner can invite administrators");
    const token = newToken();
    const row = await prisma.invitation.create({
      data: {
        familyId: ctx.familyId,
        email: body.email || null,
        role: body.role,
        token: tokenHash(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdBy: ctx.userId,
      },
    });
    return NextResponse.json(
      { id: row.id, token, expiresAt: row.expiresAt },
      { status: 201 },
    );
  },
  { minRole: "ADMIN" },
);
export const DELETE = withFamilyAuth(
  async (req, ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "Invitation ID required");
    const result = await prisma.invitation.deleteMany({
      where: { id, familyId: ctx.familyId },
    });
    if (!result.count) throw new HttpError(404, "Invitation not found");
    return NextResponse.json({ success: true });
  },
  { minRole: "ADMIN" },
);

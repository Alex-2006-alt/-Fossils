import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { jsonBody, nameSchema } from "@famvault/runtime/security";
export const GET = withFamilyAuth(async (req, ctx) =>
  NextResponse.json(
    await prisma.family.findUnique({
      where: { id: ctx.familyId },
      select: {
        name: true,
        faceRecognitionEnabled: true,
        locationVisible: true,
      },
    }),
  ),
);
export const PATCH = withFamilyAuth(
  async (req, ctx) => {
    const data = z
      .object({
        name: nameSchema.optional(),
        faceRecognitionEnabled: z.boolean().optional(),
        locationVisible: z.boolean().optional(),
      })
      .parse(await jsonBody(req));
    await prisma.family.update({ where: { id: ctx.familyId }, data });
    return NextResponse.json({ success: true });
  },
  { minRole: "OWNER" },
);

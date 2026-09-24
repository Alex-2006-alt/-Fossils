import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
export const GET = withFamilyAuth(
  async (req, ctx) =>
    NextResponse.json({
      items: await prisma.media.findMany({
        where: {
          familyId: ctx.familyId,
          deletedAt: { not: null },
          ...(ctx.role === "MEMBER" ? { uploaderId: ctx.userId } : {}),
        },
        select: { id: true, filename: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
        take: 100,
      }),
    }),
  { minRole: "MEMBER" },
);

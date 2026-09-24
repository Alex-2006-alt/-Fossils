import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
export const GET = withFamilyAuth(
  async (req, ctx) => {
    const where = { media: { familyId: ctx.familyId, deletedAt: null } };
    const [pending, failed, oldest, storage] = await Promise.all([
      prisma.mediaProcessingJob.count({
        where: { ...where, status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.mediaProcessingJob.count({
        where: { ...where, status: "FAILED" },
      }),
      prisma.mediaProcessingJob.findFirst({
        where: { ...where, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.media.aggregate({
        where: { familyId: ctx.familyId },
        _sum: { sizeBytes: true },
      }),
    ]);
    return NextResponse.json({
      pending,
      failed,
      oldestPendingAt: oldest?.createdAt || null,
      storageBytes: storage._sum.sizeBytes || 0,
    });
  },
  { minRole: "ADMIN" },
);

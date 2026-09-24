import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@famvault/runtime/rate-limit";
export const POST = withFamilyAuth(
  async (req, ctx) => {
    await rateLimit("memories:" + ctx.familyId, 5, 60000);
    const job = await prisma.$transaction(async (tx) => {
      const previous = await tx.familyJob.findUnique({
        where: { familyId_type: { familyId: ctx.familyId, type: "MEMORIES" } },
      });
      if (previous && ["PENDING", "PROCESSING"].includes(previous.status))
        return previous;
      return tx.familyJob.upsert({
        where: { familyId_type: { familyId: ctx.familyId, type: "MEMORIES" } },
        create: { familyId: ctx.familyId, type: "MEMORIES" },
        update: {
          status: "PENDING",
          retries: 0,
          doneAt: null,
          startedAt: null,
          leaseId: null,
        },
      });
    });
    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        message:
          "Your memories are queued. Keep exploring while we gather them.",
      },
      { status: 202 },
    );
  },
  { minRole: "MEMBER" },
);
export const GET = withFamilyAuth(async (req, ctx) => {
  const job = await prisma.familyJob.findUnique({
    where: { familyId_type: { familyId: ctx.familyId, type: "MEMORIES" } },
    select: { status: true, doneAt: true, retries: true },
  });
  return NextResponse.json(job || { status: "IDLE" });
});

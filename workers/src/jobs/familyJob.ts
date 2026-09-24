import { randomUUID } from "node:crypto";
import { prisma } from "@famvault/runtime/db";
import { generateMemories } from "@famvault/runtime/memories";
export async function processFamilyJob() {
  const stale = new Date(Date.now() - 5 * 60000);
  const candidate = await prisma.familyJob.findFirst({
    where: {
      type: "MEMORIES",
      OR: [
        { status: "PENDING" },
        { status: "PROCESSING", startedAt: { lt: stale } },
        {
          status: "FAILED",
          retries: { lt: 3 },
          doneAt: { lt: new Date(Date.now() - 60000) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return false;
  const leaseId = randomUUID();
  const claimed = await prisma.familyJob.updateMany({
    where: {
      id: candidate.id,
      status: candidate.status,
      leaseId: candidate.leaseId,
      startedAt: candidate.startedAt,
    },
    data: {
      status: "PROCESSING",
      leaseId,
      startedAt: new Date(),
      retries: { increment: 1 },
    },
  });
  if (!claimed.count) return true;
  const heartbeat = setInterval(() => {
    void prisma.familyJob
      .updateMany({
        where: { id: candidate.id, leaseId },
        data: { startedAt: new Date() },
      })
      .catch(() => {});
  }, 30000);
  try {
    await generateMemories(candidate.familyId);
    await prisma.familyJob.updateMany({
      where: { id: candidate.id, leaseId },
      data: { status: "COMPLETED", leaseId: null, doneAt: new Date() },
    });
  } catch {
    console.error("Family job failed", { jobId: candidate.id });
    await prisma.familyJob.updateMany({
      where: { id: candidate.id, leaseId },
      data: { status: "FAILED", leaseId: null, doneAt: new Date() },
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
dotenv.config({ path: path.join(root, "frontend/.env"), quiet: true });
if (process.env.DATABASE_URL?.startsWith("file:./"))
  process.env.DATABASE_URL =
    "file:" +
    path.resolve(root, "frontend/prisma", process.env.DATABASE_URL.slice(5));
const { prisma } = await import("@famvault/runtime/db");
const { deleteFile, deleteDerivatives } = await import(
  "@famvault/runtime/storage"
);
const { processMediaJob } = await import("./jobs/processMedia");
const { processFamilyJob } = await import("./jobs/familyJob");
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function cleanup() {
  const old = await prisma.media.findMany({
    where: {
      deletedAt: { lt: new Date(Date.now() - 7 * 86400000) },
      processingJobs: {
        none: {
          status: "PROCESSING",
          startedAt: { gte: new Date(Date.now() - 5 * 60000) },
        },
      },
    },
    include: { faces: true },
    take: 20,
  });
  for (const media of old) {
    const claim = await prisma.media.updateMany({
      where: {
        id: media.id,
        deletedAt: { lt: new Date(Date.now() - 7 * 86400000) },
        processingJobs: {
          none: {
            status: "PROCESSING",
            startedAt: { gte: new Date(Date.now() - 5 * 60000) },
          },
        },
      },
      data: { purgeStartedAt: new Date() },
    });
    if (!claim.count) continue;
    await deleteDerivatives(media.id);
    for (const key of [
      media.originalKey,
      media.thumbKey,
      media.mediumKey,
      `thumbs/${media.id}.jpg`,
      `medium/${media.id}.jpg`,
      ...media.faces.map((f) => f.cropKey),
    ])
      if (key) await deleteFile(key);
    await prisma.$transaction(async (tx) => {
      await tx.album.updateMany({
        where: { coverMediaId: media.id },
        data: { coverMediaId: null },
      });
      await tx.memory.updateMany({
        where: { coverMediaId: media.id },
        data: { coverMediaId: null },
      });
      await tx.media.delete({ where: { id: media.id } });
      for (const personId of new Set(
        media.faces.map((f) => f.personId).filter((id): id is string => !!id),
      )) {
        const faces = await tx.face.findMany({
          where: { personId, media: { deletedAt: null } },
          distinct: ["mediaId"],
        });
        await tx.person.updateMany({
          where: { id: personId },
          data: { photoCount: faces.length, coverFaceId: faces[0]?.id || null },
        });
      }
    });
  }
  await prisma.accountToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
console.log("FamVault worker ready: durable database queue");
let ticks = 0;
while (!stopping) {
  try {
    const stale = new Date(Date.now() - 5 * 60000);
    const candidate = await prisma.mediaProcessingJob.findFirst({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "PROCESSING", startedAt: { lt: stale } },
          {
            status: "FAILED",
            retries: { lt: 3 },
            doneAt: { lt: new Date(Date.now() - 60000) },
          },
        ],
        media: { deletedAt: null },
      },
      orderBy: { createdAt: "asc" },
    });
    if (candidate) {
      const leaseId = randomUUID();
      const claimed = await prisma.mediaProcessingJob.updateMany({
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
          error: null,
        },
      });
      if (claimed.count) {
        const heartbeat = setInterval(() => {
          void prisma.mediaProcessingJob
            .updateMany({
              where: { id: candidate.id, leaseId },
              data: { startedAt: new Date() },
            })
            .catch(() => {});
        }, 30000);
        try {
          await processMediaJob({ ...candidate, leaseId });
          await prisma.mediaProcessingJob.updateMany({
            where: { id: candidate.id, leaseId },
            data: { status: "COMPLETED", doneAt: new Date(), leaseId: null },
          });
        } catch (error) {
          console.error("Processing failed", {
            jobId: candidate.id,
            step: candidate.step,
          });
          await prisma.mediaProcessingJob.updateMany({
            where: { id: candidate.id, leaseId },
            data: {
              status: "FAILED",
              error:
                error instanceof Error
                  ? error.message.slice(0, 200)
                  : "Processing failed",
              doneAt: new Date(),
              leaseId: null,
            },
          });
          if (candidate.step === "THUMBNAIL") {
            await prisma.media.updateMany({
              where: { id: candidate.mediaId, deletedAt: null },
              data: { processingStatus: "FAILED" },
            });
          } else if (candidate.step === "FACE") {
            await prisma.media.updateMany({
              where: { id: candidate.mediaId, deletedAt: null },
              data: { processingStatus: "READY" },
            });
          }
        } finally {
          clearInterval(heartbeat);
        }
      }
    } else {
      const worked = await processFamilyJob();
      if (!worked && process.env.WORKER_ONCE === "true") {
        await cleanup();
        break;
      }
    }
    if (++ticks % 60 === 0) await cleanup();
  } catch {
    console.error("Worker database unavailable; retrying");
  }
  if (process.env.WORKER_ONCE === "true") continue;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
await prisma.$disconnect();

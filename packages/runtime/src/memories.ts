import { createHash } from "node:crypto";
import { prisma } from "./db";
export async function generateMemories(familyId: string) {
  const photos = await prisma.media.findMany({
    where: { familyId: familyId, deletedAt: null, processingStatus: "READY" },
    orderBy: { uploadedAt: "desc" },
    take: 5000,
  });
  photos.sort(
    (a, b) =>
      (a.takenAt || a.uploadedAt).getTime() -
      (b.takenAt || b.uploadedAt).getTime(),
  );
  const clusters: (typeof photos)[] = [];
  for (const photo of photos) {
    const last = clusters.at(-1);
    const previous = last?.at(-1);
    if (
      previous &&
      (photo.takenAt || photo.uploadedAt).getTime() -
        (previous.takenAt || previous.uploadedAt).getTime() <
        48 * 3600000
    )
      last!.push(photo);
    else clusters.push([photo]);
  }
  let createdCount = 0;
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const dateFrom = cluster[0].takenAt || cluster[0].uploadedAt,
      dateTo = cluster.at(-1)!.takenAt || cluster.at(-1)!.uploadedAt;
    const id =
      "auto_" +
      createHash("sha256")
        .update(familyId + ":" + cluster[0].id)
        .digest("hex")
        .slice(0, 32);
    createdCount += await prisma.$transaction(async (tx) => {
      if (await tx.memory.findUnique({ where: { id } })) return 0;
      await tx.memory.create({
        data: {
          id,
          familyId: familyId,
          title:
            dateFrom.toLocaleDateString("en", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }) + " moments",
          dateFrom,
          dateTo,
          mediaCount: cluster.length,
          status: "PUBLISHED",
          coverMediaId: cluster[0].id,
          media: {
            create: cluster.map((m, order) => ({ mediaId: m.id, order })),
          },
        },
      });
      return 1;
    });
  }
  return createdCount;
}

import { prisma } from "@famvault/runtime/db";
import { getFileBuffer, saveFile } from "@famvault/runtime/storage";
import { processImage } from "@famvault/runtime/image-processing";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";
export async function processMediaJob(job: {
  id: string;
  mediaId: string;
  step: string;
  leaseId: string;
}) {
  const media = await prisma.media.findUnique({ where: { id: job.mediaId } });
  if (!media || media.deletedAt) return;
  const buffer = await getFileBuffer(media.originalKey);
  if (!buffer) throw Error("Original file is missing");
  if (job.step === "THUMBNAIL") {
    const processed = await processImage(buffer);
    const thumbKey = `thumbs/${media.id}.jpg`,
      mediumKey = `medium/${media.id}.jpg`;
    await saveFile(thumbKey, processed.thumb, "image/jpeg");
    await saveFile(mediumKey, processed.medium, "image/jpeg");
    await prisma.$transaction(async (tx) => {
      const live = await tx.media.findFirst({
        where: { id: media.id, deletedAt: null },
      });
      const lease = await tx.mediaProcessingJob.findFirst({
        where: { id: job.id, leaseId: job.leaseId, status: "PROCESSING" },
      });
      if (!live || !lease) return;
      const family = await tx.family.findUniqueOrThrow({
        where: { id: media.familyId },
      });
      await tx.media.update({
        where: { id: media.id },
        data: {
          thumbKey,
          mediumKey,
          width: processed.metadata.width,
          height: processed.metadata.height,
          takenAt: processed.metadata.takenAt,
          latitude: processed.metadata.latitude,
          longitude: processed.metadata.longitude,
          exifData: JSON.stringify(processed.metadata.exifData),
          processingStatus: family.faceRecognitionEnabled ? "PROCESSING" : "READY",
        },
      });
      if (
        family.faceRecognitionEnabled &&
        !(await tx.mediaProcessingJob.findFirst({
          where: { mediaId: media.id, step: "FACE" },
        }))
      )
        await tx.mediaProcessingJob.create({
          data: { mediaId: media.id, step: "FACE" },
        });
    });
    return;
  }
  if (job.step !== "FACE") return;
  if (
    await prisma.face.findFirst({
      where: { mediaId: media.id, isVerified: true },
    })
  )
    return;
  const family = await prisma.family.findUniqueOrThrow({
    where: { id: media.familyId },
  });
  if (!family.faceRecognitionEnabled) return;
  const { loadFaceModels, faceapi } = await import("../lib/face-api");
  await loadFaceModels();
  const { data, info } = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = tf.tensor3d(new Uint8Array(data), [
    info.height,
    info.width,
    3,
  ]);
  try {
    const detections = await faceapi
      .detectAllFaces(
        tensor as unknown as Parameters<typeof faceapi.detectAllFaces>[0],
      )
      .withFaceLandmarks()
      .withFaceDescriptors();
    const prepared: {
      cropKey: string;
      confidence: number;
      descriptor: number[];
      bbox: { x: number; y: number; w: number; h: number };
    }[] = [];
    for (const [i, detection] of detections.entries()) {
      const b = detection.detection.box;
      const left = Math.max(0, Math.floor(b.x)),
        top = Math.max(0, Math.floor(b.y));
      const width = Math.min(info.width - left, Math.ceil(b.width)),
        height = Math.min(info.height - top, Math.ceil(b.height));
      if (width < 1 || height < 1) continue;
      const cropKey = `faces/${media.id}-${i}.jpg`;
      const crop = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 3 },
      })
        .extract({ left, top, width, height })
        .resize(200, 200)
        .jpeg()
        .toBuffer();
      await saveFile(cropKey, crop, "image/jpeg");
      prepared.push({
        cropKey,
        confidence: detection.detection.score,
        descriptor: Array.from(detection.descriptor),
        bbox: {
          x: left / info.width,
          y: top / info.height,
          w: width / info.width,
          h: height / info.height,
        },
      });
    }
    await prisma.$transaction(async (tx) => {
      if (
        !(await tx.media.findFirst({
          where: { id: media.id, deletedAt: null },
        })) ||
        !(await tx.mediaProcessingJob.findFirst({
          where: { id: job.id, leaseId: job.leaseId, status: "PROCESSING" },
        }))
      )
        return;
      if (
        await tx.face.findFirst({
          where: { mediaId: media.id, isVerified: true },
        })
      )
        return;
      const prior = await tx.face.findMany({
        where: { mediaId: media.id },
        select: { personId: true },
      });
      await tx.face.deleteMany({ where: { mediaId: media.id } });
      const existing = await tx.face.findMany({
        where: {
          descriptor: { not: null },
          person: { familyId: media.familyId },
          media: { familyId: media.familyId, deletedAt: null },
        },
        select: { personId: true, descriptor: true },
      });
      const touched = new Set(
        prior.map((f) => f.personId).filter((id): id is string => !!id),
      );
      for (const face of prepared) {
        let personId: string | null = null;
        let best = 0.55;
        for (const entry of existing) {
          try {
            const other = JSON.parse(entry.descriptor!);
            if (!Array.isArray(other) || other.length !== 128) continue;
            const distance = faceapi.euclideanDistance(face.descriptor, other);
            if (distance < best) {
              best = distance;
              personId = entry.personId;
            }
          } catch {}
        }
        if (!personId)
          personId = (
            await tx.person.create({ data: { familyId: media.familyId } })
          ).id;
        const created = await tx.face.create({
          data: {
            mediaId: media.id,
            personId,
            bbox: JSON.stringify(face.bbox),
            descriptor: JSON.stringify(face.descriptor),
            cropKey: face.cropKey,
            confidence: face.confidence,
          },
        });
        existing.push({
          personId,
          descriptor: JSON.stringify(face.descriptor),
        });
        touched.add(personId);
        await tx.person.update({
          where: { id: personId },
          data: { coverFaceId: created.id },
        });
      }
      for (const id of touched) {
        const distinct = await tx.face.findMany({
          where: { personId: id, media: { deletedAt: null } },
          distinct: ["mediaId"],
          select: { mediaId: true },
        });
        await tx.person.updateMany({
          where: { id, familyId: media.familyId },
          data: { photoCount: distinct.length },
        });
      }
      
      await tx.media.update({
        where: { id: media.id },
        data: { processingStatus: "READY" }
      });
    });
  } finally {
    tf.dispose(tensor);
  }
}

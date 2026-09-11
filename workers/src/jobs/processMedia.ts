import { getFileBuffer, saveFile, generateStorageKey } from '../../../frontend/src/lib/storage';
import { processImage } from '../../../frontend/src/lib/image-processing';
import prisma from '../lib/db';
import { faceapi, loadFaceModels } from '../lib/face-api';
import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';
export async function processMediaJob(data: { mediaId: string; key: string; filename: string }) {
  const { mediaId, key, filename } = data;

  // 1. Update status to PROCESSING
  await prisma.mediaProcessingJob.updateMany({
    where: { mediaId, step: 'THUMBNAIL' },
    data: { status: 'PROCESSING', startedAt: new Date() }
  });

  try {
    // 2. Fetch original file buffer
    const buffer = await getFileBuffer(key);
    if (!buffer) {
      throw new Error(`Could not read file buffer for key: ${key}`);
    }

    // 3. Process image (thumbnails + EXIF)
    const processed = await processImage(buffer);

    // 4. Save thumbnails
    const thumbKey = key.replace('originals/', 'thumbs/');
    const mediumKey = key.replace('originals/', 'medium/');

    await saveFile(thumbKey, processed.thumb, 'image/jpeg');
    await saveFile(mediumKey, processed.medium, 'image/jpeg');

    // 5. Update Database Media
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        thumbKey,
        mediumKey,
        width: processed.metadata.width,
        height: processed.metadata.height,
        takenAt: processed.metadata.takenAt,
        latitude: processed.metadata.latitude,
        longitude: processed.metadata.longitude,
        exifData: processed.metadata.exifData ? JSON.stringify(processed.metadata.exifData) : undefined,
        processingStatus: 'READY'
      }
    });

    // 6. Face Detection
    try {
      await loadFaceModels();
      
      const { data: rawData, info: rawInfo } = await sharp(buffer)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      const tensor = tf.tensor3d(new Uint8Array(rawData), [rawInfo.height, rawInfo.width, 3]);
      const detections = await faceapi.detectAllFaces(tensor as any).withFaceLandmarks().withFaceDescriptors();
      
      if (detections.length > 0) {
        // Fetch existing faces for clustering
        const existingFaces = await prisma.face.findMany({
          where: { descriptor: { not: null }, personId: { not: null } },
          select: { id: true, personId: true, descriptor: true }
        });

        // Family ID is required to create a new person. We can get it via the media -> uploader -> familyId.
        const mediaWithUser = await prisma.media.findUnique({
          where: { id: mediaId },
          include: { uploader: true }
        });
        const familyId = mediaWithUser?.uploader.familyId;

        for (const [i, detection] of detections.entries()) {
          const { box, score } = detection.detection;
          const descriptor = detection.descriptor;

          // Crop face image
          const pad = 0.2; // 20% padding
          const left = Math.max(0, Math.floor(box.x - box.width * pad));
          const top = Math.max(0, Math.floor(box.y - box.height * pad));
          const width = Math.min(processed.metadata.width! - left, Math.floor(box.width * (1 + pad * 2)));
          const height = Math.min(processed.metadata.height! - top, Math.floor(box.height * (1 + pad * 2)));

          const faceCropBuffer = await sharp(buffer)
            .extract({ left, top, width, height })
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();

          const faceCropKey = `faces/${mediaId}-face-${i}.jpg`;
          await saveFile(faceCropKey, faceCropBuffer, 'image/jpeg');

          // Naive in-memory clustering
          let bestMatchPersonId: string | null = null;
          let minDistance = 0.6; // 0.6 is typical threshold for Euclidean distance

          for (const existing of existingFaces) {
            if (!existing.descriptor) continue;
            const existingDescriptor = new Float32Array(JSON.parse(existing.descriptor));
            const distance = faceapi.euclideanDistance(descriptor, existingDescriptor);
            
            if (distance < minDistance) {
              minDistance = distance;
              bestMatchPersonId = existing.personId;
            }
          }

          // If no match and we have familyId, create a new Person
          if (!bestMatchPersonId && familyId) {
            const newPerson = await prisma.person.create({
              data: {
                familyId,
                name: null,
                photoCount: 0
              }
            });
            bestMatchPersonId = newPerson.id;
          }

          // Create Face record
          const faceRecord = await prisma.face.create({
            data: {
              mediaId,
              personId: bestMatchPersonId,
              bbox: JSON.stringify({ x: box.x, y: box.y, w: box.width, h: box.height }),
              cropKey: faceCropKey,
              confidence: score,
              descriptor: JSON.stringify(Array.from(descriptor))
            }
          });

          // Update Person cover face and count
          if (bestMatchPersonId) {
            await prisma.person.update({
              where: { id: bestMatchPersonId },
              data: {
                photoCount: { increment: 1 },
                coverFaceId: faceRecord.id // always set latest as cover for now
              }
            });
          }
        }
      }
      
      // Cleanup tensor memory
      tf.dispose(tensor);
      
    } catch (faceError) {
      console.error('Face detection failed:', faceError);
      // We don't fail the whole job if only face detection fails, but log it.
    }

    // Mark job complete
    await prisma.mediaProcessingJob.updateMany({
      where: { mediaId, step: 'THUMBNAIL' },
      data: { status: 'COMPLETED', doneAt: new Date() }
    });

  } catch (error: any) {
    console.error('Process media failed:', error);
    await prisma.mediaProcessingJob.updateMany({
      where: { mediaId, step: 'THUMBNAIL' },
      data: { status: 'FAILED', error: error.message, doneAt: new Date() }
    });
    await prisma.media.update({
      where: { id: mediaId },
      data: { processingStatus: 'FAILED' }
    });
    throw error;
  }
}

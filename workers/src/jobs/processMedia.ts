import { getFileBuffer, saveFile, generateStorageKey } from '../../../frontend/src/lib/storage';
import { processImage } from '../../../frontend/src/lib/image-processing';
import prisma from '../lib/db';

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

    // 5. Update Database
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

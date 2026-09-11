import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth, getClientIp } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { processImage } from "@/lib/image-processing";
import {
  ensureUploadDirs,
  generateStorageKey,
  saveFile,
  getPublicUrl,
} from "@/lib/storage";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/photos — List photos for the user's family, grouped by date.
 * Scoped to the authenticated user's family.
 */
export const GET = withFamilyAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  // All queries scoped to family via uploader's familyId
  const photos = await prisma.media.findMany({
    where: {
      uploader: {
        familyId: ctx.familyId,
      },
    },
    orderBy: [
      { takenAt: { sort: "desc", nulls: "last" } },
      { uploadedAt: "desc" },
    ],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      uploader: { select: { name: true } },
      favorites: {
        where: { userId: ctx.userId },
        select: { userId: true },
      },
    },
  });

  const hasMore = photos.length > limit;
  const items = photos.slice(0, limit);

  const photoItems = items.map((photo) => ({
    id: photo.id,
    filename: photo.filename,
    thumbUrl: getPublicUrl(photo.thumbKey),
    mediumUrl: photo.mediumKey
      ? getPublicUrl(photo.mediumKey)
      : getPublicUrl(photo.originalKey),
    originalUrl: getPublicUrl(photo.originalKey),
    width: photo.width,
    height: photo.height,
    takenAt: (photo.takenAt || photo.uploadedAt).toISOString(),
    uploadedAt: photo.uploadedAt.toISOString(),
    placeName: photo.placeName,
    isFavorite: photo.favorites.length > 0,
    uploaderName: photo.uploader.name,
    processingStatus: photo.processingStatus,
    exifData: photo.exifData || null,
  }));

  return NextResponse.json({
    items: photoItems,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
});

/**
 * POST /api/photos — Upload one or more photos.
 * Requires MEMBER role or higher.
 */
export const POST = withFamilyAuth(
  async (req: NextRequest, ctx) => {
    try {
      await ensureUploadDirs();

      const formData = await req.formData();
      const files = formData.getAll("files") as File[];

      if (files.length === 0) {
        return NextResponse.json(
          { error: "No files provided" },
          { status: 400 }
        );
      }

      const results = [];

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          continue; // Skip non-image files for now
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const key = generateStorageKey(file.name, "originals");

        // Process image: extract EXIF, generate thumbnails
        const processed = await processImage(buffer);

        // Generate keys for different sizes
        const thumbKey = key.replace("originals/", "thumbs/");
        const mediumKey = key.replace("originals/", "medium/");

        // Save all versions
        await saveFile(key, processed.original, "image/jpeg");
        await saveFile(thumbKey, processed.thumb, "image/jpeg");
        await saveFile(mediumKey, processed.medium, "image/jpeg");

        // Save to database
        const photo = await prisma.media.create({
          data: {
            filename: file.name,
            originalKey: key,
            thumbKey: thumbKey,
            mediumKey: mediumKey,
            mimeType: file.type,
            width: processed.metadata.width,
            height: processed.metadata.height,
            sizeBytes: buffer.length,
            takenAt: processed.metadata.takenAt,
            latitude: processed.metadata.latitude,
            longitude: processed.metadata.longitude,
            exifData: processed.metadata.exifData
              ? (processed.metadata.exifData as unknown as import("@prisma/client").Prisma.InputJsonValue)
              : undefined,
            uploaderId: ctx.userId,
            processingStatus: "READY", // For MVP, mark as ready immediately
          },
        });

        results.push({
          id: photo.id,
          filename: photo.filename,
          thumbUrl: getPublicUrl(thumbKey),
        });
      }

      // Audit log
      await logAudit({
        familyId: ctx.familyId,
        userId: ctx.userId,
        action: "UPLOAD",
        resourceType: "MEDIA",
        details: { count: results.length, filenames: results.map((r) => r.filename) },
        ipAddress: getClientIp(req),
      });

      return NextResponse.json({ uploaded: results }, { status: 201 });
    } catch (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }
  },
  { minRole: "MEMBER" }
);

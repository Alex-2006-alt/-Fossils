import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processImage } from "@/lib/image-processing";
import {
  ensureUploadDirs,
  generateStorageKey,
  saveOriginal,
  saveThumbnail,
  saveMedium,
  getPublicUrl,
} from "@/lib/storage";

/**
 * GET /api/photos — List photos for the user's family, grouped by date.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch photos for the family
  const photos = await prisma.photo.findMany({
    where: {
      uploader: {
        familyId: user.familyId,
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
        where: { userId: session.user.id as string },
        select: { userId: true },
      },
    },
  });

  const hasMore = photos.length > limit;
  const items = photos.slice(0, limit);

  const photoItems = items.map((photo) => ({
    id: photo.id,
    filename: photo.filename,
    thumbUrl: getPublicUrl(photo.thumbKey, "thumbs"),
    mediumUrl: photo.mediumKey
      ? getPublicUrl(photo.mediumKey, "medium")
      : getPublicUrl(photo.originalKey, "originals"),
    originalUrl: getPublicUrl(photo.originalKey, "originals"),
    width: photo.width,
    height: photo.height,
    takenAt: (photo.takenAt || photo.uploadedAt).toISOString(),
    uploadedAt: photo.uploadedAt.toISOString(),
    placeName: photo.placeName,
    isFavorite: photo.favorites.length > 0,
    uploaderName: photo.uploader.name,
    exifData: photo.exifData ? JSON.parse(photo.exifData) : null,
  }));

  return NextResponse.json({
    items: photoItems,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

/**
 * POST /api/photos — Upload one or more photos.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      const key = generateStorageKey(file.name);

      // Process image: extract EXIF, generate thumbnails
      const processed = await processImage(buffer);

      // Save all versions
      await saveOriginal(key, processed.original);
      await saveThumbnail(key, processed.thumb);
      await saveMedium(key, processed.medium);

      // Save to database
      const photo = await prisma.photo.create({
        data: {
          filename: file.name,
          originalKey: key,
          thumbKey: key,
          mediumKey: key,
          mimeType: file.type,
          width: processed.metadata.width,
          height: processed.metadata.height,
          sizeBytes: buffer.length,
          takenAt: processed.metadata.takenAt,
          latitude: processed.metadata.latitude,
          longitude: processed.metadata.longitude,
          exifData: processed.metadata.exifData
            ? JSON.stringify(processed.metadata.exifData)
            : null,
          uploaderId: session.user.id as string,
        },
      });

      results.push({
        id: photo.id,
        filename: photo.filename,
        thumbUrl: getPublicUrl(key, "thumbs"),
      });
    }

    return NextResponse.json({ uploaded: results }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

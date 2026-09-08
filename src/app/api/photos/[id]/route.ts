import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteFile, getPublicUrl } from "@/lib/storage";

/**
 * GET /api/photos/[id] — Get a single photo's details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      uploader: { select: { name: true, familyId: true } },
      favorites: {
        where: { userId: session.user.id as string },
        select: { userId: true },
      },
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json({
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
  });
}

/**
 * DELETE /api/photos/[id] — Delete a photo.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { uploader: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Only the uploader or an admin can delete
  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
  });

  if (photo.uploaderId !== session.user.id && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete files from storage
  await deleteFile(photo.originalKey, "originals");
  await deleteFile(photo.thumbKey, "thumbs");
  if (photo.mediumKey) {
    await deleteFile(photo.mediumKey, "medium");
  }

  // Delete from database
  await prisma.photo.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

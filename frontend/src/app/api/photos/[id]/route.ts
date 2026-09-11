import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth, getClientIp } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { deleteFile, getPublicUrl } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { hasRole, Role } from "@/types";

/**
 * GET /api/photos/[id] — Get a single photo's details.
 */
export const GET = withFamilyAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing photo ID" }, { status: 400 });
  }

  const photo = await prisma.media.findUnique({
    where: { id },
    include: {
      uploader: { select: { name: true, familyId: true } },
      favorites: {
        where: { userId: ctx.userId },
        select: { userId: true },
      },
      tags: { select: { label: true, source: true } },
      faces: {
        select: {
          id: true,
          personId: true,
          person: { select: { name: true } },
          confidence: true,
        },
      },
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Family boundary check
  if (photo.uploader.familyId !== ctx.familyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
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
    tags: photo.tags.map((t) => t.label),
    people: photo.faces
      .filter((f) => f.person)
      .map((f) => ({ id: f.personId!, name: f.person!.name })),
  });
});

/**
 * DELETE /api/photos/[id] — Delete a photo.
 * Requires MEMBER role (can delete own) or ADMIN (can delete any).
 */
export const DELETE = withFamilyAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing photo ID" }, { status: 400 });
    }

    const photo = await prisma.media.findUnique({
      where: { id },
      include: { uploader: { select: { familyId: true } } },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Family boundary check
    if (photo.uploader.familyId !== ctx.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the uploader or an admin can delete
    if (photo.uploaderId !== ctx.userId && !hasRole(ctx.role as Role, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete files from storage
    await deleteFile(photo.originalKey);
    await deleteFile(photo.thumbKey);
    if (photo.mediumKey) {
      await deleteFile(photo.mediumKey);
    }

    // Delete from database (cascades to faces, tags, etc.)
    await prisma.media.delete({ where: { id } });

    // Audit log
    await logAudit({
      familyId: ctx.familyId,
      userId: ctx.userId,
      action: "DELETE",
      resourceType: "MEDIA",
      resourceId: id,
      details: { filename: photo.filename },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  },
  { minRole: "MEMBER" }
);

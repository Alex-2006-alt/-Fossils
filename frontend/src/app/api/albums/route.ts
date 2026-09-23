import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth, getClientIp } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
/**
 * GET /api/albums — List all albums for the family.
 */
export const GET = withFamilyAuth(async (req, ctx) => {
  const albums = await prisma.album.findMany({
    where: { familyId: ctx.familyId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { media: true } },
      media: {
        take: 1,
        orderBy: { addedAt: "desc" },
        include: {
          media: { select: { thumbKey: true } },
        },
      },
    },
  });
  const items = albums.map((album) => ({
    id: album.id,
    title: album.title,
    description: album.description,
    type: album.type,
    coverUrl: album.media[0]?.media?.thumbKey
      ? getPublicUrl(album.media[0].media.thumbKey)
      : null,
    photoCount: album._count.media,
    createdAt: album.createdAt.toISOString(),
  }));
  return NextResponse.json({ items });
});
/**
 * POST /api/albums — Create a new album.
 * Requires MEMBER role or higher.
 */
export const POST = withFamilyAuth(
  async (req: NextRequest, ctx) => {
    const { title, description, photoIds } = await req.json();
    if (!title) {
      return NextResponse.json(
        { error: "Album title is required" },
        { status: 400 },
      );
    }
    if (
      photoIds !== undefined &&
      (!Array.isArray(photoIds) ||
        photoIds.some((id: unknown) => typeof id !== "string"))
    ) {
      return NextResponse.json(
        { error: "Invalid photo selection" },
        { status: 400 },
      );
    }
    if (photoIds?.length) {
      const ownedCount = await prisma.media.count({
        where: { id: { in: photoIds }, uploader: { familyId: ctx.familyId } },
      });
      if (ownedCount !== photoIds.length) {
        return NextResponse.json(
          { error: "Choose unique photos from your own family collection" },
          { status: 400 },
        );
      }
    }
    const album = await prisma.album.create({
      data: {
        title,
        description: description || null,
        familyId: ctx.familyId,
        type: "MANUAL",
        ...(photoIds?.length
          ? {
              media: {
                create: photoIds.map((mediaId: string, index: number) => ({
                  mediaId,
                  order: index,
                })),
              },
            }
          : {}),
      },
    });
    // Audit log
    await logAudit({
      familyId: ctx.familyId,
      userId: ctx.userId,
      action: "ALBUM_CREATE",
      resourceType: "ALBUM",
      resourceId: album.id,
      details: { title: album.title, photoCount: photoIds?.length || 0 },
      ipAddress: getClientIp(req),
    });
    return NextResponse.json(
      { id: album.id, title: album.title },
      { status: 201 },
    );
  },
  { minRole: "MEMBER" },
);

import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/photos/[id]/favorite — Toggle favorite status.
 */
export const POST = withFamilyAuth(async (req: NextRequest, ctx, params) => {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing photo ID" }, { status: 400 });
  }

  // Verify photo belongs to user's family
  const photo = await prisma.media.findUnique({
    where: { id },
    include: { uploader: { select: { familyId: true } } },
  });

  if (!photo || photo.uploader.familyId !== ctx.familyId) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Toggle favorite
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_mediaId: { userId: ctx.userId, mediaId: id },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_mediaId: { userId: ctx.userId, mediaId: id },
      },
    });
    return NextResponse.json({ favorited: false });
  } else {
    await prisma.favorite.create({
      data: { userId: ctx.userId, mediaId: id },
    });
    return NextResponse.json({ favorited: true });
  }
});

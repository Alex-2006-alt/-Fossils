import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withFamilyAuth } from "@/lib/api-auth";
import { HttpError } from "@famvault/runtime/security";
export const POST = withFamilyAuth(async (_, ctx, params) => {
  const photo = await prisma.media.findFirst({
    where: { id: params?.id, familyId: ctx.familyId, deletedAt: null },
    select: { id: true },
  });
  if (!photo) throw new HttpError(404, "Photo not found");
  const isFavorite = await prisma.$transaction(async (tx) => {
    const key = { userId: ctx.userId, mediaId: photo.id };
    const existing = await tx.favorite.findUnique({
      where: { userId_mediaId: key },
    });
    if (existing) {
      await tx.favorite.delete({ where: { userId_mediaId: key } });
      return false;
    }
    await tx.favorite.create({ data: key });
    return true;
  });
  return NextResponse.json({ isFavorite });
});

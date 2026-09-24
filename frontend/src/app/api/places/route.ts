import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { toPhotoItem } from "@/lib/photo-item";
export const GET = withFamilyAuth(async (req, ctx) => {
  const family = await prisma.family.findUniqueOrThrow({
    where: { id: ctx.familyId },
  });
  if (!family.locationVisible)
    return NextResponse.json({ items: [], locationVisible: false });
  const page = Math.max(
    0,
    Math.min(100000, Number(req.nextUrl.searchParams.get("page")) || 0),
  );
  const photos = await prisma.media.findMany({
    where: {
      familyId: ctx.familyId,
      deletedAt: null,
      processingStatus: "READY",
      OR: [
        { placeName: { not: null } },
        { latitude: { not: null }, longitude: { not: null } },
      ],
    },
    orderBy: { id: "asc" },
    skip: Math.floor(page) * 100,
    take: 101,
    include: {
      uploader: { select: { name: true } },
      favorites: { where: { userId: ctx.userId } },
    },
  });
  return NextResponse.json({
    locationVisible: true,
    items: photos
      .slice(0, 100)
      .map((p) => ({
        photo: toPhotoItem(p),
        latitude: p.latitude,
        longitude: p.longitude,
        placeName: p.placeName,
      })),
    nextPage: photos.length > 100 ? page + 1 : null,
  });
});

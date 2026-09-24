import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { toPhotoItem } from "@/lib/photo-item";
import { HttpError } from "@famvault/runtime/security";
export const GET = withFamilyAuth(async (req, ctx) => {
  const timeZone = req.nextUrl.searchParams.get("timeZone") || "UTC";
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    throw new HttpError(400, "Invalid time zone");
  }
  const parts = (date: Date) =>
    Object.fromEntries(
      format.formatToParts(date).map((p) => [p.type, p.value]),
    );
  const today = parts(new Date());
  const photos = await prisma.media.findMany({
    where: {
      familyId: ctx.familyId,
      deletedAt: null,
      processingStatus: "READY",
      takenAt: { not: null },
    },
    include: {
      uploader: { select: { name: true } },
      favorites: { where: { userId: ctx.userId } },
    },
    orderBy: { takenAt: "desc" },
    take: 10000,
  });
  const grouped = new Map<string, typeof photos>();
  for (const photo of photos) {
    const date = parts(photo.takenAt!);
    if (
      date.year < today.year &&
      date.month === today.month &&
      date.day === today.day
    ) {
      const group = grouped.get(date.year) || [];
      group.push(photo);
      grouped.set(date.year, group);
    }
  }
  const anniversaries = [...grouped].map(([year, list]) => {
    const yearsAgo = Number(today.year) - Number(year),
      items = list.map(toPhotoItem);
    return {
      year: Number(year),
      yearsAgo,
      title: yearsAgo + " years ago today",
      subtitle: year,
      coverUrl: items[0]?.mediumUrl,
      photos: items,
    };
  });
  return NextResponse.json({
    hasMemories: !!anniversaries.length,
    anniversaries,
  });
});

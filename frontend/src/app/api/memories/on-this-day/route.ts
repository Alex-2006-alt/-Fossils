import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

/**
 * GET /api/memories/on-this-day
 * Retrieves photos taken on today's calendar date in previous years.
 */
export const GET = withFamilyAuth(async (req: NextRequest, ctx) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate(); // 1-31
    const currentYear = today.getFullYear();

    // Fetch all media for family
    const allMedia = await prisma.media.findMany({
      where: {
        uploader: { familyId: ctx.familyId },
      },
      orderBy: [
        { takenAt: { sort: "desc", nulls: "last" } },
        { uploadedAt: "desc" },
      ],
      include: {
        uploader: { select: { name: true } },
        favorites: {
          where: { userId: ctx.userId },
          select: { userId: true },
        },
      },
    });

    // Match photos within ±2 days of today in past years
    const matchedByYear: Record<number, typeof allMedia> = {};

    for (const media of allMedia) {
      const date = new Date(media.takenAt || media.uploadedAt);
      const year = date.getFullYear();

      // Only past years
      if (year >= currentYear) continue;

      const month = date.getMonth();
      const day = date.getDate();

      // Check if within same month and within 2 days of today
      if (month === currentMonth && Math.abs(day - currentDay) <= 2) {
        if (!matchedByYear[year]) {
          matchedByYear[year] = [];
        }
        matchedByYear[year].push(media);
      }
    }

    const anniversaries = Object.entries(matchedByYear)
      .map(([yearStr, mediaList]) => {
        const year = parseInt(yearStr, 10);
        const yearsAgo = currentYear - year;

        const photos = mediaList.map((photo) => ({
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
          exifData: {},
        }));

        return {
          year,
          yearsAgo,
          title: `${yearsAgo} year${yearsAgo !== 1 ? "s" : ""} ago today`,
          subtitle: `${year}`,
          coverUrl: photos[0]?.mediumUrl || photos[0]?.thumbUrl,
          photos,
        };
      })
      .sort((a, b) => a.yearsAgo - b.yearsAgo);

    return NextResponse.json({
      hasMemories: anniversaries.length > 0,
      anniversaries,
    });
  } catch (error: any) {
    console.error("GET /api/memories/on-this-day error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve anniversary memories", details: error.message },
      { status: 500 }
    );
  }
});

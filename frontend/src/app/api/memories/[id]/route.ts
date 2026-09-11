import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

/**
 * GET /api/memories/[id]
 * Fetch single memory story with its ordered photos and participating people.
 */
export const GET = withFamilyAuth(async (req, ctx, params) => {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Memory ID is required" },
        { status: 400 }
      );
    }

    const memory = await prisma.memory.findFirst({
      where: {
        id,
        familyId: ctx.familyId,
      },
      include: {
        media: {
          orderBy: { order: "asc" },
          include: {
            media: {
              include: {
                uploader: { select: { name: true } },
                favorites: {
                  where: { userId: ctx.userId },
                  select: { userId: true },
                },
                faces: {
                  include: {
                    person: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!memory) {
      return NextResponse.json(
        { error: "Memory not found" },
        { status: 404 }
      );
    }

    // Extract photos
    const photos = memory.media.map(({ media }) => {
      let parsedExif: any = {};
      try {
        if (media.exifData) parsedExif = JSON.parse(media.exifData);
      } catch {}

      return {
        id: media.id,
        filename: media.filename,
        thumbUrl: getPublicUrl(media.thumbKey),
        mediumUrl: media.mediumKey
          ? getPublicUrl(media.mediumKey)
          : getPublicUrl(media.originalKey),
        originalUrl: getPublicUrl(media.originalKey),
        width: media.width,
        height: media.height,
        takenAt: (media.takenAt || media.uploadedAt).toISOString(),
        uploadedAt: media.uploadedAt.toISOString(),
        placeName: media.placeName,
        isFavorite: media.favorites.length > 0,
        uploaderName: media.uploader.name,
        processingStatus: media.processingStatus,
        exifData: {
          camera: parsedExif.camera || null,
          focalLength: parsedExif.focalLength || null,
          aperture: parsedExif.aperture || null,
          iso: parsedExif.iso || null,
          exposureTime: parsedExif.exposureTime || null,
          lens: parsedExif.lens || null,
        },
      };
    });

    // Lookup participating people
    let peopleList: { id: string; name: string; coverUrl: string | null }[] = [];
    try {
      const ids: string[] = JSON.parse(memory.peopleIds || "[]");
      if (ids.length > 0) {
        const people = await prisma.person.findMany({
          where: { id: { in: ids }, familyId: ctx.familyId },
          include: {
            faces: {
              take: 1,
              where: { cropKey: { not: null } },
            },
          },
        });
        peopleList = people.map((p) => ({
          id: p.id,
          name: p.name || "Unknown",
          coverUrl: p.faces[0]?.cropKey ? getPublicUrl(p.faces[0].cropKey) : null,
        }));
      }
    } catch {}

    const firstMedia = memory.media[0]?.media;
    const coverUrl = firstMedia?.mediumKey
      ? getPublicUrl(firstMedia.mediumKey)
      : firstMedia?.thumbKey
      ? getPublicUrl(firstMedia.thumbKey)
      : null;

    return NextResponse.json({
      memory: {
        id: memory.id,
        title: memory.title,
        subtitle: memory.subtitle,
        story: memory.story,
        locationName: memory.locationName,
        dateFrom: memory.dateFrom.toISOString(),
        dateTo: memory.dateTo.toISOString(),
        mediaCount: photos.length,
        coverUrl,
        people: peopleList,
      },
      photos,
    });
  } catch (error: any) {
    console.error("GET /api/memories/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory", details: error.message },
      { status: 500 }
    );
  }
});

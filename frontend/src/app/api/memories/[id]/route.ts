import { NextResponse } from "next/server";
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
        { status: 400 },
      );
    }

    const memory = await prisma.memory.findFirst({
      where: {
        id,
        familyId: ctx.familyId,
      },
      include: {
        media: {
          where: {
            media: {
              familyId: ctx.familyId,
              deletedAt: null,
              processingStatus: "READY",
            },
          },
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
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Extract photos
    const photos = memory.media.map(({ media }) => {
      let parsedExif: Record<string, unknown> = {};
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
    let peopleList: { id: string; name: string; coverUrl: string | null }[] =
      [];
    try {
      const ids: string[] = JSON.parse(memory.peopleIds || "[]");
      if (ids.length > 0) {
        const people = await prisma.person.findMany({
          where: { id: { in: ids }, familyId: ctx.familyId },
          include: {
            faces: {
              take: 1,
              where: {
                cropKey: { not: null },
                media: { familyId: ctx.familyId, deletedAt: null },
              },
            },
          },
        });
        peopleList = people.map((p) => ({
          id: p.id,
          name: p.name || "Unknown",
          coverUrl: p.faces[0]?.cropKey
            ? getPublicUrl(p.faces[0].cropKey)
            : null,
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
  } catch (error) {
    console.error("GET /api/memories/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory" },
      { status: 500 },
    );
  }
});

import { z } from "zod";
import { jsonBody, nameSchema, HttpError } from "@famvault/runtime/security";
export const PATCH = withFamilyAuth(
  async (req, ctx, params) => {
    const data = z
      .object({
        title: nameSchema.optional(),
        story: z.string().max(10000).nullable().optional(),
        status: z.enum(["PUBLISHED", "ARCHIVED"]).optional(),
      })
      .parse(await jsonBody(req));
    const result = await prisma.memory.updateMany({
      where: { id: params?.id, familyId: ctx.familyId },
      data,
    });
    if (!result.count) throw new HttpError(404, "Memory not found");
    return NextResponse.json({ success: true });
  },
  { minRole: "MEMBER" },
);

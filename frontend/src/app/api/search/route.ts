import type { Prisma } from "@famvault/runtime/client";
import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

export const GET = withFamilyAuth(async (req: NextRequest, ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const personId = searchParams.get("personId");
    const place = searchParams.get("place");
    const yearParam = searchParams.get("year");
    const favorite = searchParams.get("favorite") === "true";

    // 1. Retrieve all known family members for entity recognition in natural queries
    const familyPeople = await prisma.person.findMany({
      where: { familyId: ctx.familyId, isHidden: false },
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

    const matchedPersonIds: string[] = [];
    const matchedPeopleList: {
      id: string;
      name: string;
      photoCount: number;
      coverUrl: string | null;
    }[] = [];

    // Parse natural language keywords if q is present
    let detectedYear: number | null = null;
    let queryWithoutYear = q;

    if (q) {
      const yearMatch = q.match(/\b(19\d\d|20\d\d)\b/);
      if (yearMatch) {
        detectedYear = parseInt(yearMatch[1], 10);
        queryWithoutYear = q.replace(yearMatch[0], "").trim();
      }

      // Check if any person name appears in the query
      const lowerQuery = q.toLowerCase();
      for (const person of familyPeople) {
        if (person.name && lowerQuery.includes(person.name.toLowerCase())) {
          matchedPersonIds.push(person.id);
          matchedPeopleList.push({
            id: person.id,
            name: person.name,
            photoCount: person.photoCount,
            coverUrl: person.faces[0]?.cropKey
              ? getPublicUrl(person.faces[0].cropKey)
              : null,
          });
        }
      }
    }

    if (personId && !matchedPersonIds.includes(personId)) {
      matchedPersonIds.push(personId);
      const person = familyPeople.find((p) => p.id === personId);
      if (person) {
        matchedPeopleList.push({
          id: person.id,
          name: person.name || "Unknown",
          photoCount: person.photoCount,
          coverUrl: person.faces[0]?.cropKey
            ? getPublicUrl(person.faces[0].cropKey)
            : null,
        });
      }
    }

    // Determine target year (from query string or explicit param)
    const activeYear = yearParam ? parseInt(yearParam, 10) : detectedYear;

    // Build the query filters
    const andFilters: Prisma.MediaWhereInput[] = [
      {
        familyId: ctx.familyId,
        deletedAt: null,
      },
    ];

    if (favorite) {
      andFilters.push({
        favorites: {
          some: { userId: ctx.userId },
        },
      });
    }

    if (place) {
      andFilters.push({
        placeName: { contains: place },
      });
    }

    if (activeYear && !isNaN(activeYear)) {
      const startOfYear = new Date(`${activeYear}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${activeYear}-12-31T23:59:59.999Z`);
      andFilters.push({
        OR: [
          { takenAt: { gte: startOfYear, lte: endOfYear } },
          { uploadedAt: { gte: startOfYear, lte: endOfYear } },
        ],
      });
    }

    // Direct person filter if provided via parameter
    if (personId) {
      andFilters.push({
        faces: {
          some: { personId },
        },
      });
    }

    // Text search filter
    if (q) {
      const orClauses: Prisma.MediaWhereInput[] = [
        { filename: { contains: q } },
        { placeName: { contains: q } },
        { tags: { some: { label: { contains: q } } } },
        { exifData: { contains: q } },
      ];

      if (queryWithoutYear && queryWithoutYear !== q) {
        orClauses.push(
          { filename: { contains: queryWithoutYear } },
          { placeName: { contains: queryWithoutYear } },
          { tags: { some: { label: { contains: queryWithoutYear } } } },
        );
      }

      if (matchedPersonIds.length > 0) {
        orClauses.push({
          faces: {
            some: {
              personId: { in: matchedPersonIds },
            },
          },
        });
      }

      andFilters.push({ OR: orClauses });
    }

    const where = { AND: andFilters };

    // Execute photos search
    const photos = await prisma.media.findMany({
      where,
      orderBy: [
        { takenAt: { sort: "desc", nulls: "last" } },
        { uploadedAt: "desc" },
      ],
      take: 80,
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
        tags: { select: { label: true } },
      },
    });

    // Format results to standard PhotoItem
    const photoItems = photos.map((photo) => {
      let parsedExif: Record<string, unknown> = {};
      try {
        if (photo.exifData) parsedExif = JSON.parse(photo.exifData);
      } catch {}

      return {
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
        exifData: {
          camera: parsedExif.camera || null,
          focalLength: parsedExif.focalLength || null,
          aperture: parsedExif.aperture || null,
          iso: parsedExif.iso || null,
          exposureTime: parsedExif.exposureTime || null,
          lens: parsedExif.lens || null,
        },
        tags: photo.tags.map((t) => t.label),
        people: photo.faces
          .filter((f) => f.person)
          .map((f) => ({
            id: f.person!.id,
            name: f.person!.name || "Unknown",
          })),
      };
    });

    // Extract unique matching places from current results
    const matchedPlaces = Array.from(
      new Set(
        photos
          .map((p) => p.placeName)
          .filter((p): p is string => Boolean(p && p.trim().length > 0)),
      ),
    );

    return NextResponse.json({
      photos: photoItems,
      matchedPeople: matchedPeopleList,
      matchedPlaces,
      totalCount: photoItems.length,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

/**
 * GET /api/memories
 * Retrieves all curated memories and auto-albums for the family.
 */
export const GET = withFamilyAuth(async (req: NextRequest, ctx) => {
  try {
    const memories = await prisma.memory.findMany({
      where: {
        familyId: ctx.familyId,
        status: { not: "ARCHIVED" },
      },
      orderBy: {
        dateFrom: "desc",
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
          take: 4,
          orderBy: { order: "asc" },
          include: {
            media: {
              select: {
                id: true,
                thumbKey: true,
                mediumKey: true,
                originalKey: true,
              },
            },
          },
        },
      },
    });

    // Also fetch all family people for avatar lookups
    const allPeople = await prisma.person.findMany({
      where: { familyId: ctx.familyId },
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
    const peopleMap = new Map(
      allPeople.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name || "Unknown",
          coverUrl: p.faces[0]?.cropKey
            ? getPublicUrl(p.faces[0].cropKey)
            : null,
        },
      ]),
    );

    const items = memories.map((mem) => {
      // Find cover photo
      const firstMedia = mem.media[0]?.media;
      const coverUrl = firstMedia?.mediumKey
        ? getPublicUrl(firstMedia.mediumKey)
        : firstMedia?.thumbKey
          ? getPublicUrl(firstMedia.thumbKey)
          : null;

      // Extract people
      let peopleList: { id: string; name: string; coverUrl: string | null }[] =
        [];
      try {
        const ids: string[] = JSON.parse(mem.peopleIds || "[]");
        peopleList = ids
          .map((id) => peopleMap.get(id))
          .filter(Boolean) as typeof peopleList;
      } catch {}

      return {
        id: mem.id,
        title: mem.title,
        subtitle: mem.subtitle,
        story: mem.story,
        locationName: mem.locationName,
        dateFrom: mem.dateFrom.toISOString(),
        dateTo: mem.dateTo.toISOString(),
        mediaCount: mem.mediaCount,
        coverUrl,
        previewThumbs: mem.media.map((m) => getPublicUrl(m.media.thumbKey)),
        people: peopleList,
        isAuto: mem.isAuto,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/memories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 },
    );
  }
});

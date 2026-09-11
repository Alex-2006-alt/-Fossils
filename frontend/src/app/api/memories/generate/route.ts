import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/memories/generate
 * Analyzes family photos and automatically groups them into time & location clusters
 * to generate event memories and highlight reels.
 */
export const POST = withFamilyAuth(async (req: NextRequest, ctx) => {
  try {
    // 1. Fetch all media belonging to this family
    const allMedia = await prisma.media.findMany({
      where: {
        uploader: {
          familyId: ctx.familyId,
        },
      },
      include: {
        faces: {
          select: { personId: true },
        },
      },
    });

    if (allMedia.length === 0) {
      return NextResponse.json({
        message: "No photos available to generate memories.",
        createdCount: 0,
      });
    }

    // Sort chronologically
    const sorted = [...allMedia].sort((a, b) => {
      const dateA = new Date(a.takenAt || a.uploadedAt).getTime();
      const dateB = new Date(b.takenAt || b.uploadedAt).getTime();
      return dateA - dateB;
    });

    // 2. Time-clustering: group photos where gap <= 48 hours
    const CLUSTER_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours
    const clusters: (typeof sorted)[] = [];
    let currentCluster: typeof sorted = [];

    for (const item of sorted) {
      const itemTime = new Date(item.takenAt || item.uploadedAt).getTime();
      if (currentCluster.length === 0) {
        currentCluster.push(item);
      } else {
        const lastItem = currentCluster[currentCluster.length - 1];
        const lastTime = new Date(lastItem.takenAt || lastItem.uploadedAt).getTime();

        if (itemTime - lastTime <= CLUSTER_WINDOW_MS) {
          currentCluster.push(item);
        } else {
          clusters.push(currentCluster);
          currentCluster = [item];
        }
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // Filter clusters to those with at least 2 photos (or if vault is small, clusters of 1+)
    const viableClusters = clusters.filter((c) => c.length >= 2 || clusters.length === 1);

    // Fetch family people for names
    const familyPeople = await prisma.person.findMany({
      where: { familyId: ctx.familyId },
      select: { id: true, name: true },
    });
    const personMap = new Map(familyPeople.map((p) => [p.id, p.name || "Unknown"]));

    let createdCount = 0;

    for (const cluster of viableClusters) {
      const firstPhoto = cluster[0];
      const lastPhoto = cluster[cluster.length - 1];
      const dateFrom = new Date(firstPhoto.takenAt || firstPhoto.uploadedAt);
      const dateTo = new Date(lastPhoto.takenAt || lastPhoto.uploadedAt);

      // Check if memory for this date range already exists
      const existing = await prisma.memory.findFirst({
        where: {
          familyId: ctx.familyId,
          dateFrom: {
            gte: new Date(dateFrom.getTime() - 12 * 60 * 60 * 1000),
            lte: new Date(dateFrom.getTime() + 12 * 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        continue;
      }

      // Find location (most common placeName)
      const placeCounts: Record<string, number> = {};
      for (const photo of cluster) {
        if (photo.placeName) {
          placeCounts[photo.placeName] = (placeCounts[photo.placeName] || 0) + 1;
        }
      }
      let topPlace: string | null = null;
      let maxPlaceCount = 0;
      for (const [place, count] of Object.entries(placeCounts)) {
        if (count > maxPlaceCount) {
          topPlace = place;
          maxPlaceCount = count;
        }
      }

      // Extract people appearing in cluster
      const peopleIdsSet = new Set<string>();
      for (const photo of cluster) {
        for (const face of photo.faces) {
          if (face.personId) peopleIdsSet.add(face.personId);
        }
      }
      const peopleIds = Array.from(peopleIdsSet);
      const peopleNames = peopleIds
        .map((id) => personMap.get(id))
        .filter(Boolean) as string[];

      // Generate dynamic titles
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthStr = monthNames[dateFrom.getMonth()];
      const yearStr = dateFrom.getFullYear();

      let title = "";
      if (topPlace) {
        title = `${topPlace} Trip`;
      } else if (dateFrom.toDateString() === dateTo.toDateString()) {
        title = `${monthStr} Moments`;
      } else {
        title = `${monthStr} ${yearStr} Highlights`;
      }

      const subtitle =
        dateFrom.toDateString() === dateTo.toDateString()
          ? `${monthStr} ${dateFrom.getDate()}, ${yearStr}`
          : `${monthStr} ${dateFrom.getDate()} – ${dateTo.getDate()}, ${yearStr}`;

      const story = `A collection of ${cluster.length} moments captured${
        topPlace ? ` around ${topPlace}` : ""
      }${peopleNames.length ? ` featuring ${peopleNames.slice(0, 3).join(", ")}` : ""}.`;

      // Select best cover photo (prefer one with faces or first photo)
      const coverPhoto =
        cluster.find((p) => p.faces.length > 0) || cluster[0];

      // Create Memory record
      const memory = await prisma.memory.create({
        data: {
          familyId: ctx.familyId,
          title,
          subtitle,
          coverMediaId: coverPhoto.id,
          story,
          dateFrom,
          dateTo,
          locationName: topPlace,
          mediaCount: cluster.length,
          peopleIds: JSON.stringify(peopleIds),
          status: "PUBLISHED",
          isAuto: true,
        },
      });

      // Insert junction items
      await prisma.memoryMedia.createMany({
        data: cluster.map((photo, index) => ({
          memoryId: memory.id,
          mediaId: photo.id,
          order: index,
        })),
      });

      createdCount++;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      totalClusters: viableClusters.length,
    });
  } catch (error: any) {
    console.error("POST /api/memories/generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate memories", details: error.message },
      { status: 500 }
    );
  }
});

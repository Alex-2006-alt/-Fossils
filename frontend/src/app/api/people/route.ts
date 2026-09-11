import { NextRequest, NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

export const GET = withFamilyAuth(async (req: NextRequest, ctx) => {
  try {
    const people = await prisma.person.findMany({
      where: { familyId: ctx.familyId },
      orderBy: { photoCount: 'desc' },
      include: {
        faces: {
          take: 1,
          where: { cropKey: { not: null } },
        }
      }
    });

    // Resolve public URLs for cover faces
    const results = people.map(p => {
      // Find the cover face crop if it exists
      const coverFace = p.faces[0];
      return {
        id: p.id,
        name: p.name || "Unknown",
        photoCount: p.photoCount,
        coverUrl: coverFace && coverFace.cropKey ? getPublicUrl(coverFace.cropKey) : null
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("GET /api/people error:", error);
    return NextResponse.json(
      { error: "Failed to load people" },
      { status: 500 }
    );
  }
});

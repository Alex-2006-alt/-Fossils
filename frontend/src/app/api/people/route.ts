import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";
export const GET = withFamilyAuth(async (req, ctx) => {
  const people = await prisma.person.findMany({
    where: { familyId: ctx.familyId, isHidden: false },
    orderBy: { name: "asc" },
    include: {
      faces: {
        where: { media: { familyId: ctx.familyId, deletedAt: null } },
        select: { mediaId: true, cropKey: true },
      },
    },
  });
  return NextResponse.json(
    people.map((p) => ({
      id: p.id,
      name: p.name || "Unknown",
      photoCount: new Set(p.faces.map((f) => f.mediaId)).size,
      coverUrl: getPublicUrl(p.faces.find((f) => f.cropKey)?.cropKey || ""),
    })),
  );
});

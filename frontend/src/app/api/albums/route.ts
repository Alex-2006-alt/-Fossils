import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";
import { z } from "zod";
import {
  jsonBody,
  HttpError,
  idSchema,
  nameSchema,
} from "@famvault/runtime/security";
export const GET = withFamilyAuth(async (req, ctx) => {
  const albums = await prisma.album.findMany({
    where: { familyId: ctx.familyId },
    orderBy: { createdAt: "desc" },
    include: {
      media: {
        where: { media: { familyId: ctx.familyId, deletedAt: null } },
        orderBy: { order: "asc" },
        select: { media: { select: { id: true, thumbKey: true } } },
      },
    },
  });
  return NextResponse.json({
    items: albums.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      coverUrl: getPublicUrl(
        (a.media.find((m) => m.media.id === a.coverMediaId) || a.media[0])
          ?.media.thumbKey || "",
      ),
      photoCount: a.media.length,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});
export const POST = withFamilyAuth(
  async (req, ctx) => {
    const data = z
      .object({
        title: nameSchema,
        description: z.string().max(2000).optional(),
        photoIds: z.array(idSchema).max(500).default([]),
      })
      .parse(await jsonBody(req));
    const ids = [...new Set(data.photoIds)];
    if (
      (await prisma.media.count({
        where: { id: { in: ids }, familyId: ctx.familyId, deletedAt: null },
      })) !== ids.length
    )
      throw new HttpError(400, "Invalid photo selection");
    const album = await prisma.album.create({
      data: {
        familyId: ctx.familyId,
        title: data.title,
        description: data.description,
        media: { create: ids.map((mediaId, order) => ({ mediaId, order })) },
      },
    });
    return NextResponse.json(
      { id: album.id, title: album.title },
      { status: 201 },
    );
  },
  { minRole: "MEMBER" },
);

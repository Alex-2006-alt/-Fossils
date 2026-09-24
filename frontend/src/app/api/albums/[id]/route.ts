import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  jsonBody,
  HttpError,
  idSchema,
  nameSchema,
} from "@famvault/runtime/security";
export const PATCH = withFamilyAuth(
  async (req, ctx, params) => {
    const body = z
      .object({
        title: nameSchema.optional(),
        description: z.string().max(2000).nullable().optional(),
        addPhotoIds: z.array(idSchema).max(500).default([]),
        removePhotoIds: z.array(idSchema).max(500).default([]),
        coverMediaId: idSchema.nullable().optional(),
      })
      .parse(await jsonBody(req));
    await prisma.$transaction(async (tx) => {
      const album = await tx.album.findFirst({
        where: { id: params?.id, familyId: ctx.familyId },
      });
      if (!album) throw new HttpError(404, "Album not found");
      const ids = [...new Set(body.addPhotoIds)];
      if (
        (await tx.media.count({
          where: { id: { in: ids }, familyId: ctx.familyId, deletedAt: null },
        })) !== ids.length
      )
        throw new HttpError(400, "Invalid photo selection");
      await tx.albumMedia.deleteMany({
        where: { albumId: album.id, mediaId: { in: body.removePhotoIds } },
      });
      for (const mediaId of ids)
        await tx.albumMedia.upsert({
          where: { albumId_mediaId: { albumId: album.id, mediaId } },
          create: { albumId: album.id, mediaId },
          update: {},
        });
      if (
        body.coverMediaId &&
        !(await tx.albumMedia.findFirst({
          where: {
            albumId: album.id,
            mediaId: body.coverMediaId,
            media: { familyId: ctx.familyId, deletedAt: null },
          },
        }))
      )
        throw new HttpError(400, "Cover must belong to this album");
      await tx.album.update({
        where: { id: album.id },
        data: {
          title: body.title,
          description: body.description,
          coverMediaId:
            body.coverMediaId !== undefined
              ? body.coverMediaId
              : body.removePhotoIds.includes(album.coverMediaId || "")
                ? null
                : undefined,
        },
      });
    });
    return NextResponse.json({ success: true });
  },
  { minRole: "MEMBER" },
);
export const DELETE = withFamilyAuth(
  async (req, ctx, params) => {
    const result = await prisma.album.deleteMany({
      where: { id: params?.id, familyId: ctx.familyId },
    });
    if (!result.count) throw new HttpError(404, "Album not found");
    return NextResponse.json({ success: true });
  },
  { minRole: "ADMIN" },
);

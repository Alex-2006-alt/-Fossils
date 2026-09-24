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
    const data = z
      .object({
        name: nameSchema.optional(),
        isHidden: z.boolean().optional(),
        mergeIntoId: idSchema.optional(),
        faceId: idSchema.optional(),
      })
      .parse(await jsonBody(req));
    await prisma.$transaction(async (tx) => {
      const person = await tx.person.findFirst({
        where: { id: params?.id, familyId: ctx.familyId },
      });
      if (!person) throw new HttpError(404, "Person not found");
      if (data.faceId) {
        const face = await tx.face.findFirst({
          where: {
            id: data.faceId,
            media: { familyId: ctx.familyId, deletedAt: null },
          },
        });
        if (!face) throw new HttpError(404, "Face not found");
        await tx.face.update({
          where: { id: face.id },
          data: { personId: person.id, isVerified: true },
        });
      }
      if (data.mergeIntoId) {
        const target = await tx.person.findFirst({
          where: { id: data.mergeIntoId, familyId: ctx.familyId },
        });
        if (!target || target.id === person.id)
          throw new HttpError(400, "Choose another person in your family");
        if (
          await tx.familyTreeNode.findFirst({ where: { personId: person.id } })
        )
          throw new HttpError(
            409,
            "Unlink the source person from the family tree before merging",
          );
        await tx.face.updateMany({
          where: { personId: person.id, media: { familyId: ctx.familyId } },
          data: { personId: target.id, isVerified: true },
        });
        await tx.person.update({
          where: { id: person.id },
          data: { isHidden: true, photoCount: 0 },
        });
      } else
        await tx.person.update({
          where: { id: person.id },
          data: { name: data.name, isHidden: data.isHidden },
        });
      const people = await tx.person.findMany({
        where: { familyId: ctx.familyId },
        select: { id: true },
      });
      for (const p of people) {
        const faces = await tx.face.findMany({
          where: {
            personId: p.id,
            media: { familyId: ctx.familyId, deletedAt: null },
          },
          distinct: ["mediaId"],
          select: { id: true },
        });
        await tx.person.update({
          where: { id: p.id },
          data: { photoCount: faces.length, coverFaceId: faces[0]?.id || null },
        });
      }
    });
    return NextResponse.json({ success: true });
  },
  { minRole: "ADMIN" },
);

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withFamilyAuth } from "@/lib/api-auth";
import { toPhotoItem } from "@/lib/photo-item";
import { jsonBody, HttpError, canRole } from "@famvault/runtime/security";
export const GET = withFamilyAuth(async (_, ctx, params) => {
  const photo = await prisma.media.findFirst({
    where: { id: params?.id, familyId: ctx.familyId, deletedAt: null },
    include: {
      uploader: { select: { name: true } },
      favorites: { where: { userId: ctx.userId } },
      faces: {
        where: {
          OR: [{ personId: null }, { person: { familyId: ctx.familyId } }],
        },
        select: {
          id: true,
          personId: true,
          person: { select: { name: true } },
        },
      },
      processingJobs: { select: { step: true, status: true, retries: true } },
    },
  });
  if (!photo) throw new HttpError(404, "Photo not found");
  return NextResponse.json({
    ...toPhotoItem(photo),
    jobs: photo.processingJobs,
    canEdit:
      canRole(ctx.role, "MEMBER") &&
      (photo.uploaderId === ctx.userId || canRole(ctx.role, "ADMIN")),
    faces: photo.faces.map((f) => ({
      id: f.id,
      personId: f.personId,
      name: f.person?.name || "Unknown",
    })),
  });
});
export const PATCH = withFamilyAuth(
  async (req, ctx, params) => {
    const body = z
      .object({
        filename: z.string().trim().min(1).max(255).optional(),
        placeName: z.string().trim().max(150).nullable().optional(),
        takenAt: z.iso.datetime().nullable().optional(),
        retry: z.boolean().optional(),
        restore: z.boolean().optional(),
      })
      .parse(await jsonBody(req));
    const photo = await prisma.media.findFirst({
      where: { id: params?.id, familyId: ctx.familyId },
    });
    if (!photo) throw new HttpError(404, "Photo not found");
    if (photo.uploaderId !== ctx.userId && !canRole(ctx.role, "ADMIN"))
      throw new HttpError(403, "You can only edit your own photos");
    if (photo.deletedAt && !body.restore)
      throw new HttpError(404, "Photo not found");
    if (body.restore) {
      const restored = await prisma.media.updateMany({
        where: {
          id: photo.id,
          purgeStartedAt: null,
          deletedAt: { gt: new Date(Date.now() - 7 * 86400000) },
        },
        data: { deletedAt: null },
      });
      if (!restored.count)
        throw new HttpError(
          410,
          "This photo is no longer available to restore",
        );
    } else if (body.retry) {
      await prisma.$transaction(async (tx) => {
        await tx.mediaProcessingJob.updateMany({
          where: { mediaId: photo.id, status: "FAILED" },
          data: {
            status: "PENDING",
            retries: 0,
            error: null,
            startedAt: null,
            doneAt: null,
          },
        });
        if (photo.processingStatus === "FAILED")
          await tx.media.update({
            where: { id: photo.id },
            data: { processingStatus: "UPLOADED" },
          });
      });
    } else {
      await prisma.media.update({
        where: { id: photo.id },
        data: {
          filename: body.filename,
          placeName: body.placeName,
          takenAt:
            body.takenAt === undefined
              ? undefined
              : body.takenAt
                ? new Date(body.takenAt)
                : null,
        },
      });
    }
    return NextResponse.json({ success: true });
  },
  { minRole: "MEMBER" },
);
export const DELETE = withFamilyAuth(
  async (_, ctx, params) => {
    const photo = await prisma.media.findFirst({
      where: { id: params?.id, familyId: ctx.familyId, deletedAt: null },
    });
    if (!photo) throw new HttpError(404, "Photo not found");
    if (photo.uploaderId !== ctx.userId && !canRole(ctx.role, "ADMIN"))
      throw new HttpError(403, "You can only delete your own photos");
    await prisma.$transaction(async (tx) => {
      await tx.media.update({
        where: { id: photo.id },
        data: { deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          familyId: ctx.familyId,
          userId: ctx.userId,
          action: "DELETE",
          resourceId: photo.id,
          resourceType: "MEDIA",
        },
      });
    });
    return NextResponse.json({ success: true, retentionDays: 7 });
  },
  { minRole: "MEMBER" },
);

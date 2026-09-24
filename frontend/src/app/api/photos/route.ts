import { NextResponse } from "next/server";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { withFamilyAuth } from "@/lib/api-auth";
import { toPhotoItem } from "@/lib/photo-item";
import { boundedBody, HttpError } from "@famvault/runtime/security";
import { saveFile, deleteFile, generateStorageKey } from "@/lib/storage";
import type { Prisma } from "@famvault/runtime/client";
export const GET = withFamilyAuth(async (req, ctx) => {
  const params = new URL(req.url).searchParams;
  const limit = Math.max(1, Math.min(Number(params.get("limit")) || 40, 100));
  const year = Number(params.get("year"));
  const q = params.get("q")?.trim().slice(0, 100);
  const cursor = params.get("cursor");
  const where: Prisma.MediaWhereInput = {
    familyId: ctx.familyId,
    deletedAt: null,
    ...(params.get("favorite") === "true"
      ? { favorites: { some: { userId: ctx.userId } } }
      : {}),
    ...(q
      ? {
          OR: [
            { filename: { contains: q } },
            { placeName: { contains: q } },
            { uploader: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(year >= 1800 && year <= 9998 && Number.isInteger(year)
      ? {
          AND: [
            {
              OR: [
                {
                  takenAt: {
                    gte: new Date(Date.UTC(year, 0)),
                    lt: new Date(Date.UTC(year + 1, 0)),
                  },
                },
                {
                  takenAt: null,
                  uploadedAt: {
                    gte: new Date(Date.UTC(year, 0)),
                    lt: new Date(Date.UTC(year + 1, 0)),
                  },
                },
              ],
            },
          ],
        }
      : {}),
  };
  if (
    cursor &&
    !(await prisma.media.findFirst({
      where: { ...where, id: cursor },
      select: { id: true },
    }))
  )
    throw new HttpError(400, "Invalid cursor");
  const rows = await prisma.media.findMany({
    where,
    take: Math.floor(limit) + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [
      { takenAt: { sort: "desc", nulls: "last" } },
      { uploadedAt: "desc" },
      { id: "desc" },
    ],
    include: {
      uploader: { select: { name: true } },
      favorites: { where: { userId: ctx.userId }, select: { userId: true } },
    },
  });
  const items = rows.slice(0, limit);
  return NextResponse.json({
    items: items.map(toPhotoItem),
    nextCursor: rows.length > limit ? items.at(-1)!.id : null,
  });
});
export const POST = withFamilyAuth(
  async (req, ctx) => {
    const bytes = await boundedBody(req, 52 * 1024 * 1024);
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("content-type") || "" },
      body: new Uint8Array(bytes),
    })
      .formData()
      .catch(() => {
        throw new HttpError(400, "Invalid multipart upload");
      });
    const files = form.getAll("files");
    if (!files.length || files.length > 8)
      throw new HttpError(400, "Choose between 1 and 8 photos");
    const uploaded = [];
    const errors = [];
    for (const [index, file] of files.entries()) {
      let key: string | undefined;
      let committed = false;
      try {
        if (
          !(file instanceof File) ||
          file.size === 0 ||
          file.size > 25 * 1024 * 1024
        )
          throw new HttpError(400, "Photo must be between 1 byte and 25 MB");
        const buffer = Buffer.from(await file.arrayBuffer());
        const metadata = await sharp(buffer, {
          limitInputPixels: 40_000_000,
          animated: false,
        }).metadata();
        const formats: Record<string, string> = {
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          avif: "image/avif",
          heif: "image/heif",
        };
        if (
          !metadata.format ||
          !formats[metadata.format] ||
          (metadata.pages || 1) > 1
        )
          throw new HttpError(
            400,
            "Use a supported still image (JPEG, PNG, WebP, AVIF or HEIF)",
          );
        // Decode before accepting a file, not just its claimed extension or MIME type.
        await sharp(buffer, { limitInputPixels: 40_000_000 })
          .resize(1, 1)
          .toBuffer();
        const checksum = createHash("sha256").update(buffer).digest("hex");
        const existing = await prisma.media.findFirst({
          where: { familyId: ctx.familyId, checksum, deletedAt: null },
        });
        if (existing) {
          uploaded.push({
            id: existing.id,
            filename: existing.filename,
            status: existing.processingStatus,
            duplicate: true,
            index,
          });
          continue;
        }
        key = generateStorageKey("photo." + metadata.format);
        await saveFile(key, buffer, formats[metadata.format]);
        const media = await prisma.$transaction(async (tx) => {
          const usage = await tx.media.aggregate({
            where: { familyId: ctx.familyId },
            _sum: { sizeBytes: true },
          });
          if (
            (usage._sum.sizeBytes || 0) + buffer.length >
            Number(process.env.FAMILY_QUOTA_BYTES || 5 * 1024 * 1024 * 1024)
          )
            throw new HttpError(413, "Family storage limit reached");
          return tx.media.create({
            data: {
              familyId: ctx.familyId,
              uploaderId: ctx.userId,
              filename: file.name.slice(0, 255),
              originalKey: key!,
              thumbKey: "",
              mimeType: formats[metadata.format!],
              width: metadata.width || 0,
              height: metadata.height || 0,
              sizeBytes: buffer.length,
              checksum,
              processingJobs: {
                create: { step: "THUMBNAIL", status: "PENDING" },
              },
            },
          });
        });
        committed = true;
        uploaded.push({
          id: media.id,
          filename: media.filename,
          status: "UPLOADED",
          index,
        });
      } catch (e) {
        if (key && !committed) await deleteFile(key).catch(() => {});
        errors.push({
          index,
          filename: file instanceof File ? file.name : "file",
          error:
            e instanceof HttpError ? e.message : "Invalid or unreadable image",
        });
      }
    }
    return NextResponse.json(
      { uploaded, errors },
      { status: uploaded.length ? 201 : 400 },
    );
  },
  { minRole: "MEMBER" },
);

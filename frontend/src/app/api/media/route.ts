// No next/server imports needed
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getFileBuffer, validStorageKey } from "@/lib/storage";
import { HttpError } from "@famvault/runtime/security";
export const GET = withFamilyAuth(async (req, ctx) => {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || !validStorageKey(key))
    throw new HttpError(404, "Media not found");
  const media = await prisma.media.findFirst({
    where: {
      familyId: ctx.familyId,
      deletedAt: null,
      OR: [{ originalKey: key }, { thumbKey: key }, { mediumKey: key }],
    },
  });
  const face = media
    ? null
    : await prisma.face.findFirst({
        where: {
          cropKey: key,
          media: { familyId: ctx.familyId, deletedAt: null },
        },
        include: { media: true },
      });
  if (!media && !face) throw new HttpError(404, "Media not found");
  const photo = media || face!.media;
  const buffer = await getFileBuffer(key);
  if (!buffer) throw new HttpError(404, "Media not found");
  const original = key === photo.originalKey;
  const type = original ? photo.mimeType : "image/jpeg";
  const safeType = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ].includes(type)
    ? type
    : "application/octet-stream";
  const download =
    original && new URL(req.url).searchParams.get("download") === "true";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": safeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${download || safeType === "application/octet-stream" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(photo.filename).replace(/'/g, "%27")}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
});

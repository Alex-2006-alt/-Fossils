import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getPublicUrl } from "@/lib/storage";
import PhotoGrid from "@/components/PhotoGrid";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      faces: {
        include: { media: true }
      }
    }
  });

  if (!person) {
    return notFound();
  }

  // Extract unique media from faces
  const mediaMap = new Map();
  for (const face of person.faces) {
    if (!face.media) continue;
    if (!mediaMap.has(face.media.id)) {
      mediaMap.set(face.media.id, {
        id: face.media.id,
        filename: face.media.filename,
        thumbUrl: face.media.thumbKey ? getPublicUrl(face.media.thumbKey) : null,
        width: face.media.width,
        height: face.media.height,
        takenAt: face.media.takenAt?.toISOString() || face.media.uploadedAt.toISOString(),
      });
    }
  }

  const photos = Array.from(mediaMap.values()).sort((a, b) => 
    new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
  );

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "40px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--color-stone-800)",
            margin: 0
          }}
        >
          {person.name || "Unknown Person"}
        </h1>
        <span
          style={{
            padding: "6px 12px",
            background: "var(--color-stone-100)",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-stone-600)"
          }}
        >
          {photos.length} photos
        </span>
      </div>

      <PhotoGrid photos={photos} onPhotoClick={() => {}} />
    </div>
  );
}

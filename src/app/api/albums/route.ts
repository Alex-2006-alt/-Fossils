import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

/**
 * GET /api/albums — List all albums for the family.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const albums = await prisma.album.findMany({
    where: { familyId: user.familyId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { photos: true } },
      photos: {
        take: 1,
        include: {
          photo: { select: { thumbKey: true } },
        },
      },
    },
  });

  const items = albums.map((album) => ({
    id: album.id,
    title: album.title,
    description: album.description,
    coverUrl:
      album.photos[0]?.photo?.thumbKey
        ? getPublicUrl(album.photos[0].photo.thumbKey, "thumbs")
        : null,
    photoCount: album._count.photos,
    createdAt: album.createdAt.toISOString(),
  }));

  return NextResponse.json({ items });
}

/**
 * POST /api/albums — Create a new album.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, photoIds } = await req.json();

  if (!title) {
    return NextResponse.json(
      { error: "Album title is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const album = await prisma.album.create({
    data: {
      title,
      description: description || null,
      familyId: user.familyId,
      ...(photoIds?.length
        ? {
            photos: {
              create: photoIds.map((photoId: string) => ({
                photoId,
              })),
            },
          }
        : {}),
    },
  });

  return NextResponse.json(
    { id: album.id, title: album.title },
    { status: 201 }
  );
}

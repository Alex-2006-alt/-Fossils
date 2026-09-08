import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/photos/[id]/favorite — Toggle favorite status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id as string;

  // Check if already favorited
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_photoId: { userId, photoId: id },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_photoId: { userId, photoId: id },
      },
    });
    return NextResponse.json({ favorited: false });
  } else {
    await prisma.favorite.create({
      data: { userId, photoId: id },
    });
    return NextResponse.json({ favorited: true });
  }
}

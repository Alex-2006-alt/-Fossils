import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/Design";
import CollectionDetail from "@/components/CollectionDetail";
import { toPhotoItem } from "@/lib/photo-item";
export default async function AlbumPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });
  if (!user) notFound();
  const { id } = await params;
  const album = await prisma.album.findFirst({
    where: { id, familyId: user.familyId },
    include: {
      media: {
        where: { media: { uploader: { familyId: user.familyId } } },
        orderBy: { order: "asc" },
        include: {
          media: {
            include: {
              uploader: { select: { name: true } },
              favorites: {
                where: { userId: session.user.id },
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });
  if (!album) notFound();
  return (
    <div className="page">
      <Link href="/albums" className="text-link" style={{ marginBottom: 24 }}>
        ← All albums
      </Link>
      <PageHeader
        eyebrow="A CHAPTER OF YOUR OWN"
        title={album.title}
        description={
          album.description || `${album.media.length} collected moments.`
        }
      />
      <CollectionDetail
        photos={album.media.map((item) => toPhotoItem(item.media))}
      />
    </div>
  );
}

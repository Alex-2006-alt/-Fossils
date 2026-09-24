import { prisma } from "@/lib/db";
import CollectionControls from "@/components/CollectionControls";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/Design";
import CollectionDetail from "@/components/CollectionDetail";
import { toPhotoItem } from "@/lib/photo-item";
export default async function PersonPage({
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
  const person = await prisma.person.findFirst({
    where: { id, familyId: user.familyId },
    include: {
      faces: {
        where: { media: { familyId: user.familyId, deletedAt: null } },
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
  if (!person) notFound();
  const photos = Array.from(
    new Map(
      person.faces.map((face) => [face.media.id, toPhotoItem(face.media)]),
    ).values(),
  );
  return (
    <div className="page">
      <Link href="/people" className="text-link" style={{ marginBottom: 24 }}>
        ← All your people
      </Link>
      <PageHeader
        eyebrow="A FAMILIAR FACE, A THOUSAND STORIES"
        title={person.name || "Someone special."}
        description={`${photos.length} moments from your shared story.`}
      />
      <CollectionControls
        kind="people"
        id={person.id}
        title={person.name || "Unknown"}
      />
      <CollectionDetail photos={photos} />
    </div>
  );
}

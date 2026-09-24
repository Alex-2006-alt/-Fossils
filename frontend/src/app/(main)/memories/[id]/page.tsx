"use client";
import CollectionControls from "@/components/CollectionControls";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader, QueryError } from "@/components/Design";
import CollectionDetail from "@/components/CollectionDetail";
import type { PhotoItem } from "@/types";
interface MemoryDetail {
  id: string;
  title: string;
  subtitle: string | null;
  story: string | null;
  coverUrl: string | null;
  locationName: string | null;
  dateFrom: string;
}
export default function MemoryPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = use(params);
  const query = useQuery<{
    memory: MemoryDetail;
    photos: PhotoItem[];
  }>({
    queryKey: ["memory", id],
    queryFn: async () => {
      const response = await fetch(`/api/memories/${id}`);
      if (!response.ok) throw Error("Could not load this story");
      return response.json();
    },
  });
  return (
    <div className="page">
      <Link href="/memories" className="text-link" style={{ marginBottom: 24 }}>
        ← All memories
      </Link>
      {query.isLoading ? (
        <div className="skeleton" style={{ height: 350 }} />
      ) : query.isError ? (
        <QueryError retry={() => query.refetch()} />
      ) : (
        query.data && (
          <>
            <PageHeader
              eyebrow="A STORY WORTH RELIVING"
              title={query.data.memory.title}
              description={
                query.data.memory.subtitle ||
                new Date(query.data.memory.dateFrom).toLocaleDateString("en", {
                  month: "long",
                  year: "numeric",
                })
              }
            />
            {query.data.memory.coverUrl && (
              <div className="memory-detail-cover">
                <img
                  src={query.data.memory.coverUrl}
                  alt={query.data.memory.title}
                />
                <span>
                  {query.data.memory.locationName || "From your family archive"}
                </span>
              </div>
            )}
            {query.data.memory.story && (
              <blockquote className="memory-story">
                {query.data.memory.story}
              </blockquote>
            )}
            <CollectionControls
              kind="memories"
              id={query.data.memory.id}
              title={query.data.memory.title}
            />
            <CollectionDetail key={id} photos={query.data.photos} />
          </>
        )
      )}
    </div>
  );
}

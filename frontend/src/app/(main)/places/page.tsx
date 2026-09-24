"use client";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { PageHeader, QueryError, EmptyState } from "@/components/Design";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import { request } from "@/lib/request";
import type { PhotoItem } from "@/types";
type Place = {
  photo: PhotoItem;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
};
type Result = {
  items: Place[];
  locationVisible: boolean;
  nextPage: number | null;
};
export default function PlacesPage() {
  const [selected, setSelected] = useState<string | null>(null),
    [index, setIndex] = useState<number | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["places"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      request<Result>("/api/places?page=" + pageParam),
    getNextPageParam: (p) => p.nextPage ?? undefined,
  });
  const places = query.data?.pages.flatMap((p) => p.items) || [];
  const label = (p: Place) =>
    p.placeName ||
    (p.latitude !== null && p.longitude !== null
      ? p.latitude.toFixed(2) + ", " + p.longitude.toFixed(2)
      : "Unlabelled");
  const groups = [...new Set(places.map(label))];
  const photos = places
    .filter((p) => !selected || label(p) === selected)
    .map((p) => p.photo);
  return (
    <div className="page">
      <PageHeader
        eyebrow="SOMEWHERE, TOGETHER"
        title="The places we’ve been."
        description="Explore the locations saved with your family’s photos."
      />
      <section className="feature-panel">
        <div className="globe-art" aria-hidden="true">
          ◎
        </div>
        <div>
          <span className="eyebrow">YOUR OWN LITTLE WORLD</span>
          <h2>
            {groups.length} places.
            <br />
            Countless stories.
          </h2>
          <p>
            Locations come from your photo metadata and saved place names. Your
            coordinates stay inside your vault.
          </p>
        </div>
      </section>
      {query.isPending ? (
        <p role="status">Finding your places…</p>
      ) : query.isError ? (
        <QueryError retry={() => query.refetch()} />
      ) : !places.length ? (
        <EmptyState
          title={
            query.data?.pages[0].locationVisible === false
              ? "Locations are hidden."
              : "Your next adventure starts here."
          }
          description="Add a place in a photo’s details, or upload a photo with location metadata."
        />
      ) : (
        <>
          <div className="gallery-toolbar">
            <button className="btn-secondary" onClick={() => setSelected(null)}>
              All places
            </button>
            {groups.map((name) => (
              <button
                className="btn-secondary"
                aria-pressed={selected === name}
                key={name}
                onClick={() => setSelected(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <PhotoGrid photos={photos} onPhotoClick={(_, i) => setIndex(i)} />
        </>
      )}
      {query.hasNextPage && (
        <button
          className="btn-secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          Load more places
        </button>
      )}
      <PhotoViewer
        photos={photos}
        isOpen={index !== null}
        currentIndex={index || 0}
        onClose={() => setIndex(null)}
        onNavigate={setIndex}
      />
    </div>
  );
}

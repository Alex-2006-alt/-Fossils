"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { PageHeader, EmptyState, QueryError } from "./Design";
import PhotoGrid from "./PhotoGrid";
import PhotoViewer from "./PhotoViewer";
import UploadZone from "./UploadZone";
import Icon from "./Icon";
import type { PhotoItem } from "@/types";
export default function PhotoCollection({
  favorites = false,
}: {
  favorites?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [upload, setUpload] = useState(false);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [year, setYear] = useState("");
  const [viewer, setViewer] = useState<number | null>(null);
  const filters = new URLSearchParams({ limit: "40" });
  if (favorites) filters.set("favorite", "true");
  if (query) filters.set("q", query);
  if (year) filters.set("year", year);
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<{
    items: PhotoItem[];
    nextCursor: string | null;
  }>({
    queryKey: ["photos", "collection", favorites, query, year],
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams(filters);
      if (pageParam) search.set("cursor", String(pageParam));
      const response = await fetch(`/api/photos?${search}`);
      if (!response.ok) throw Error("Could not load photos");
      return response.json();
    },
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: null as string | null,
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.items.some(
          (photo) => !["READY", "FAILED"].includes(photo.processingStatus),
        ),
      )
        ? 4000
        : false,
  });
  const photos = data?.pages.flatMap((page) => page.items) || [];
  const favorite = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/photos/${id}/favorite`, {
        method: "POST",
      });
      if (!response.ok) throw Error("Could not update favorite");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["photos"] }),
  });
  const closeUpload = () => {
    setUpload(false);
    if (params.get("upload") === "true")
      router.replace(favorites ? "/favorites" : "/timeline", { scroll: false });
  };
  return (
    <div className="page">
      <PageHeader
        eyebrow={
          favorites ? "THE ONES YOU LOVE MOST" : "A LIFE, FRAME BY FRAME"
        }
        title={favorites ? "Close to your heart." : "Your collected moments."}
        description={
          favorites
            ? "A special place for the photos you keep coming back to."
            : "Every little moment, with room for a thousand more."
        }
        action={
          <button className="btn-primary" onClick={() => setUpload(true)}>
            <Icon name="plus" size={16} />
            Add photos
          </button>
        }
      />
      <div className="gallery-toolbar">
        <form
          className="search-field"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(input.trim());
            setViewer(null);
          }}
        >
          <Icon name="search" size={17} />
          <input
            aria-label="Search collection"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (!event.target.value) setQuery("");
            }}
            placeholder="Find a photo or a place…"
          />
          <button className="icon-button" aria-label="Search">
            <Icon name="arrow" size={15} />
          </button>
        </form>
        <div className="filter-chips">
          <button
            className="chip"
            aria-pressed={!year}
            onClick={() => setYear("")}
          >
            All years
          </button>
          <select
            className="chip"
            aria-label="Filter by year"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setViewer(null);
            }}
          >
            <option value="">Choose year</option>
            {Array.from(
              { length: 100 },
              (_, i) => new Date().getFullYear() - i,
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <span className="chip">
            {photos.length}
            {hasNextPage ? "+" : ""} photos
          </span>
        </div>
      </div>
      {isError ? (
        <QueryError retry={() => refetch()} />
      ) : isLoading ? (
        <div className="gallery-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "1" }} />
          ))}
        </div>
      ) : photos.length ? (
        <PhotoGrid
          photos={photos}
          onPhotoClick={(_, index) => setViewer(index)}
        />
      ) : (
        <EmptyState
          icon={favorites ? "heart" : "photos"}
          title={
            query || year
              ? "No moments found."
              : favorites
                ? "Your favorites will feel at home here."
                : "A blank page. A beautiful beginning."
          }
          description={
            query || year
              ? "Try another search or choose a different year."
              : favorites
                ? "Tap the heart while viewing a photo to keep it in this collection."
                : "Upload your first photos and start telling your family’s story."
          }
          href={favorites ? "/timeline" : "/timeline?upload=true"}
          label={favorites ? "Explore your photos" : "Add your first photos"}
        />
      )}
      {hasNextPage && (
        <div className="load-more">
          <button
            className="btn-secondary"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? "Opening more moments…" : "More moments"}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
      {favorite.isError && (
        <p className="form-alert" role="alert">
          Couldn’t update this favorite. Please try again.
        </p>
      )}
      <UploadZone
        isOpen={upload || params.get("upload") === "true"}
        onClose={closeUpload}
      />
      <PhotoViewer
        photos={photos}
        currentIndex={Math.min(viewer || 0, Math.max(0, photos.length - 1))}
        isOpen={viewer !== null}
        onClose={() => setViewer(null)}
        onNavigate={setViewer}
        onToggleFavorite={(id) => favorite.mutate(id)}
      />
    </div>
  );
}

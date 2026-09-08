"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import UploadZone from "@/components/UploadZone";
import type { PhotoItem } from "@/types";

function TimelineContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Open upload modal if URL has ?upload=true
  useEffect(() => {
    if (searchParams.get("upload") === "true") {
      setShowUpload(true);
    }
  }, [searchParams]);

  // Fetch photos with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["photos"],
    queryFn: async ({ pageParam }: { pageParam: string | null }): Promise<{ items: PhotoItem[]; nextCursor: string | null }> => {
      const params = new URLSearchParams({ limit: "50" });
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`/api/photos?${params}`);
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  });

  // Flatten all photos from paginated data
  const allPhotos: PhotoItem[] =
    data?.pages.flatMap((page) => page.items) || [];

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}/favorite`, {
        method: "POST",
      });
      return res.json();
    },
    onMutate: async (photoId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["photos"] });
      queryClient.setQueryData(
        ["photos"],
        (old: { pages: { items: PhotoItem[]; nextCursor: string | null }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((p) =>
                p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
              ),
            })),
          };
        }
      );
    },
  });

  const handlePhotoClick = useCallback(
    (_photo: PhotoItem, index: number) => {
      setCurrentPhotoIndex(index);
      setViewerOpen(true);
    },
    []
  );

  // Infinite scroll observer
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    const sentinel = document.getElementById("scroll-sentinel");
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          padding: "28px 24px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--color-stone-800)",
              margin: "0 0 4px",
              letterSpacing: "-0.5px",
            }}
          >
            Timeline
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-stone-400)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""} in your
            family vault
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="btn-primary"
          style={{ fontSize: "14px", padding: "12px 24px" }}
        >
          ➕ Upload
        </button>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "4px",
            padding: "4px 24px",
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                aspectRatio: i % 3 === 0 ? "4/3" : i % 3 === 1 ? "3/4" : "1",
                borderRadius: "4px",
              }}
            />
          ))}
        </div>
      ) : (
        <>
          <PhotoGrid photos={allPhotos} onPhotoClick={handlePhotoClick} />

          {/* Infinite scroll sentinel */}
          {hasNextPage && (
            <div
              id="scroll-sentinel"
              style={{
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isFetchingNextPage && (
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    border: "2px solid var(--color-stone-200)",
                    borderTopColor: "var(--color-amber-400)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      <UploadZone
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
      />

      {/* Photo Viewer */}
      <PhotoViewer
        photos={allPhotos}
        currentIndex={currentPhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onNavigate={setCurrentPhotoIndex}
        onToggleFavorite={(id) => favoriteMutation.mutate(id)}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dark h1 { color: var(--color-stone-100) !important; }
      `}</style>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div style={{padding: "40px", textAlign: "center"}}>Loading...</div>}>
      <TimelineContent />
    </Suspense>
  );
}

"use client";

import { useState, useCallback, Suspense } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import type { PhotoItem } from "@/types";

function FavoritesContent() {
  const queryClient = useQueryClient();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data, isLoading } = useInfiniteQuery({
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

  // Filter only favorites
  const allPhotos: PhotoItem[] =
    data?.pages
      .flatMap((page) => page.items)
      .filter((p) => p.isFavorite) || [];

  const favoriteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}/favorite`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });

  const handlePhotoClick = useCallback(
    (_photo: PhotoItem, index: number) => {
      setCurrentPhotoIndex(index);
      setViewerOpen(true);
    },
    []
  );

  return (
    <div>
      <div style={{ padding: "28px 24px 16px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "var(--color-stone-800)",
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
          }}
        >
          Favorites
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-stone-400)",
            margin: 0,
            fontWeight: 500,
          }}
        >
          {allPhotos.length} favorited photo
          {allPhotos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "4px",
            padding: "4px 24px",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ aspectRatio: "1", borderRadius: "4px" }}
            />
          ))}
        </div>
      ) : allPhotos.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>💛</div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--color-stone-700)",
              marginBottom: "8px",
            }}
          >
            No favorites yet
          </h3>
          <p style={{ fontSize: "15px", color: "var(--color-stone-400)" }}>
            Click the heart icon on any photo to add it here
          </p>
        </div>
      ) : (
        <PhotoGrid photos={allPhotos} onPhotoClick={handlePhotoClick} />
      )}

      <PhotoViewer
        photos={allPhotos}
        currentIndex={currentPhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onNavigate={setCurrentPhotoIndex}
        onToggleFavorite={(id) => favoriteMutation.mutate(id)}
      />

      <style>{`
        .dark h1 { color: var(--color-stone-100) !important; }
      `}</style>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<div style={{padding: "40px", textAlign: "center"}}>Loading...</div>}>
      <FavoritesContent />
    </Suspense>
  );
}

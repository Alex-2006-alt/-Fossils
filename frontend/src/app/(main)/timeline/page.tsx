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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");

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

  // Extract unique years from photos
  const availableYears = Array.from(
    new Set(
      allPhotos
        .map((p) => new Date(p.takenAt || p.uploadedAt).getFullYear().toString())
        .filter(Boolean)
    )
  ).sort((a, b) => Number(b) - Number(a));

  // Filtered photos based on search and year
  const filteredPhotos = allPhotos.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.filename.toLowerCase().includes(q) ||
      p.uploaderName.toLowerCase().includes(q) ||
      (p.placeName && p.placeName.toLowerCase().includes(q));

    const photoYear = new Date(p.takenAt || p.uploadedAt).getFullYear().toString();
    const matchesYear = selectedYear === "ALL" || photoYear === selectedYear;

    return matchesQuery && matchesYear;
  });

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

      {/* Search & Year Filter Bar */}
      <div
        style={{
          padding: "0 24px 18px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "360px" }}>
          <span
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "14px",
              opacity: 0.5,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search photos, people, places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: "38px",
              paddingRight: searchQuery ? "36px" : "16px",
              paddingTop: "9px",
              paddingBottom: "9px",
              fontSize: "13px",
              borderRadius: "12px",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--color-stone-400)",
                padding: "4px",
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Year Filter Pills */}
        {availableYears.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setSelectedYear("ALL")}
              style={{
                padding: "7px 14px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background:
                  selectedYear === "ALL"
                    ? "var(--color-amber-500)"
                    : "var(--color-surface-elevated)",
                color:
                  selectedYear === "ALL" ? "#ffffff" : "var(--color-stone-600)",
                boxShadow:
                  selectedYear === "ALL" ? "none" : "var(--shadow-xs)",
                transition: "all 0.2s ease",
              }}
            >
              All Years
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background:
                    selectedYear === yr
                      ? "var(--color-amber-500)"
                      : "var(--color-surface-elevated)",
                  color:
                    selectedYear === yr ? "#ffffff" : "var(--color-stone-600)",
                  boxShadow:
                    selectedYear === yr ? "none" : "var(--shadow-xs)",
                  transition: "all 0.2s ease",
                }}
              >
                {yr}
              </button>
            ))}
          </div>
        )}
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
          {allPhotos.length > 0 && filteredPhotos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--color-stone-700)",
                  margin: "0 0 6px",
                }}
              >
                No matching photos
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-stone-400)",
                  margin: "0 0 16px",
                }}
              >
                Try searching for a different keyword or year.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedYear("ALL");
                }}
                className="btn-secondary"
                style={{ fontSize: "13px", padding: "8px 16px" }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <PhotoGrid photos={filteredPhotos} onPhotoClick={handlePhotoClick} />
          )}

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
        photos={filteredPhotos}
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

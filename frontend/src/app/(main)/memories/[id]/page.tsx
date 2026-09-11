"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import type { PhotoItem } from "@/types";

interface MemoryDetail {
  id: string;
  title: string;
  subtitle: string | null;
  story: string | null;
  locationName: string | null;
  dateFrom: string;
  dateTo: string;
  mediaCount: number;
  coverUrl: string | null;
  people: { id: string; name: string; coverUrl: string | null }[];
}

export default function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data, isLoading, error } = useQuery<{
    memory: MemoryDetail;
    photos: PhotoItem[];
  }>({
    queryKey: ["memory", id],
    queryFn: async () => {
      const res = await fetch(`/api/memories/${id}`);
      if (!res.ok) throw new Error("Failed to load memory");
      return res.json();
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory", id] });
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });

  const handlePhotoClick = useCallback((photo: PhotoItem, index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  }, []);

  const handlePlayHighlightReel = () => {
    setCurrentPhotoIndex(0);
    setViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: "32px 28px", maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            height: "360px",
            borderRadius: "28px",
            background: "var(--color-stone-100)",
            animation: "pulse 1.5s ease-in-out infinite",
            marginBottom: "32px",
          }}
        />
      </div>
    );
  }

  if (error || !data?.memory) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <h2>Memory not found</h2>
        <Link href="/memories" style={{ color: "var(--color-primary-600)", fontWeight: 600 }}>
          ← Back to all memories
        </Link>
      </div>
    );
  }

  const { memory, photos } = data;

  return (
    <div style={{ padding: "24px 28px 60px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Back button */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/memories"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--color-stone-500)",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
        >
          <span>←</span>
          <span>Back to Memories</span>
        </Link>
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          minHeight: "360px",
          borderRadius: "32px",
          overflow: "hidden",
          background: "#1c1917",
          boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "40px",
          color: "#fff",
          marginBottom: "40px",
        }}
      >
        {/* Ambient Cover Art */}
        {memory.coverUrl && (
          <img
            src={memory.coverUrl}
            alt={memory.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.6) saturate(1.1)",
            }}
          />
        )}

        {/* Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: "800px" }}>
          {/* Subtitle / Dates / Place */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            {memory.subtitle && (
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "#fbbf24",
                }}
              >
                {memory.subtitle}
              </span>
            )}
            {memory.locationName && (
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  padding: "4px 10px",
                  borderRadius: "12px",
                }}
              >
                📍 {memory.locationName}
              </span>
            )}
            <span
              style={{
                fontSize: "13px",
                background: "rgba(0,0,0,0.4)",
                padding: "4px 10px",
                borderRadius: "12px",
              }}
            >
              📸 {photos.length} photos
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              margin: "0 0 12px",
              lineHeight: 1.15,
            }}
          >
            {memory.title}
          </h1>

          {/* Story */}
          {memory.story && (
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.85)",
                margin: "0 0 24px",
              }}
            >
              {memory.story}
            </p>
          )}

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {photos.length > 0 && (
              <button
                onClick={handlePlayHighlightReel}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  borderRadius: "16px",
                  background: "#fff",
                  color: "#1c1917",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(255,255,255,0.3)",
                  transition: "transform 0.2s",
                }}
              >
                <span>▶</span>
                <span>Play Highlight Reel</span>
              </button>
            )}

            {/* People Pills */}
            {memory.people.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {memory.people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px 6px 8px",
                      borderRadius: "20px",
                      background: "rgba(255,255,255,0.18)",
                      backdropFilter: "blur(12px)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "var(--color-stone-600)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                      }}
                    >
                      {person.coverUrl ? (
                        <img
                          src={person.coverUrl}
                          alt={person.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        "👤"
                      )}
                    </span>
                    <span>{person.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Photo Gallery Grid */}
      <div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-stone-800)",
            margin: "0 0 20px",
          }}
        >
          All Moments in this Story
        </h2>
        <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
      </div>

      {/* PhotoViewer Lightbox Modal */}
      <PhotoViewer
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onNavigate={(newIndex) => setCurrentPhotoIndex(newIndex)}
        onToggleFavorite={(photoId) => favoriteMutation.mutate(photoId)}
      />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { PhotoItem } from "@/types";

interface PhotoGridProps {
  photos: PhotoItem[];
  onPhotoClick: (photo: PhotoItem, index: number) => void;
}

export default function PhotoGrid({ photos, onPhotoClick }: PhotoGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Group photos by date for timeline headers
  const groups = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();
    for (const photo of photos) {
      const date = photo.takenAt || photo.uploadedAt;
      const key = date.split("T")[0]; // YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(photo);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      photos: items,
    }));
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>📷</div>
        <h3
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-stone-700)",
            marginBottom: "8px",
          }}
        >
          No photos yet
        </h3>
        <p style={{ fontSize: "15px", color: "var(--color-stone-400)" }}>
          Upload your first family photos to get started!
        </p>
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div>
      {groups.map((group) => (
        <div key={group.date} style={{ marginBottom: "32px" }}>
          {/* Sticky Date Header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              padding: "12px 24px",
              background: "var(--color-surface-secondary)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--color-stone-100)",
            }}
            className="timeline-header"
          >
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--color-stone-700)",
                margin: 0,
              }}
            >
              {group.label}
            </h3>
            <span
              style={{
                fontSize: "13px",
                color: "var(--color-stone-400)",
                fontWeight: 500,
              }}
            >
              {group.photos.length} photo{group.photos.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Photo Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "4px",
              padding: "4px",
            }}
          >
            {group.photos.map((photo) => {
              const idx = globalIndex++;
              const isLoaded = loadedImages.has(photo.id);

              return (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.5) }}
                  onClick={() => onPhotoClick(photo, idx)}
                  style={{
                    position: "relative",
                    aspectRatio: `${photo.width} / ${photo.height}`,
                    maxHeight: "280px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "var(--color-stone-100)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Skeleton placeholder */}
                  {!isLoaded && (
                    <div
                      className="skeleton"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "4px",
                      }}
                    />
                  )}

                  {/* Actual image or Processing State */}
                  {photo.thumbUrl ? (
                    <img
                      src={photo.thumbUrl}
                      alt={photo.filename}
                      loading="lazy"
                      onLoad={() =>
                        setLoadedImages((prev) => new Set(prev).add(photo.id))
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: isLoaded ? 1 : 0,
                        transition: "opacity 0.3s ease",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--color-stone-200)",
                      color: "var(--color-stone-500)",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}>
                      Processing...
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.4) 100%)",
                      display: "flex",
                      alignItems: "flex-end",
                      padding: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "white",
                        fontWeight: 500,
                      }}
                    >
                      {photo.isFavorite && <span>❤️</span>}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      <style>{`
        .dark .timeline-header {
          background: var(--color-dark-bg) !important;
          border-bottom-color: var(--color-dark-border) !important;
        }
      `}</style>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString("en-US", { weekday: "long" });

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

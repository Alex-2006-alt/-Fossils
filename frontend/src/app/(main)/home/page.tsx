"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import PhotoViewer from "@/components/PhotoViewer";
import type { PhotoItem } from "@/types";

interface AnniversaryMemory {
  year: number;
  yearsAgo: number;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  photos: PhotoItem[];
}

export default function HomePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userName = session?.user?.name?.split(" ")[0] || "there";

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Photo viewer state
  const [viewerPhotos, setViewerPhotos] = useState<PhotoItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Fetch On This Day memories
  const { data: onThisDayData, isLoading: loadingOnThisDay } = useQuery<{
    hasMemories: boolean;
    anniversaries: AnniversaryMemory[];
  }>({
    queryKey: ["on-this-day"],
    queryFn: async () => {
      const res = await fetch("/api/memories/on-this-day");
      if (!res.ok) return { hasMemories: false, anniversaries: [] };
      return res.json();
    },
  });

  // Fetch recently added photos
  const { data: recentPhotosData } = useQuery<{ items: PhotoItem[] }>({
    queryKey: ["photos", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/photos?limit=8");
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const recentPhotos = recentPhotosData?.items || [];
  const anniversaries = onThisDayData?.anniversaries || [];

  const favoriteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["on-this-day"] });
    },
  });

  const openViewerForPhotos = useCallback((photos: PhotoItem[], index: number = 0) => {
    setViewerPhotos(photos);
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  return (
    <div style={{ padding: "32px 28px 60px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Hero Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "36px" }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "var(--color-stone-800)",
            margin: "0 0 6px",
            letterSpacing: "-0.5px",
          }}
        >
          {greeting}, {userName}
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "var(--color-stone-400)",
            margin: 0,
          }}
        >
          &ldquo;Memories worth keeping.&rdquo;
        </p>
      </motion.div>

      {/* On This Day / Today in Your Family */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ marginBottom: "44px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-stone-700)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✨</span> Today in your family
          </h2>
        </div>

        {loadingOnThisDay ? (
          <div
            style={{
              height: "220px",
              borderRadius: "24px",
              background: "var(--color-stone-100)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ) : anniversaries.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {anniversaries.map((anni) => (
              <motion.div
                key={anni.year}
                whileHover={{ y: -4 }}
                onClick={() => openViewerForPhotos(anni.photos, 0)}
                style={{
                  position: "relative",
                  height: "240px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                  background: "#1c1917",
                }}
              >
                {anni.coverUrl && (
                  <img
                    src={anni.coverUrl}
                    alt={anni.title}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "brightness(0.7)",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    background: "rgba(0,0,0,0.4)",
                    backdropFilter: "blur(8px)",
                    color: "#fbbf24",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  On This Day
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "16px",
                    right: "16px",
                    color: "#fff",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                    {anni.subtitle}
                  </div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      margin: "2px 0 6px",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {anni.title}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <span>📸 {anni.photos.length} photos</span>
                    <span style={{ fontWeight: 700, color: "#fbbf24" }}>Relive →</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "var(--color-surface-glass)",
              backdropFilter: "blur(20px) saturate(1.6)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "20px",
              padding: "36px 20px",
              textAlign: "center",
              color: "var(--color-stone-400)",
              fontSize: "15px",
            }}
          >
            <span style={{ fontSize: "36px", display: "block", marginBottom: "10px" }}>
              📸
            </span>
            <div style={{ fontWeight: 600, color: "var(--color-stone-700)", marginBottom: "4px" }}>
              No past memories on this date yet
            </div>
            <span style={{ fontSize: "13px" }}>
              Photos uploaded with past dates will automatically surface here as anniversary moments.
            </span>
          </div>
        )}
      </motion.section>

      {/* Recently Added Photos */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ marginBottom: "44px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-stone-700)",
              margin: 0,
            }}
          >
            Recently Added
          </h2>
          <Link
            href="/timeline"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-primary-600)",
              textDecoration: "none",
            }}
          >
            View all →
          </Link>
        </div>

        {recentPhotos.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "10px",
            }}
          >
            {recentPhotos.map((photo, i) => (
              <motion.div
                key={photo.id}
                whileHover={{ scale: 1.03 }}
                onClick={() => openViewerForPhotos(recentPhotos, i)}
                style={{
                  aspectRatio: "1",
                  borderRadius: "14px",
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--color-stone-100)",
                }}
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.filename}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "24px",
              borderRadius: "16px",
              background: "var(--color-surface-elevated)",
              textAlign: "center",
              color: "var(--color-stone-400)",
              fontSize: "14px",
            }}
          >
            No photos uploaded yet. Upload your first photo to begin!
          </div>
        )}
      </motion.section>

      {/* Memories from the Past (Quick Year Nav) */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{ marginBottom: "44px" }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--color-stone-700)",
            margin: "0 0 16px",
          }}
        >
          Memories by Year
        </h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[2026, 2025, 2024, 2023, 2022, 2021].map((year) => (
            <Link
              key={year}
              href={`/search?year=${year}`}
              style={{
                padding: "10px 20px",
                borderRadius: "14px",
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-stone-200)",
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-stone-700)",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              {year}
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Lightbox PhotoViewer */}
      <PhotoViewer
        photos={viewerPhotos}
        currentIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onNavigate={(newIndex) => setViewerIndex(newIndex)}
        onToggleFavorite={(photoId) => favoriteMutation.mutate(photoId)}
      />
    </div>
  );
}

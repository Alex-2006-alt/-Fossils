"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface MemoryItem {
  id: string;
  title: string;
  subtitle: string | null;
  story: string | null;
  locationName: string | null;
  dateFrom: string;
  dateTo: string;
  mediaCount: number;
  coverUrl: string | null;
  previewThumbs: string[];
  people: { id: string; name: string; coverUrl: string | null }[];
  isAuto: boolean;
}

export default function MemoriesPage() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ items: MemoryItem[] }>({
    queryKey: ["memories"],
    queryFn: async () => {
      const res = await fetch("/api/memories");
      if (!res.ok) throw new Error("Failed to load memories");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setGenerateMessage("Analyzing time, locations, and faces...");
      const res = await fetch("/api/memories/generate", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate memories");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      setIsGenerating(false);
      setGenerateMessage(
        data.createdCount > 0
          ? `✨ Created ${data.createdCount} new memory stories!`
          : "All your photo clusters are already up to date!"
      );
      setTimeout(() => setGenerateMessage(null), 4000);
    },
    onError: (err: any) => {
      setIsGenerating(false);
      setGenerateMessage("Failed to generate memories. Please try again.");
      setTimeout(() => setGenerateMessage(null), 4000);
    },
  });

  const memories = data?.items || [];

  return (
    <div style={{ padding: "32px 28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "var(--color-stone-800)",
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
            }}
          >
            Memories
          </h1>
          <p style={{ fontSize: "15px", color: "var(--color-stone-500)", margin: 0 }}>
            AI-curated event stories, trips, and highlight reels from your family.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
        >
          <button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
              color: "#fff",
              border: "none",
              fontSize: "14px",
              fontWeight: 700,
              cursor: isGenerating ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
              opacity: isGenerating ? 0.8 : 1,
            }}
          >
            <span>{isGenerating ? "⏳" : "✨"}</span>
            <span>{isGenerating ? "Clustering Moments..." : "Auto-Curate Stories"}</span>
          </button>
        </motion.div>
      </div>

      {/* Notification banner */}
      {generateMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            padding: "12px 20px",
            borderRadius: "14px",
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-stone-200)",
            color: "var(--color-stone-700)",
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "28px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          {generateMessage}
        </motion.div>
      )}

      {/* Stories Grid */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "380px",
                borderRadius: "24px",
                background: "var(--color-stone-100)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : memories.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "28px",
          }}
        >
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              whileHover={{ y: -6 }}
            >
              <Link
                href={`/memories/${memory.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  position: "relative",
                  height: "400px",
                  borderRadius: "26px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  background: "#1c1917",
                }}
              >
                {/* Background Image */}
                {memory.coverUrl ? (
                  <img
                    src={memory.coverUrl}
                    alt={memory.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "brightness(0.75)",
                      transition: "transform 0.5s ease",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                    }}
                  />
                )}

                {/* Dark Vignette Gradient */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)",
                  }}
                />

                {/* Top Badges */}
                <div
                  style={{
                    position: "absolute",
                    top: "18px",
                    left: "18px",
                    right: "18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "16px",
                      background: "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(10px)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <span>📸</span>
                    <span>{memory.mediaCount} moments</span>
                  </div>

                  {memory.locationName && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(10px)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      <span>📍</span>
                      <span>{memory.locationName}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Content */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "20px",
                    right: "20px",
                    color: "#fff",
                  }}
                >
                  {memory.subtitle && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.8)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {memory.subtitle}
                    </div>
                  )}

                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#fff",
                      margin: "0 0 12px",
                      letterSpacing: "-0.3px",
                      lineHeight: 1.2,
                    }}
                  >
                    {memory.title}
                  </h3>

                  {/* People avatars + Story action */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* Face Stack */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {memory.people.slice(0, 3).map((person, pIdx) => (
                        <div
                          key={person.id}
                          title={person.name}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            border: "2px solid #fff",
                            overflow: "hidden",
                            marginLeft: pIdx > 0 ? "-8px" : "0",
                            background: "var(--color-stone-600)",
                            position: "relative",
                            zIndex: 3 - pIdx,
                          }}
                        >
                          {person.coverUrl ? (
                            <img
                              src={person.coverUrl}
                              alt={person.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                              }}
                            >
                              👤
                            </div>
                          )}
                        </div>
                      ))}
                      {memory.people.length > 3 && (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            border: "2px solid #fff",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: "-8px",
                            zIndex: 0,
                          }}
                        >
                          +{memory.people.length - 3}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#fbbf24",
                      }}
                    >
                      <span>Relive</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: "var(--color-surface-glass)",
            backdropFilter: "blur(20px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "26px",
            padding: "60px 24px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "40px auto",
          }}
        >
          <span style={{ fontSize: "56px", display: "block", marginBottom: "18px" }}>🎞️</span>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--color-stone-800)",
              margin: "0 0 10px",
            }}
          >
            No memory stories yet
          </h2>
          <p
            style={{
              color: "var(--color-stone-500)",
              fontSize: "15px",
              margin: "0 0 24px",
              lineHeight: 1.5,
            }}
          >
            FamVault automatically gathers photos from your family trips, festivals, and weekends
            into cinematic stories.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating}
            style={{
              padding: "14px 28px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
              color: "#fff",
              border: "none",
              fontSize: "15px",
              fontWeight: 700,
              cursor: isGenerating ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
            }}
          >
            {isGenerating ? "Analyzing Vault Photos..." : "✨ Auto-Curate Stories Now"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

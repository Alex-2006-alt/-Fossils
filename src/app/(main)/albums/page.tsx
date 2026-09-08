"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AlbumItem } from "@/types";

export default function AlbumsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const res = await fetch("/api/albums");
      if (!res.ok) throw new Error("Failed to fetch albums");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDescription }),
      });
      if (!res.ok) throw new Error("Failed to create album");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
    },
  });

  const albums: AlbumItem[] = data?.items || [];

  return (
    <div style={{ padding: "28px 24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
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
            Albums
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-stone-400)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {albums.length} album{albums.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary"
          style={{ fontSize: "14px", padding: "12px 24px" }}
        >
          ✨ New Album
        </button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "20px",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ aspectRatio: "4/3", borderRadius: "20px" }}
            />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>📁</div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--color-stone-700)",
              marginBottom: "8px",
            }}
          >
            No albums yet
          </h3>
          <p style={{ fontSize: "15px", color: "var(--color-stone-400)" }}>
            Create your first album to organize memories
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "20px",
          }}
        >
          {albums.map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ y: -4 }}
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                cursor: "pointer",
                background: "var(--color-surface-elevated)",
                boxShadow: "var(--shadow-md)",
                transition: "box-shadow 0.3s, transform 0.3s",
              }}
            >
              {/* Cover */}
              <div
                style={{
                  aspectRatio: "4/3",
                  background: album.coverUrl
                    ? `url(${album.coverUrl}) center/cover`
                    : "linear-gradient(135deg, var(--color-cream-200), var(--color-cream-300))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!album.coverUrl && (
                  <span style={{ fontSize: "48px", opacity: 0.4 }}>📁</span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "16px 18px" }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--color-stone-800)",
                    margin: "0 0 4px",
                  }}
                >
                  {album.title}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-stone-400)",
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "460px",
                background: "var(--color-surface-elevated)",
                borderRadius: "28px",
                padding: "36px",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  marginBottom: "24px",
                  color: "var(--color-stone-800)",
                }}
              >
                Create Album
              </h2>

              <div style={{ marginBottom: "18px" }}>
                <label
                  htmlFor="album-title"
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-stone-500)",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Album Title
                </label>
                <input
                  id="album-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder='e.g. "Summer Vacation 2025"'
                  className="input-field"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "28px" }}>
                <label
                  htmlFor="album-desc"
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-stone-500)",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Description (optional)
                </label>
                <textarea
                  id="album-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What are these photos about?"
                  className="input-field"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                  style={{ fontSize: "14px", padding: "12px 24px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newTitle.trim() || createMutation.isPending}
                  className="btn-primary"
                  style={{
                    fontSize: "14px",
                    padding: "12px 24px",
                    opacity:
                      !newTitle.trim() || createMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {createMutation.isPending ? "Creating..." : "Create Album"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .dark h1, .dark h3 { color: var(--color-stone-100) !important; }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import type { PhotoItem } from "@/types";

interface SearchResponse {
  photos: PhotoItem[];
  matchedPeople: {
    id: string;
    name: string;
    photoCount: number;
    coverUrl: string | null;
  }[];
  matchedPlaces: string[];
  totalCount: number;
}

interface Person {
  id: string;
  name: string;
  photoCount: number;
  coverUrl: string | null;
}

export default function SearchPage() {
  const queryClient = useQueryClient();

  const [inputQuery, setInputQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Photo Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [inputQuery]);

  // Load known family members for quick filter pills
  const { data: familyPeople } = useQuery<Person[]>({
    queryKey: ["people"],
    queryFn: async () => {
      const res = await fetch("/api/people");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  // Query search API
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (selectedPersonId) params.set("personId", selectedPersonId);
    if (selectedYear) params.set("year", selectedYear);
    if (onlyFavorites) params.set("favorite", "true");
    return params.toString();
  }, [debouncedQuery, selectedPersonId, selectedYear, onlyFavorites]);

  const hasActiveFilters = Boolean(
    debouncedQuery || selectedPersonId || selectedYear || onlyFavorites
  );

  const { data: searchResults, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: ["search", searchParams],
    queryFn: async () => {
      const res = await fetch(`/api/search?${searchParams}`);
      if (!res.ok) throw new Error("Failed to perform search");
      return res.json();
    },
    enabled: hasActiveFilters,
    staleTime: 30000,
  });

  const photos = searchResults?.photos || [];
  const matchedPeople = searchResults?.matchedPeople || [];
  const matchedPlaces = searchResults?.matchedPlaces || [];

  // Favorite toggle mutation
  const favoriteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });

  const handlePhotoClick = useCallback((photo: PhotoItem, index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  }, []);

  const handleClearFilters = () => {
    setInputQuery("");
    setDebouncedQuery("");
    setSelectedPersonId(null);
    setSelectedYear(null);
    setOnlyFavorites(false);
  };

  const sampleSuggestions = [
    "Goa Trip",
    "Birthday celebrations",
    "Sunset at the beach",
    "Family group photos",
    "Diwali",
    "2024",
  ];

  const availableYears = ["2026", "2025", "2024", "2023", "2022"];

  return (
    <div style={{ padding: "32px 28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
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
          Smart Search
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-stone-500)", margin: "0 0 28px" }}>
          Discover memories by family member, natural events, places, or dates.
        </p>
      </motion.div>

      {/* Main Search Input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ marginBottom: "20px" }}
      >
        <div style={{ position: "relative", maxWidth: "720px" }}>
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder='Search keywords, e.g. "Dad in Goa", "Beach sunset 2025"...'
            style={{
              width: "100%",
              padding: "18px 50px 18px 54px",
              fontSize: "16px",
              borderRadius: "18px",
              border: "1.5px solid var(--color-stone-200)",
              background: "var(--color-surface-elevated)",
              color: "var(--color-stone-800)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "20px",
              pointerEvents: "none",
              opacity: 0.7,
            }}
          >
            🔍
          </span>

          {inputQuery && (
            <button
              onClick={() => setInputQuery("")}
              style={{
                position: "absolute",
                right: "18px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "var(--color-stone-100)",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                color: "var(--color-stone-600)",
                cursor: "pointer",
              }}
              title="Clear text"
            >
              ✕
            </button>
          )}

          {isFetching && (
            <div
              style={{
                position: "absolute",
                right: inputQuery ? "54px" : "20px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "13px",
                color: "var(--color-stone-400)",
              }}
            >
              Searching...
            </div>
          )}
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px",
          marginBottom: "32px",
        }}
      >
        {/* Favorites Toggle */}
        <button
          onClick={() => setOnlyFavorites((prev) => !prev)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            border: onlyFavorites
              ? "1.5px solid #ef4444"
              : "1px solid var(--color-stone-200)",
            background: onlyFavorites
              ? "#fef2f2"
              : "var(--color-surface-elevated)",
            color: onlyFavorites ? "#dc2626" : "var(--color-stone-600)",
            transition: "all 0.2s ease",
          }}
        >
          <span>❤️</span>
          <span>Favorites</span>
        </button>

        {/* Year Filter Pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {availableYears.map((year) => {
            const isSelected = selectedYear === year;
            return (
              <button
                key={year}
                onClick={() => setSelectedYear(isSelected ? null : year)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  border: isSelected
                    ? "1.5px solid var(--color-stone-800)"
                    : "1px solid var(--color-stone-200)",
                  background: isSelected
                    ? "var(--color-stone-800)"
                    : "var(--color-surface-elevated)",
                  color: isSelected ? "#fff" : "var(--color-stone-600)",
                  transition: "all 0.2s ease",
                }}
              >
                {year}
              </button>
            );
          })}
        </div>

        {/* People Quick Pills */}
        {familyPeople && familyPeople.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "2px",
            }}
          >
            {familyPeople.slice(0, 5).map((person) => {
              const isSelected = selectedPersonId === person.id;
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPersonId(isSelected ? null : person.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px 6px 8px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    border: isSelected
                      ? "1.5px solid var(--color-stone-800)"
                      : "1px solid var(--color-stone-200)",
                    background: isSelected
                      ? "var(--color-stone-800)"
                      : "var(--color-surface-elevated)",
                    color: isSelected ? "#fff" : "var(--color-stone-700)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "var(--color-stone-200)",
                      overflow: "hidden",
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
                </button>
              );
            })}
          </div>
        )}

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: "8px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: "var(--color-stone-400)",
              textDecoration: "underline",
            }}
          >
            Reset all
          </button>
        )}
      </motion.div>

      {/* Matched People Banner */}
      <AnimatePresence>
        {matchedPeople.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: "28px" }}
          >
            <h3
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--color-stone-500)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                margin: "0 0 12px",
              }}
            >
              Family Members in these photos
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {matchedPeople.map((person) => (
                <Link
                  key={person.id}
                  href={`/people/${person.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 16px 8px 10px",
                    borderRadius: "16px",
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-stone-200)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "var(--color-stone-200)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
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
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-stone-800)" }}>
                      {person.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-stone-400)" }}>
                      {person.photoCount} photos
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matched Places Chips */}
      {matchedPlaces.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
          <span style={{ fontSize: "13px", color: "var(--color-stone-500)", fontWeight: 600 }}>
            📍 Locations:
          </span>
          {matchedPlaces.map((pl) => (
            <button
              key={pl}
              onClick={() => setInputQuery(pl)}
              style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-stone-200)",
                borderRadius: "12px",
                padding: "4px 10px",
                fontSize: "12px",
                color: "var(--color-stone-700)",
                cursor: "pointer",
              }}
            >
              {pl}
            </button>
          ))}
        </div>
      )}

      {/* Search Results / Content */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1/1",
                borderRadius: "14px",
                background: "var(--color-stone-100)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : hasActiveFilters ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "12px",
              borderBottom: "1px solid var(--color-stone-100)",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-stone-700)" }}>
              {photos.length} result{photos.length !== 1 ? "s" : ""} found
            </div>
          </div>

          {photos.length > 0 ? (
            <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "var(--color-surface-elevated)",
                borderRadius: "24px",
                border: "1px solid var(--color-stone-100)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-stone-800)", margin: "0 0 6px" }}>
                No matching photos found
              </h3>
              <p style={{ fontSize: "14px", color: "var(--color-stone-400)", maxWidth: "400px", margin: "0 auto" }}>
                Try searching for family member names, locations, or year.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State: Suggestions */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ marginTop: "12px" }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--color-stone-500)",
              margin: "0 0 16px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Try searching for
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {sampleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputQuery(suggestion)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "14px",
                  border: "1px solid var(--color-stone-200)",
                  background: "var(--color-surface-elevated)",
                  color: "var(--color-stone-700)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* PhotoViewer Lightbox */}
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

"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, EmptyState, QueryError } from "@/components/Design";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import Icon from "@/components/Icon";
import type { PhotoItem } from "@/types";
function SearchContent() {
  const initial = useSearchParams();
  const [input, setInput] = useState(initial.get("q") || "");
  const [query, setQuery] = useState(initial.get("q") || "");
  const [year, setYear] = useState(initial.get("year") || "");
  const [person, setPerson] = useState(initial.get("personId") || "");
  const [favorites, setFavorites] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const client = useQueryClient();
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const people = useQuery<
    {
      id: string;
      name: string;
    }[]
  >({
    queryKey: ["people"],
    queryFn: async () => {
      const res = await fetch("/api/people");
      if (!res.ok) throw Error("Could not load people");
      return res.json();
    },
  });
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (year) params.set("year", year);
  if (person) params.set("personId", person);
  if (favorites) params.set("favorite", "true");
  const active = !!params.size;
  const result = useQuery<{
    photos: PhotoItem[];
    totalCount: number;
  }>({
    queryKey: ["search", params.toString()],
    enabled: active,
    queryFn: async () => {
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw Error("Could not search");
      return res.json();
    },
  });
  const favorite = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/photos/${id}/favorite`, { method: "POST" });
      if (!res.ok) throw Error("Could not update favorite");
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["search"] });
      client.invalidateQueries({ queryKey: ["photos"] });
    },
  });
  const photos = result.data?.photos || [];
  return (
    <div className="page">
      <PageHeader
        eyebrow="SOME THINGS ARE WORTH FINDING AGAIN"
        title="Find that feeling."
        description="Look for a filename, a familiar face, a place, or a year."
      />
      <section className="search-hero">
        <div className="search-field">
          <Icon name="search" size={23} />
          <input
            autoFocus
            aria-label="Search photos"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What would you love to remember?"
          />
          {input && (
            <button
              className="icon-button"
              onClick={() => setInput("")}
              aria-label="Clear search"
            >
              <Icon name="close" size={17} />
            </button>
          )}
        </div>
        <div className="filter-chips">
          <select
            className="chip"
            aria-label="Search by year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Any year</option>
            {Array.from(
              { length: 100 },
              (_, i) => new Date().getFullYear() - i,
            ).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <select
            className="chip"
            aria-label="Search by person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">Everyone</option>
            {people.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className="chip"
            aria-pressed={favorites}
            onClick={() => setFavorites(!favorites)}
          >
            Favorites only
          </button>
          {active && (
            <button
              className="chip"
              onClick={() => {
                setInput("");
                setQuery("");
                setYear("");
                setPerson("");
                setFavorites(false);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="search-hints">
          <span>Try a little inspiration</span>
          {["birthday", "summer", "beach"].map((word) => (
            <button
              key={word}
              className="text-link"
              onClick={() => setInput(word)}
            >
              {word}
              <Icon name="arrow" size={12} />
            </button>
          ))}
        </div>
      </section>
      {!active ? (
        <EmptyState
          icon="search"
          title="A thousand moments. One little search."
          description="Start with something you remember. A place, a name, or the year it all happened."
        />
      ) : result.isError ? (
        <QueryError retry={() => result.refetch()} />
      ) : result.isLoading ? (
        <div className="gallery-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "1" }} />
          ))}
        </div>
      ) : photos.length ? (
        <>
          <div className="section-heading">
            <h2>
              {photos.length === 80
                ? "80 matching moments"
                : `${photos.length} moments found`}
            </h2>
            {photos.length === 80 && (
              <span className="text-link">Refine your search to see more.</span>
            )}
          </div>
          <PhotoGrid photos={photos} onPhotoClick={(_, i) => setIndex(i)} />
        </>
      ) : (
        <EmptyState
          icon="search"
          title="Not quite the moment?"
          description="Try a simpler keyword or remove a filter to widen your search."
        />
      )}
      {favorite.isError && (
        <p className="form-alert" role="alert">
          Couldn’t save your favorite. Please try again.
        </p>
      )}
      <PhotoViewer
        photos={photos}
        currentIndex={index || 0}
        isOpen={index !== null}
        onClose={() => setIndex(null)}
        onNavigate={setIndex}
        onToggleFavorite={(id) => favorite.mutate(id)}
      />
    </div>
  );
}
export default function SearchPage() {
  return (
    <Suspense
      fallback={<div className="page skeleton" style={{ height: 300 }} />}
    >
      <SearchContent />
    </Suspense>
  );
}

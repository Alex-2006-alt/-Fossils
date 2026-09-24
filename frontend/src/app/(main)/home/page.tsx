"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import ArchiveArt from "@/components/ArchiveArt";
import { PageHeader, EmptyState, QueryError } from "@/components/Design";
import { PhotoTile } from "@/components/PhotoGrid";
import PhotoViewer from "@/components/PhotoViewer";
import type { PhotoItem } from "@/types";
interface Anniversary {
  year: number;
  title: string;
  subtitle: string;
  photos: PhotoItem[];
}
export default function HomePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [viewer, setViewer] = useState<{
    photos: PhotoItem[];
    index: number;
  } | null>(null);
  const photosQuery = useQuery<{
    items: PhotoItem[];
  }>({
    queryKey: ["photos", "home"],
    queryFn: async () => {
      const res = await fetch("/api/photos?limit=8");
      if (!res.ok) throw Error("Could not load photos");
      return res.json();
    },
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (p) =>
          p.processingStatus !== "READY" && p.processingStatus !== "FAILED",
      )
        ? 4000
        : false,
  });
  const memoriesQuery = useQuery<{
    anniversaries: Anniversary[];
  }>({
    queryKey: ["on-this-day"],
    queryFn: async () => {
      const res = await fetch(
        "/api/memories/on-this-day?timeZone=" +
          encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone),
      );
      if (!res.ok) throw Error("Could not load memories");
      return res.json();
    },
  });
  const favorite = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/photos/${id}/favorite`, { method: "POST" });
      if (!res.ok) throw Error("Could not update favorite");
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["on-this-day"] });
      setViewer((current) =>
        current
          ? {
              ...current,
              photos: current.photos.map((p) =>
                p.id === id ? { ...p, isFavorite: !p.isFavorite } : p,
              ),
            }
          : null,
      );
    },
  });
  const photos = photosQuery.data?.items || [];
  const anniversary = memoriesQuery.data?.anniversaries?.[0];
  const today = new Date();
  return (
    <div className="page">
      <PageHeader
        eyebrow="A LITTLE CLOSER, EVERY DAY"
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] || "friend"}.`}
        description="Your people. Your stories. All in one beautiful place."
        action={
          <Link href="/timeline?upload=true" className="btn-secondary">
            <Icon name="plus" size={16} />
            Add a moment
          </Link>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">THE GOOD OLD DAYS ARE HAPPENING NOW</span>
          <h2>
            A home for
            <br />
            your <em>forever moments.</em>
          </h2>
          <p>
            Big adventures. Ordinary afternoons. Keep the pieces of your life
            that make it yours.
          </p>
          <div className="hero-actions">
            <Link href="/timeline?upload=true" className="btn-primary">
              <Icon name="plus" size={16} />
              Add your photos
            </Link>
            <Link href="/timeline" className="text-link">
              Explore your archive
              <Icon name="arrow" size={15} />
            </Link>
          </div>
          <span className="hero-footnote">
            <Icon name="people" size={13} />A shared collection for your family.
          </span>
        </div>
        <ArchiveArt photos={photos} />
      </section>
      <div className="quick-grid">
        {(
          [
            {
              href: "/albums",
              icon: "album",
              title: "Beautifully collected",
              copy: "Make room for every chapter.",
            },
            {
              href: "/people",
              icon: "people",
              title: "Your favorite people",
              copy: "The faces behind your stories.",
            },
            {
              href: "/memories",
              icon: "sparkle",
              title: "A little time travel",
              copy: "Rediscover a forgotten moment.",
            },
          ] as const
        ).map((item) => (
          <Link href={item.href} className="quick-card" key={item.href}>
            <span className="quick-icon">
              <Icon name={item.icon} size={21} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.copy}</small>
            </div>
            <Icon name="arrow" size={15} />
          </Link>
        ))}
      </div>
      <section>
        <div className="section-heading">
          <div>
            <h2>
              From your collection<span className="section-count">PHOTOS</span>
            </h2>
            <p>Little windows into a life well lived.</p>
          </div>
          <Link href="/timeline" className="text-link">
            View all photos
            <Icon name="arrow" size={15} />
          </Link>
        </div>
        {photosQuery.isError ? (
          <QueryError retry={() => photosQuery.refetch()} />
        ) : photosQuery.isLoading ? (
          <div className="recent-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: "1" }} />
            ))}
          </div>
        ) : photos.length ? (
          <div className="recent-grid">
            {photos.slice(0, 4).map((photo, index) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                onClick={() => setViewer({ photos, index })}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Every archive starts with a moment."
            description="Bring a few favorite photos. We’ll give them a lovely place to live."
            href="/timeline?upload=true"
            label="Upload your first photos"
          />
        )}
      </section>
      <section className="memory-banner">
        <div className="date-stamp">
          <span>
            {today.toLocaleDateString("en", { month: "short" }).toUpperCase()}
          </span>
          <strong>{today.getDate()}</strong>
        </div>
        <div>
          <span className="eyebrow">ON THIS DAY</span>
          <h2>
            {anniversary
              ? anniversary.title
              : "Some days deserve a second look."}
          </h2>
          <p>
            {anniversary
              ? anniversary.subtitle
              : memoriesQuery.isError
                ? "Your memories couldn’t load right now."
                : "Photos from this date in past years will find their way back to you."}
          </p>
        </div>
        {anniversary ? (
          <button
            className="btn-secondary"
            onClick={() => setViewer({ photos: anniversary.photos, index: 0 })}
          >
            Relive this day
            <Icon name="arrow" size={15} />
          </button>
        ) : (
          <Link href="/memories" className="text-link">
            Explore memories
            <Icon name="arrow" size={15} />
          </Link>
        )}
      </section>
      {favorite.isError && (
        <div className="form-alert" role="alert">
          Couldn’t save your favorite. Please try again.
        </div>
      )}
      <PhotoViewer
        photos={viewer?.photos || []}
        currentIndex={viewer?.index || 0}
        isOpen={!!viewer}
        onClose={() => setViewer(null)}
        onNavigate={(index) =>
          setViewer((current) => (current ? { ...current, index } : null))
        }
        onToggleFavorite={(id) => favorite.mutate(id)}
      />
    </div>
  );
}

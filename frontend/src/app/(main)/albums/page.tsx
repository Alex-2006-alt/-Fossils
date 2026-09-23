"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader, EmptyState, QueryError } from "@/components/Design";
import Icon from "@/components/Icon";
import Dialog from "@/components/Dialog";
import type { AlbumItem, PhotoItem } from "@/types";
export default function AlbumsPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const albums = useQuery<{
    items: AlbumItem[];
  }>({
    queryKey: ["albums"],
    queryFn: async () => {
      const res = await fetch("/api/albums");
      if (!res.ok) throw Error("Could not load albums");
      return res.json();
    },
  });
  const photos = useQuery<{
    items: PhotoItem[];
  }>({
    queryKey: ["photos", "album-picker"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/photos?limit=100");
      if (!res.ok) throw Error("Could not load photos");
      return res.json();
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, photoIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Could not create album");
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["albums"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setSelected([]);
    },
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow="EVERY CHAPTER DESERVES A COVER"
        title="Beautifully collected."
        description="A weekend away. A birthday at home. An album for every story."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} />
            New album
          </button>
        }
      />
      {albums.isError ? (
        <QueryError retry={() => albums.refetch()} />
      ) : albums.isLoading ? (
        <div className="collection-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 280 }} />
          ))}
        </div>
      ) : albums.data?.items.length ? (
        <div className="collection-grid">
          {albums.data.items.map((album) => (
            <Link
              href={`/albums/${album.id}`}
              className="album-card"
              key={album.id}
            >
              <div className="album-cover">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} loading="lazy" />
                ) : (
                  <Icon name="album" size={42} />
                )}
              </div>
              <h2>{album.title}</h2>
              <p>
                {album.photoCount} photos ·{" "}
                {album.description || "A story of your own"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="album"
          title="What will your first chapter be?"
          description="Choose New album to gather your favorite moments into a collection."
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create an album"
      >
        <span className="eyebrow">A NEW CHAPTER</span>
        <h2>Give your moments a home.</h2>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="field-group">
            <label htmlFor="album-title">Album name</label>
            <input
              id="album-title"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="That summer by the sea"
              required
              maxLength={150}
            />
          </div>
          <div className="field-group">
            <label htmlFor="album-description">A few words (optional)</label>
            <textarea
              id="album-description"
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What made it special?"
              rows={2}
            />
          </div>
          <label>Choose photos · {selected.length} selected</label>
          <p className="picker-note">
            Showing up to 100 photos from your collection.
          </p>
          {photos.isError ? (
            <QueryError retry={() => photos.refetch()} />
          ) : (
            <div className="photo-picker">
              {photos.data?.items
                .filter((p) => p.processingStatus === "READY")
                .map((photo) => (
                  <button
                    type="button"
                    key={photo.id}
                    aria-label={`Select ${photo.filename}`}
                    aria-pressed={selected.includes(photo.id)}
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(photo.id)
                          ? current.filter((id) => id !== photo.id)
                          : [...current, photo.id],
                      )
                    }
                  >
                    <img src={photo.thumbUrl} alt={photo.filename} />
                    {selected.includes(photo.id) && (
                      <span>
                        <Icon name="check" size={16} />
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
          {create.isError && (
            <p className="form-alert" role="alert">
              {create.error.message}
            </p>
          )}
          <div className="upload-footer">
            <button
              className="btn-primary"
              disabled={create.isPending || !title.trim()}
            >
              {create.isPending ? "Creating your chapter…" : "Create album"}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

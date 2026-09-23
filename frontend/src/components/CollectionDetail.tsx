"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PhotoGrid from "./PhotoGrid";
import PhotoViewer from "./PhotoViewer";
import { EmptyState } from "./Design";
import type { PhotoItem } from "@/types";
export default function CollectionDetail({
  photos: initialPhotos,
}: {
  photos: PhotoItem[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [index, setIndex] = useState<number | null>(null);
  const client = useQueryClient();
  const favorite = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/photos/${id}/favorite`, { method: "POST" });
      if (!res.ok) throw Error("Could not save favorite");
    },
    onSuccess: (_, id) => {
      setPhotos((current) =>
        current.map((p) =>
          p.id === id ? { ...p, isFavorite: !p.isFavorite } : p,
        ),
      );
      client.invalidateQueries({ queryKey: ["photos"] });
    },
  });
  return (
    <>
      {photos.length ? (
        <PhotoGrid photos={photos} onPhotoClick={(_, i) => setIndex(i)} />
      ) : (
        <EmptyState
          title="A chapter waiting to be filled."
          description="There are no photos in this collection yet."
          href="/albums"
          label="Back to albums"
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
    </>
  );
}

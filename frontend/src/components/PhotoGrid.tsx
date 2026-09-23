"use client";
import { useMemo, useState } from "react";
import type { PhotoItem } from "@/types";
import Icon from "./Icon";
export function PhotoTile({
  photo,
  onClick,
}: {
  photo: PhotoItem;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const ready = photo.processingStatus === "READY";
  const date = new Date(photo.takenAt || photo.uploadedAt).toLocaleDateString(
    "en",
    { month: "short", day: "numeric" },
  );
  return (
    <button
      className="photo-tile"
      onClick={onClick}
      aria-label={`Open ${photo.filename}`}
    >
      <div className="photo-frame">
        {ready && !failed ? (
          <img
            src={photo.thumbUrl}
            alt={photo.filename}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="photo-status">
            <Icon
              name={
                photo.processingStatus === "FAILED"
                  ? "info"
                  : ready
                    ? "photos"
                    : "clock"
              }
              size={26}
            />
            <span>
              {photo.processingStatus === "FAILED"
                ? "Processing failed"
                : ready
                  ? "Preview unavailable"
                  : "Developing your photo…"}
            </span>
          </div>
        )}
        {photo.isFavorite && (
          <span className="favorite-marker">
            <Icon name="heart" size={13} />
          </span>
        )}
      </div>
      <div className="photo-caption">
        <span>{photo.placeName || photo.filename}</span>
        <time>{date}</time>
      </div>
    </button>
  );
}
export default function PhotoGrid({
  photos,
  onPhotoClick,
}: {
  photos: PhotoItem[];
  onPhotoClick: (photo: PhotoItem, index: number) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        photo: PhotoItem;
        index: number;
      }[]
    >();
    photos.forEach((photo, index) => {
      const date = new Date(
        photo.takenAt || photo.uploadedAt,
      ).toLocaleDateString("en", { month: "long", year: "numeric" });
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push({ photo, index });
    });
    return Array.from(map);
  }, [photos]);
  return (
    <div>
      {groups.map(([date, items]) => (
        <section key={date} className="gallery-group">
          <div className="gallery-group-heading">
            <h2>{date}</h2>
            <span>
              {items.length} moment{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="gallery-grid">
            {items.map(({ photo, index }) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                onClick={() => onPhotoClick(photo, index)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

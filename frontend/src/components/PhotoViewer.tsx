"use client";
import { useEffect, useState, useCallback } from "react";
import PhotoActions from "./PhotoActions";
import Dialog from "./Dialog";
import Icon from "./Icon";
import type { PhotoItem } from "@/types";
interface Props {
  photos: PhotoItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite?: (id: string) => void;
}
export default function PhotoViewer({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onToggleFavorite,
}: Props) {
  const [info, setInfo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const photo = photos[currentIndex];
  const navigate = useCallback(
    (direction: number) =>
      onNavigate((currentIndex + direction + photos.length) % photos.length),
    [currentIndex, photos.length, onNavigate],
  );
  useEffect(() => {
    if (!isOpen || !playing || photos.length < 2) return;
    const timer = setInterval(() => navigate(1), 4000);
    return () => clearInterval(timer);
  }, [isOpen, playing, photos.length, navigate]);
  useEffect(() => {
    if (!isOpen) return;
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input,textarea")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [isOpen, navigate]);
  if (!photo) return null;
  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setPlaying(false);
        onClose();
      }}
      title={photo.filename}
      className="viewer-dialog"
    >
      <header className="viewer-header">
        <div>
          <span className="eyebrow">A MOMENT IN YOUR STORY</span>
          <span>
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
        <div className="viewer-actions">
          <button
            className="icon-button"
            disabled={!onToggleFavorite}
            onClick={() => onToggleFavorite?.(photo.id)}
            aria-label={
              photo.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={photo.isFavorite}
          >
            <Icon name="heart" />
          </button>
          <button
            className="icon-button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            aria-pressed={playing}
          >
            <Icon name={playing ? "close" : "play"} />
          </button>
          <button
            className="icon-button"
            onClick={() => setInfo(!info)}
            aria-label="Photo details"
            aria-pressed={info}
          >
            <Icon name="info" />
          </button>
          <a
            className="icon-button"
            href={photo.originalUrl}
            download={photo.filename}
            aria-label="Download original photo"
          >
            <Icon name="download" />
          </a>
        </div>
      </header>
      <div className="viewer-stage">
        {photos.length > 1 && (
          <button
            className="viewer-prev icon-button"
            onClick={() => navigate(-1)}
            aria-label="Previous photo"
          >
            <Icon name="arrow" style={{ transform: "rotate(180deg)" }} />
          </button>
        )}
        <img
          key={photo.id}
          src={photo.mediumUrl || photo.originalUrl}
          alt={photo.filename}
          className="viewer-image"
        />
        {photos.length > 1 && (
          <button
            className="viewer-next icon-button"
            onClick={() => navigate(1)}
            aria-label="Next photo"
          >
            <Icon name="arrow" />
          </button>
        )}
      </div>
      <footer className="viewer-caption">
        <h2>{photo.placeName || photo.filename}</h2>
        <p>
          {new Date(photo.takenAt || photo.uploadedAt).toLocaleDateString(
            "en",
            { month: "long", day: "numeric", year: "numeric" },
          )}
          {photo.uploaderName ? ` · Added by ${photo.uploaderName}` : ""}
        </p>
      </footer>
      {info && (
        <PhotoActions key={photo.id} photo={photo} onDeleted={onClose} />
      )}
      {info && (
        <dl className="viewer-info">
          <div>
            <dt>Filename</dt>
            <dd>{photo.filename}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {photo.width} × {photo.height}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{photo.processingStatus.toLowerCase()}</dd>
          </div>
          <div>
            <dt>Added</dt>
            <dd>{new Date(photo.uploadedAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      )}
    </Dialog>
  );
}

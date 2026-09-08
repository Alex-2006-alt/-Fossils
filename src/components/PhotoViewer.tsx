"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PhotoItem } from "@/types";

interface PhotoViewerProps {
  photos: PhotoItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite: (photoId: string) => void;
}

export default function PhotoViewer({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onToggleFavorite,
}: PhotoViewerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [direction, setDirection] = useState(0);

  const photo = photos[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setDirection(1);
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "Escape":
          onClose();
          break;
        case "i":
          setShowInfo((prev) => !prev);
          break;
        case "f":
          if (photo) onToggleFavorite(photo.id);
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, goNext, goPrev, onClose, photo, onToggleFavorite]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!photo) return null;

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.92)",
            backdropFilter: "blur(20px)",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
              color: "white",
              zIndex: 10,
            }}
          >
            <span
              style={{ fontSize: "13px", opacity: 0.6, fontWeight: 500 }}
            >
              {currentIndex + 1} / {photos.length}
            </span>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => onToggleFavorite(photo.id)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: "18px",
                  transition: "background 0.2s",
                }}
                title="Toggle favorite (F)"
              >
                {photo.isFavorite ? "❤️" : "🤍"}
              </button>
              <button
                onClick={() => setShowInfo((prev) => !prev)}
                style={{
                  background: showInfo
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: "18px",
                  transition: "background 0.2s",
                }}
                title="Photo info (I)"
              >
                ℹ️
              </button>
              <a
                href={photo.originalUrl}
                download={photo.filename}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: "18px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Download"
              >
                ⬇️
              </a>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: "18px",
                  transition: "background 0.2s",
                }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </motion.div>

          {/* Main Image Area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Prev Button */}
            {currentIndex > 0 && (
              <button
                onClick={goPrev}
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  cursor: "pointer",
                  fontSize: "22px",
                  color: "white",
                  zIndex: 10,
                  transition: "background 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ‹
              </button>
            )}

            {/* Image */}
            <AnimatePresence custom={direction} mode="wait">
              <motion.img
                key={photo.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                src={photo.mediumUrl}
                alt={photo.filename}
                style={{
                  maxWidth: showInfo ? "calc(100% - 360px)" : "90%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: "4px",
                  transition: "max-width 0.4s cubic-bezier(0.16,1,0.3,1)",
                  userSelect: "none",
                }}
                draggable={false}
              />
            </AnimatePresence>

            {/* Next Button */}
            {currentIndex < photos.length - 1 && (
              <button
                onClick={goNext}
                style={{
                  position: "absolute",
                  right: showInfo ? "380px" : "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  cursor: "pointer",
                  fontSize: "22px",
                  color: "white",
                  zIndex: 10,
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ›
              </button>
            )}

            {/* Info Panel */}
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ x: 340, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 340, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "340px",
                    background: "rgba(20, 18, 16, 0.95)",
                    backdropFilter: "blur(20px)",
                    padding: "28px 24px",
                    overflowY: "auto",
                    borderLeft: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h3
                    style={{
                      color: "white",
                      fontSize: "16px",
                      fontWeight: 700,
                      marginBottom: "24px",
                    }}
                  >
                    Photo Details
                  </h3>

                  <InfoRow
                    label="Filename"
                    value={photo.filename}
                  />
                  <InfoRow
                    label="Date Taken"
                    value={new Date(
                      photo.takenAt || photo.uploadedAt
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  />
                  <InfoRow
                    label="Dimensions"
                    value={`${photo.width} × ${photo.height}`}
                  />
                  <InfoRow
                    label="Uploaded by"
                    value={photo.uploaderName}
                  />
                  {photo.placeName && (
                    <InfoRow label="Location" value={photo.placeName} />
                  )}

                  {photo.exifData && (
                    <>
                      <div
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                          margin: "20px 0",
                        }}
                      />
                      <h4
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "12px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          marginBottom: "16px",
                        }}
                      >
                        Camera Info
                      </h4>
                      {photo.exifData.camera && (
                        <InfoRow label="Camera" value={photo.exifData.camera} />
                      )}
                      {photo.exifData.aperture && (
                        <InfoRow
                          label="Aperture"
                          value={`f/${photo.exifData.aperture}`}
                        />
                      )}
                      {photo.exifData.iso && (
                        <InfoRow
                          label="ISO"
                          value={String(photo.exifData.iso)}
                        />
                      )}
                      {photo.exifData.focalLength && (
                        <InfoRow
                          label="Focal Length"
                          value={`${photo.exifData.focalLength}mm`}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <dt
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "4px",
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.85)",
          margin: 0,
          wordBreak: "break-word",
        }}
      >
        {value}
      </dd>
    </div>
  );
}

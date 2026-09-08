"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

interface UploadProgress {
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
}

interface UploadZoneProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadZone({ isOpen, onClose }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (imageFiles.length === 0) return;

      // Set initial upload state
      const newUploads: UploadProgress[] = imageFiles.map((f) => ({
        filename: f.name,
        progress: 0,
        status: "uploading" as const,
      }));
      setUploads((prev) => [...prev, ...newUploads]);

      // Upload in batches of 3
      const batchSize = 3;
      for (let i = 0; i < imageFiles.length; i += batchSize) {
        const batch = imageFiles.slice(i, i + batchSize);
        const formData = new FormData();
        batch.forEach((file) => formData.append("files", file));

        try {
          // Update status to "uploading"
          setUploads((prev) =>
            prev.map((u) =>
              batch.some((b) => b.name === u.filename)
                ? { ...u, progress: 50, status: "uploading" }
                : u
            )
          );

          const res = await fetch("/api/photos", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            setUploads((prev) =>
              prev.map((u) =>
                batch.some((b) => b.name === u.filename)
                  ? { ...u, progress: 100, status: "done" }
                  : u
              )
            );
          } else {
            setUploads((prev) =>
              prev.map((u) =>
                batch.some((b) => b.name === u.filename)
                  ? { ...u, status: "error" }
                  : u
              )
            );
          }
        } catch {
          setUploads((prev) =>
            prev.map((u) =>
              batch.some((b) => b.name === u.filename)
                ? { ...u, status: "error" }
                : u
            )
          );
        }
      }

      // Refetch photos
      queryClient.invalidateQueries({ queryKey: ["photos"] });

      // Auto-close after 2 seconds if all done
      setTimeout(() => {
        setUploads([]);
        onClose();
      }, 2000);
    },
    [queryClient, onClose]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              maxWidth: "560px",
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
                marginBottom: "8px",
                color: "var(--color-stone-800)",
              }}
            >
              Upload Photos
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-stone-500)",
                marginBottom: "24px",
              }}
            >
              Drag and drop your photos or click to browse
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${
                  isDragging ? "var(--color-amber-400)" : "var(--color-stone-200)"
                }`,
                borderRadius: "20px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all var(--duration-normal) var(--ease-out-expo)",
                background: isDragging
                  ? "rgba(245,166,35,0.06)"
                  : "var(--color-surface-secondary)",
                transform: isDragging ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "16px",
                  transition: "transform var(--duration-normal)",
                  transform: isDragging ? "scale(1.2)" : "scale(1)",
                }}
              >
                {isDragging ? "📥" : "🖼️"}
              </div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--color-stone-700)",
                  marginBottom: "6px",
                }}
              >
                {isDragging
                  ? "Drop photos here!"
                  : "Click or drag photos here"}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-stone-400)",
                }}
              >
                JPG, PNG, HEIC — up to 50MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  e.target.files && handleFiles(e.target.files)
                }
                style={{ display: "none" }}
              />
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
              {uploads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: "20px", overflow: "hidden" }}
                >
                  {uploads.map((upload, i) => (
                    <motion.div
                      key={upload.filename + i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--color-stone-100)",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>
                        {upload.status === "done"
                          ? "✅"
                          : upload.status === "error"
                          ? "❌"
                          : "⏳"}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: "13px",
                          color: "var(--color-stone-600)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {upload.filename}
                      </span>
                      {upload.status === "uploading" && (
                        <div
                          style={{
                            width: "60px",
                            height: "4px",
                            borderRadius: "2px",
                            background: "var(--color-stone-100)",
                            overflow: "hidden",
                          }}
                        >
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${upload.progress}%` }}
                            style={{
                              height: "100%",
                              background:
                                "linear-gradient(90deg, var(--color-amber-400), var(--color-amber-500))",
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

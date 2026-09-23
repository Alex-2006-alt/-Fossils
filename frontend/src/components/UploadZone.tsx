"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Dialog from "./Dialog";
import Icon from "./Icon";
type Upload = {
  id: string;
  file: File;
  status: "uploading" | "queued" | "error";
  message?: string;
};
export default function UploadZone({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  const queryClient = useQueryClient();
  async function send(item: Upload) {
    setUploads((items) =>
      items.map((i) =>
        i.id === item.id
          ? { ...i, status: "uploading", message: undefined }
          : i,
      ),
    );
    try {
      const form = new FormData();
      form.append("files", item.file);
      const res = await fetch("/api/photos", { method: "POST", body: form });
      const result = await res.json();
      if (!res.ok || !result.uploaded?.length)
        throw Error(result.error || "Upload failed. Please try again.");
      setUploads((items) =>
        items.map((i) => (i.id === item.id ? { ...i, status: "queued" } : i)),
      );
      await queryClient.invalidateQueries({ queryKey: ["photos"] });
    } catch (error) {
      setUploads((items) =>
        items.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "error",
                message:
                  error instanceof Error ? error.message : "Upload failed",
              }
            : i,
        ),
      );
    }
  }
  async function addFiles(files: File[]) {
    if (active.current) return;
    const additions: Upload[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status:
        !file.type.startsWith("image/") || file.size > 50 * 1024 * 1024
          ? "error"
          : "uploading",
      message: !file.type.startsWith("image/")
        ? "Choose an image file."
        : file.size > 50 * 1024 * 1024
          ? "This photo exceeds 50 MB."
          : undefined,
    }));
    setUploads((items) => [...items, ...additions]);
    active.current = true;
    try {
      for (const item of additions) {
        if (item.status !== "error") await send(item);
      }
    } finally {
      active.current = false;
    }
  }
  const busy = uploads.some((item) => item.status === "uploading");
  return (
    <Dialog open={isOpen} onClose={onClose} title="Add your photos">
      <span className="eyebrow">MAKE ROOM FOR A NEW MEMORY</span>
      <h2>A moment worth keeping.</h2>
      <p>
        Add photos to your family’s collection. We’ll prepare the previews in
        the background.
      </p>
      <button
        type="button"
        className={`drop-zone ${drag ? "dragging" : ""}`}
        disabled={busy}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          void addFiles(Array.from(event.dataTransfer.files));
        }}
        onClick={() => input.current?.click()}
      >
        <Icon name="upload" size={35} />
        <strong>
          {busy ? "Adding your moments…" : "Drop a little happiness here."}
        </strong>
        <small>Or click to choose photos · up to 50 MB each</small>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void addFiles(Array.from(event.target.files));
          event.target.value = "";
        }}
      />
      <div aria-live="polite">
        {uploads.map((item) => (
          <div className="upload-item" key={item.id}>
            <Icon
              name={
                item.status === "queued"
                  ? "check"
                  : item.status === "error"
                    ? "info"
                    : "clock"
              }
              size={18}
            />
            <div>
              <strong>{item.file.name}</strong>
              <span>
                {item.status === "queued"
                  ? "Uploaded · preparing your preview"
                  : item.status === "error"
                    ? item.message
                    : "Uploading…"}
              </span>
            </div>
            {item.status === "error" &&
              !item.message?.includes("50 MB") &&
              item.file.type.startsWith("image/") && (
                <button disabled={busy} onClick={() => send(item)}>
                  Retry
                </button>
              )}
          </div>
        ))}
      </div>
      <div className="upload-footer">
        <button className="btn-secondary" onClick={onClose}>
          {busy ? "Continue in background" : "Back to your collection"}
          <Icon name="arrow" size={15} />
        </button>
      </div>
    </Dialog>
  );
}

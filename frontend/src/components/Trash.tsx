"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { request } from "@/lib/request";
export default function Trash() {
  const { data: session } = useSession();
  const enabled = ["OWNER", "ADMIN", "MEMBER"].includes(
    session?.user?.role || "",
  );
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["trash"],
    enabled,
    queryFn: () =>
      request<{ items: { id: string; filename: string; deletedAt: string }[] }>(
        "/api/trash",
      ),
  });
  const restore = useMutation({
    mutationFn: (id: string) =>
      request("/api/photos/" + id, { restore: true }, "PATCH"),
    onSuccess: () => client.invalidateQueries(),
  });
  if (!enabled) return null;
  return (
    <section className="settings-panel">
      <h2>Recently deleted</h2>
      <p>
        Photos stay here for 7 days before the worker permanently removes them.
      </p>
      {query.data?.items.map((p) => (
        <div className="member-row" key={p.id}>
          <strong>{p.filename}</strong>
          <span>{new Date(p.deletedAt).toLocaleDateString()}</span>
          <button
            className="btn-secondary"
            disabled={restore.isPending}
            onClick={() => restore.mutate(p.id)}
          >
            Restore
          </button>
        </div>
      ))}
      {query.data?.items.length === 0 && <p>Your trash is empty.</p>}
      {(query.isError || restore.isError) && (
        <p role="alert">
          {restore.error?.message || "Could not load deleted photos."}
        </p>
      )}
    </section>
  );
}

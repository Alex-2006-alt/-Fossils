"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHeader, EmptyState, QueryError } from "@/components/Design";
interface Memory {
  id: string;
  title: string;
  subtitle: string | null;
  story: string | null;
  locationName: string | null;
  dateFrom: string;
  mediaCount: number;
  coverUrl: string | null;
}
export default function MemoriesPage() {
  const client = useQueryClient();
  const { data: session } = useSession();
  const canWrite = ["OWNER", "ADMIN", "MEMBER"].includes(
    session?.user?.role || "",
  );
  const job = useQuery<{ status: string }>({
    queryKey: ["memory-job"],
    queryFn: async () => {
      const res = await fetch("/api/memories/generate");
      if (!res.ok) throw Error("Could not load processing status");
      return res.json();
    },
    refetchInterval: (q) =>
      ["PENDING", "PROCESSING"].includes(q.state.data?.status || "")
        ? 3000
        : false,
  });
  useEffect(() => {
    if (job.data?.status === "COMPLETED")
      void client.invalidateQueries({ queryKey: ["memories"] });
  }, [job.data?.status, client]);
  const [message, setMessage] = useState("");
  const query = useQuery<{
    items: Memory[];
  }>({
    queryKey: ["memories"],
    queryFn: async () => {
      const res = await fetch("/api/memories");
      if (!res.ok) throw Error("Could not load memories");
      return res.json();
    },
  });
  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/memories/generate", { method: "POST" });
      if (!res.ok)
        throw Error("We couldn’t make your memories. Please try again.");
      return res.json();
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ["memories"] });
      client.invalidateQueries({ queryKey: ["memory-job"] });
      setMessage(
        data.message ||
          (data.createdCount
            ? `${data.createdCount} new chapters, ready to relive.`
            : "Your collection is up to date. Add more photos to discover new chapters."),
      );
    },
    onError: (error) => setMessage(error.message),
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow="A LITTLE TIME TRAVEL"
        title="Some moments stay with you."
        description="Trips, celebrations, and ordinary days, gathered into stories."
        action={
          <button
            className="btn-primary"
            onClick={() => generate.mutate()}
            disabled={
              !canWrite ||
              generate.isPending ||
              ["PENDING", "PROCESSING"].includes(job.data?.status || "")
            }
          >
            <Icon name="sparkle" size={16} />
            {generate.isPending ? "Gathering moments…" : "Find memories"}
          </button>
        }
      />
      {job.data?.status === "FAILED" && (
        <p className="form-alert" role="alert">
          Memory processing failed. Choose Find memories to retry.
        </p>
      )}
      {["PENDING", "PROCESSING"].includes(job.data?.status || "") && (
        <p role="status">Gathering your memories in the background…</p>
      )}
      {message && (
        <p className="form-alert" role="status">
          {message}
        </p>
      )}
      {query.isError ? (
        <QueryError retry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="collection-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 340 }} />
          ))}
        </div>
      ) : query.data?.items.length ? (
        <div className="collection-grid">
          {query.data.items.map((memory) => (
            <Link
              href={`/memories/${memory.id}`}
              className="story-card"
              key={memory.id}
            >
              <div className="story-image">
                {memory.coverUrl ? (
                  <img
                    src={memory.coverUrl}
                    alt={memory.title}
                    loading="lazy"
                  />
                ) : (
                  <Icon name="sparkle" size={45} />
                )}
                <span className="chip">
                  {new Date(memory.dateFrom).toLocaleDateString("en", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="story-copy">
                <h2>{memory.title}</h2>
                <p>
                  {memory.subtitle ||
                    memory.locationName ||
                    "A chapter from your family’s story."}
                </p>
                <div className="story-meta">
                  <span>{memory.mediaCount} moments</span>
                  <span className="text-link">
                    Relive this story
                    <Icon name="arrow" size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="sparkle"
          title="Your next trip down memory lane."
          description="Add photos, then select Find memories to gather related moments into stories."
          href="/timeline?upload=true"
          label="Add some memories"
        />
      )}
    </div>
  );
}

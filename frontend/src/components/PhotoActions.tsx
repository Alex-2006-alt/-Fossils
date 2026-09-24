"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/request";
import type { PhotoItem } from "@/types";
export default function PhotoActions({
  photo,
  onDeleted,
}: {
  photo: PhotoItem;
  onDeleted: () => void;
}) {
  const { data: session } = useSession();
  const client = useQueryClient(),
    router = useRouter();
  const [place, setPlace] = useState(photo.placeName || ""),
    [name, setName] = useState(photo.filename),
    [album, setAlbum] = useState("");
  const albums = useQuery({
    queryKey: ["albums"],
    queryFn: () =>
      request<{ items: { id: string; title: string }[] }>("/api/albums"),
  });
  const detail = useQuery({
    queryKey: ["photo", photo.id],
    queryFn: () =>
      request<{
        canEdit: boolean;
        faces: { id: string; name: string }[];
        jobs: { step: string; status: string }[];
      }>("/api/photos/" + photo.id),
  });
  const people = useQuery({
    queryKey: ["people"],
    enabled: ["OWNER", "ADMIN"].includes(session?.user?.role || ""),
    queryFn: () => request<{ id: string; name: string }[]>("/api/people"),
  });
  const mutation = useMutation({
    mutationFn: ({
      url,
      body,
      method,
    }: {
      url: string;
      body?: unknown;
      method: string;
    }) => request(url, body, method),
    onSuccess: (_, vars) => {
      client.invalidateQueries();
      router.refresh();
      if (vars.method === "DELETE") onDeleted();
    },
  });
  if (!["OWNER", "ADMIN", "MEMBER"].includes(session?.user?.role || ""))
    return null;
  return (
    <div className="photo-edit">
      {detail.data?.jobs.map((j) => (
        <p key={j.step}>
          {j.step.toLowerCase()}: {j.status.toLowerCase()}
        </p>
      ))}
      {detail.data?.canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              url: "/api/photos/" + photo.id,
              method: "PATCH",
              body: { filename: name, placeName: place || null },
            });
          }}
        >
          <label>
            Photo name
            <input
              className="input-field"
              value={name}
              maxLength={255}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Place
            <input
              className="input-field"
              value={place}
              maxLength={150}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Where was this moment?"
            />
          </label>
          <button className="btn-secondary" disabled={mutation.isPending}>
            Save details
          </button>
        </form>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            url: "/api/albums/" + album,
            method: "PATCH",
            body: { addPhotoIds: [photo.id] },
          });
        }}
      >
        <label>
          Add to album
          <select
            className="input-field"
            value={album}
            required
            onChange={(e) => setAlbum(e.target.value)}
          >
            <option value="">Choose an album</option>
            {albums.data?.items.map((a) => (
              <option value={a.id} key={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary"
          disabled={mutation.isPending || !album}
        >
          Add photo
        </button>
      </form>
      {photo.processingStatus === "FAILED" && (
        <button
          className="btn-secondary"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              url: "/api/photos/" + photo.id,
              method: "PATCH",
              body: { retry: true },
            })
          }
        >
          Retry processing
        </button>
      )}
      <button
        className="btn-secondary"
        disabled={mutation.isPending}
        onClick={() => {
          if (
            confirm("Move this photo to Trash? It can be restored for 7 days.")
          )
            mutation.mutate({
              url: "/api/photos/" + photo.id,
              method: "DELETE",
            });
        }}
      >
        Move to Trash
      </button>
      {["OWNER", "ADMIN"].includes(session?.user?.role || "") &&
        detail.data?.faces.map((face) => (
          <label key={face.id}>
            Correct match: {face.name}
            <select
              className="input-field"
              value=""
              disabled={mutation.isPending}
              onChange={(e) => {
                if (e.target.value)
                  mutation.mutate({
                    url: "/api/people/" + e.target.value,
                    method: "PATCH",
                    body: { faceId: face.id },
                  });
              }}
            >
              <option value="">Assign to person</option>
              {people.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.isSuccess && <p role="status">Saved.</p>}
    </div>
  );
}

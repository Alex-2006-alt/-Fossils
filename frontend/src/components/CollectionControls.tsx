"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { request } from "@/lib/request";
export default function CollectionControls({
  kind,
  id,
  title,
  photos = [],
}: {
  kind: "albums" | "people" | "memories";
  id: string;
  title: string;
  photos?: { id: string; filename: string }[];
}) {
  const { data: session } = useSession();
  const role = session?.user?.role || "",
    admin = ["OWNER", "ADMIN"].includes(role),
    member = admin || role === "MEMBER";
  const [name, setName] = useState(title),
    [selected, setSelected] = useState(""),
    [target, setTarget] = useState("");
  const router = useRouter(),
    client = useQueryClient();
  const people = useQuery({
    queryKey: ["people"],
    enabled: kind === "people" && admin,
    queryFn: () => request<{ id: string; name: string }[]>("/api/people"),
  });
  const save = useMutation({
    mutationFn: ({
      body,
      method = "PATCH",
    }: {
      body?: unknown;
      method?: string;
    }) => request("/api/" + kind + "/" + id, body, method),
    onSuccess: (_, vars) => {
      client.invalidateQueries();
      if (
        vars.method === "DELETE" ||
        (vars.body as { isHidden?: boolean })?.isHidden
      )
        router.push("/" + kind);
      else router.refresh();
    },
  });
  if (!member || (kind === "people" && !admin)) return null;
  return (
    <details className="settings-panel">
      <summary>
        Manage this{" "}
        {kind === "people" ? "person" : kind === "albums" ? "album" : "memory"}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ body: kind === "people" ? { name } : { title: name } });
        }}
      >
        <label>
          Name
          <input
            className="input-field"
            value={name}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="btn-secondary" disabled={save.isPending}>
          Save name
        </button>
      </form>
      {kind === "albums" && photos.length > 0 && (
        <>
          <label>
            Album photo
            <select
              className="input-field"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose photo</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.filename}
                </option>
              ))}
            </select>
          </label>
          <div className="gallery-toolbar">
            <button
              className="btn-secondary"
              disabled={!selected || save.isPending}
              onClick={() => save.mutate({ body: { coverMediaId: selected } })}
            >
              Set cover
            </button>
            <button
              className="btn-secondary"
              disabled={!selected || save.isPending}
              onClick={() =>
                save.mutate({ body: { removePhotoIds: [selected] } })
              }
            >
              Remove from album
            </button>
          </div>
          <p>Add more photos through the photo viewer’s details.</p>
        </>
      )}
      {kind === "people" && (
        <>
          <label>
            Merge into
            <select
              className="input-field"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Choose person</option>
              {people.data
                ?.filter((p) => p.id !== id)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="btn-secondary"
            disabled={!target || save.isPending}
            onClick={() => {
              if (confirm("Move these face matches to the selected person?"))
                save.mutate({ body: { mergeIntoId: target } });
            }}
          >
            Merge matches
          </button>
          <button
            className="btn-secondary"
            disabled={save.isPending}
            onClick={() => save.mutate({ body: { isHidden: true } })}
          >
            Hide person
          </button>
        </>
      )}
      {kind === "memories" && (
        <button
          className="btn-secondary"
          disabled={save.isPending}
          onClick={() => save.mutate({ body: { status: "ARCHIVED" } })}
        >
          Archive memory
        </button>
      )}
      {kind === "albums" && admin && (
        <button
          className="btn-secondary"
          disabled={save.isPending}
          onClick={() => {
            if (confirm("Delete this album? Photos will remain in your vault."))
              save.mutate({ method: "DELETE" });
          }}
        >
          Delete album
        </button>
      )}
      {save.isError && <p role="alert">{save.error.message}</p>}
      {save.isSuccess && <p role="status">Changes saved.</p>}
    </details>
  );
}

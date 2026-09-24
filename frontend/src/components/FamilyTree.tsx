"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/request";
import { QueryError } from "./Design";
type Node = {
  id: string;
  displayName: string;
  relationship: string;
  parentIds: string[];
  birthday: string | null;
};
export default function FamilyTree() {
  const { data: session } = useSession();
  const canEdit = ["OWNER", "ADMIN"].includes(session?.user?.role || "");
  const client = useQueryClient();
  const [editing, setEditing] = useState<Node | null>(null);
  const [name, setName] = useState(""),
    [relationship, setRelationship] = useState("OTHER"),
    [parents, setParents] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["family-tree"],
    queryFn: () => request<{ items: Node[] }>("/api/family/tree"),
  });
  const nodes = query.data?.items || [];
  const mutation = useMutation({
    mutationFn: ({ body, method }: { body: unknown; method?: string }) =>
      request("/api/family/tree", body, method),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["family-tree"] });
      setEditing(null);
      setName("");
      setParents([]);
    },
  });
  return (
    <section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ROOTS & BRANCHES</span>
          <h2>Every generation, connected.</h2>
          <p>Build your family’s story, one person at a time.</p>
        </div>
      </div>
      {query.isError ? (
        <QueryError retry={() => query.refetch()} />
      ) : query.isPending ? (
        <p>Loading your family tree…</p>
      ) : (
        <div className="tree-grid">
          {nodes.map((node) => (
            <article className="tree-card" key={node.id}>
              <span className="eyebrow">{node.relationship}</span>
              <h3>{node.displayName}</h3>
              <p>
                {node.parentIds.length
                  ? "Child of " +
                    node.parentIds
                      .map((id) => nodes.find((n) => n.id === id)?.displayName)
                      .join(" & ")
                  : "A root of your family story"}
              </p>
              {canEdit && (
                <div className="gallery-toolbar">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditing(node);
                      setName(node.displayName);
                      setRelationship(node.relationship);
                      setParents(node.parentIds);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={mutation.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          "Remove " +
                            node.displayName +
                            " from the tree? Photos will remain.",
                        )
                      )
                        mutation.mutate({
                          body: { id: node.id },
                          method: "DELETE",
                        });
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {canEdit && (
        <form
          className="settings-panel"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              body: {
                id: editing?.id,
                displayName: name,
                relationship,
                parentIds: parents,
              },
            });
          }}
        >
          <h3>{editing ? "Edit family member" : "Add a family member"}</h3>
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
          <label>
            Relationship
            <select
              className="input-field"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            >
              {[
                "GRANDPARENT",
                "PARENT",
                "CHILD",
                "SIBLING",
                "SPOUSE",
                "OTHER",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Parents (up to two)</legend>
            {nodes
              .filter((n) => n.id !== editing?.id)
              .map((n) => (
                <label className="check-row" key={n.id}>
                  <input
                    type="checkbox"
                    checked={parents.includes(n.id)}
                    disabled={!parents.includes(n.id) && parents.length >= 2}
                    onChange={(e) =>
                      setParents(
                        e.target.checked
                          ? [...parents, n.id]
                          : parents.filter((id) => id !== n.id),
                      )
                    }
                  />
                  {n.displayName}
                </label>
              ))}
          </fieldset>
          <div className="gallery-toolbar">
            <button className="btn-primary" disabled={mutation.isPending}>
              Save member
            </button>
            {editing && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(null);
                  setName("");
                  setParents([]);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {mutation.isError && (
        <p className="form-alert" role="alert">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}

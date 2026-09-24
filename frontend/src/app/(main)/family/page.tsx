"use client";
import Trash from "@/components/Trash";
import FamilyTree from "@/components/FamilyTree";
import FamilySettings from "@/components/FamilySettings";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHeader, QueryError } from "@/components/Design";
interface Invite {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
  usedAt: string | null;
}
export default function FamilyPage() {
  const { data: session } = useSession();
  const user = session?.user as
    | {
        familyName?: string;
        role?: string;
      }
    | undefined;
  const canInvite = user?.role === "OWNER" || user?.role === "ADMIN";
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const invites = useQuery<{
    items: Invite[];
  }>({
    queryKey: ["invitations"],
    enabled: canInvite,
    queryFn: async () => {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw Error("Could not load invitations");
      return res.json();
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || null, role: "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Could not create invitation");
      return data;
    },
    onSuccess: (data) => {
      setLink(`${window.location.origin}/invite/${data.token}`);
      setCopied(false);
      client.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invitations?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw Error("Could not revoke invitation");
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["invitations"] }),
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow="YOUR INNER CIRCLE"
        title={user?.familyName || "A place to belong."}
        description="More than a collection. A story you share."
      />
      <section className="feature-panel">
        <div>
          <span className="eyebrow">BETTER WITH YOUR PEOPLE</span>
          <h2>
            Make yourself
            <br />a family of memories.
          </h2>
          <p>
            Bring everyone’s perspective into one shared archive. Explore
            familiar faces, rediscover old stories, and add a few new ones.
          </p>
          <Link href="/people" className="btn-secondary">
            Meet your collection
            <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="family-orbit" aria-hidden="true">
          <span>
            <Icon name="heart" size={27} />
          </span>
          <span>
            <Icon name="people" size={27} />
          </span>
          <span>
            <Icon name="photos" size={27} />
          </span>
        </div>
      </section>
      {canInvite && (
        <section>
          <div className="section-heading">
            <div>
              <h2>There’s room for everyone.</h2>
              <p>Create a link and share it with someone in your family.</p>
            </div>
          </div>
          <form
            className="gallery-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <input
              className="input-field"
              style={{ maxWidth: 400 }}
              type="email"
              aria-label="Restrict invitation to email (optional)"
              placeholder="Email address (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn-primary" disabled={create.isPending}>
              <Icon name="plus" size={16} />
              {create.isPending ? "Creating…" : "Create invitation"}
            </button>
          </form>
          {create.isError && (
            <p className="form-alert" role="alert">
              {create.error.message}
            </p>
          )}
          {link && (
            <div className="form-alert">
              <label htmlFor="invite-link">Your invitation link</label>
              <input
                id="invite-link"
                className="input-field"
                value={link}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <button
                className="btn-secondary"
                style={{ marginTop: 10 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          )}
          {invites.isError ? (
            <QueryError retry={() => invites.refetch()} />
          ) : (
            invites.data?.items.map((invite) => (
              <div className="upload-item" key={invite.id}>
                <Icon name="people" />
                <div>
                  <strong>{invite.role} invitation</strong>
                  <span>
                    {invite.usedAt
                      ? "Accepted"
                      : new Date(invite.expiresAt) < new Date()
                        ? "Expired"
                        : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                  </span>
                </div>
                {!invite.usedAt && (
                  <button
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(invite.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
          {revoke.isError && (
            <p className="form-alert" role="alert">
              Couldn’t revoke the invitation. Please try again.
            </p>
          )}
        </section>
      )}
      <FamilyTree />
      <FamilySettings />
      <Trash />
    </div>
  );
}

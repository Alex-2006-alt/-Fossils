"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import Icon from "@/components/Icon";
export default function InvitePage() {
  const { token } = useParams<{
    token: string;
  }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [family, setFamily] = useState("");
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw Error(data.error || "This invitation is no longer available.");
        setFamily(data.familyName);
        if (data.email) setEmail(data.email);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setValidating(false);
      });
    return () => controller.abort();
  }, [token]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode: token }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Could not join this family.");
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthLayout>
      <span className="eyebrow">THERE’S A PLACE FOR YOU HERE</span>
      <h2>
        {validating
          ? "Opening your invitation…"
          : success
            ? "You’re home."
            : family
              ? `Join ${family}.`
              : "A little detour."}
      </h2>
      <p className="auth-intro">
        {family
          ? "You’ve been invited to add your chapter to the family story."
          : "Check your invitation to find your family’s archive."}
      </p>
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
      {success ? (
        <Link href="/login" className="btn-primary">
          Sign in to your family
          <Icon name="arrow" size={17} />
        </Link>
      ) : (
        family && (
          <form onSubmit={submit}>
            <div className="field-group">
              <label htmlFor="invite-name">Your name</label>
              <input
                id="invite-name"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="field-group">
              <label htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field-group">
              <label htmlFor="invite-password">Choose a password</label>
              <input
                id="invite-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
            <button className="btn-primary" disabled={loading}>
              {loading ? "Making room for you…" : "Join the family"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        )
      )}
      <p className="auth-switch">
        Already part of the family? <Link href="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

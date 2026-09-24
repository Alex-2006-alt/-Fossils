"use client";
import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import Icon from "@/components/Icon";
export default function SignupPage() {
  const [mode, setMode] = useState<"join" | "create">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: mode === "join" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "join"
            ? { name, email, password, inviteCode }
            : { name, email, password, familyName },
        ),
      });
      const data = await res.json();
      if (!res.ok)
        throw Error(data.error || "We couldn’t create your account.");
      setSuccess(
        mode === "create"
          ? "Your family archive is ready. Sign in and open Family to create invitation links."
          : "You’re part of the family. Sign in to open your archive.",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthLayout>
      <span className="eyebrow">THE START OF SOMETHING TOGETHER</span>
      <h2>Your story starts here.</h2>
      <p className="auth-intro">A home for the people and moments you love.</p>
      {success ? (
        <>
          <p className="form-alert form-success" role="status">
            {success}
          </p>
          <Link href="/login" className="btn-primary">
            Continue to sign in
            <Icon name="arrow" size={17} />
          </Link>
        </>
      ) : (
        <>
          <div className="auth-tabs">
            <button
              aria-pressed={mode === "create"}
              onClick={() => setMode("create")}
            >
              Start a family archive
            </button>
            <button
              aria-pressed={mode === "join"}
              onClick={() => setMode("join")}
            >
              Join your family
            </button>
          </div>
          <form onSubmit={submit}>
            <div className="field-group">
              <label htmlFor="signup-name">Your name</label>
              <input
                className="input-field"
                id="signup-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="What should we call you?"
              />
            </div>
            <div className="field-group">
              <label htmlFor="signup-email">Email address</label>
              <input
                className="input-field"
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="field-group">
              <label htmlFor="signup-password">Password</label>
              <input
                className="input-field"
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                required
                placeholder="At least 12 characters"
              />
            </div>
            <div className="field-group">
              <label htmlFor="family-field">
                {mode === "create" ? "Family name" : "Invitation token"}
              </label>
              <input
                className="input-field"
                id="family-field"
                value={mode === "create" ? familyName : inviteCode}
                onChange={(e) =>
                  mode === "create"
                    ? setFamilyName(e.target.value)
                    : setInviteCode(e.target.value)
                }
                required
                placeholder={
                  mode === "create"
                    ? "The name on your family album"
                    : "Enter the code you received"
                }
              />
            </div>
            {error && (
              <p className="form-alert" role="alert">
                {error}
              </p>
            )}
            <button className="btn-primary" disabled={loading}>
              {loading
                ? "Making a little room for you…"
                : mode === "create"
                  ? "Create your family archive"
                  : "Join the family"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </>
      )}
      <p className="auth-switch">
        Already have a little corner here? <Link href="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

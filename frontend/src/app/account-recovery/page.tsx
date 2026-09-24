"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { request } from "@/lib/request";
export default function Recovery() {
  const [token, setToken] = useState(""),
    [purpose, setPurpose] = useState("RESET"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      setToken(params.get("token") || "");
      setPurpose(params.get("purpose") === "VERIFY" ? "VERIFY" : "RESET");
      history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <AuthLayout>
      <span className="eyebrow">A WAY BACK HOME</span>
      <h2>
        {purpose === "VERIFY"
          ? "Verify your email"
          : token
            ? "Choose a new password"
            : "Forgot your password?"}
      </h2>
      {!done && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              const data = await request<{ message: string }>(
                "/api/auth/recovery",
                token
                  ? {
                      token,
                      purpose,
                      ...(purpose === "RESET" ? { password } : {}),
                    }
                  : { email },
                token ? "PATCH" : "POST",
              );
              setMessage(data.message);
              setDone(true);
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {!token ? (
            <label>
              Email address
              <input
                className="input-field"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          ) : purpose === "RESET" ? (
            <label>
              New password
              <input
                className="input-field"
                type="password"
                required
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          ) : (
            <p>Confirm this email address belongs to you.</p>
          )}
          <button className="btn-primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : token
                ? purpose === "VERIFY"
                  ? "Verify email"
                  : "Reset password"
                : "Send reset link"}
          </button>
        </form>
      )}
      {message && (
        <p className="form-alert" role="status">
          {message}
        </p>
      )}
      <Link href="/login" className="text-link">
        Back to sign in
      </Link>
    </AuthLayout>
  );
}

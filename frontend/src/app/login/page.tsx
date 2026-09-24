"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import Icon from "@/components/Icon";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error)
        setError("That email and password didn’t match. Try again.");
      else {
        router.push("/home");
        router.refresh();
      }
    } catch {
      setError("We couldn’t sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthLayout>
      <span className="eyebrow">YOUR PEOPLE. YOUR PLACE.</span>
      <h2>Welcome home.</h2>
      <p className="auth-intro">
        Your favorite moments have been waiting for you.
      </p>
      <form onSubmit={submit}>
        <div className="field-group">
          <label htmlFor="login-email">Email address</label>
          <input
            className="input-field"
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field-group">
          <label htmlFor="login-password">Password</label>
          <input
            className="input-field"
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>
        {error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary" disabled={loading}>
          {loading ? "Opening your archive…" : "Step inside"}
          <Icon name="arrow" size={18} />
        </button>
      </form>
      <Link href="/account-recovery" className="text-link">
        Forgot your password?
      </Link>
      <p className="auth-switch">
        New memories start here. <Link href="/signup">Create an account</Link>
      </p>
      <div className="auth-note">
        <Icon name="people" size={15} />
        <span>A little closer to the ones you love.</span>
      </div>
    </AuthLayout>
  );
}

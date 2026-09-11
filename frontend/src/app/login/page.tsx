"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/timeline");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "linear-gradient(135deg, #fefdfb 0%, #f9f1e4 50%, #f3e4cc 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background orbs */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(232,101,122,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%",
          maxWidth: "440px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: "40px" }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #f5a623, #c47f14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 8px 30px rgba(245,166,35,0.3)",
              fontSize: "32px",
            }}
          >
            📸
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#2f2c28",
              margin: "0 0 8px",
              letterSpacing: "-0.5px",
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#8a847a",
              margin: 0,
            }}
          >
            Sign in to your family vault
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            background: "rgba(255, 255, 255, 0.72)",
            backdropFilter: "blur(20px) saturate(1.6)",
            WebkitBackdropFilter: "blur(20px) saturate(1.6)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            borderRadius: "24px",
            padding: "40px 36px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.04)",
          }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "rgba(232, 101, 122, 0.1)",
                  border: "1px solid rgba(232, 101, 122, 0.2)",
                  color: "#d94f66",
                  fontSize: "14px",
                  fontWeight: 500,
                  overflow: "hidden",
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b665e",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b665e",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-field"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary"
            style={{
              width: "100%",
              fontSize: "16px",
              padding: "16px",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{ display: "inline-block", width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}
                />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </motion.form>

        {/* Footer links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            textAlign: "center",
            marginTop: "28px",
            fontSize: "14px",
            color: "#8a847a",
          }}
        >
          <span>Don&apos;t have an account? </span>
          <Link
            href="/signup"
            style={{
              color: "#e8961a",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Join your family
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

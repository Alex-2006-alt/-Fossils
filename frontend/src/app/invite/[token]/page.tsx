"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);

  // Validate invite token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setFamilyName(data.familyName);
          if (data.email) setEmail(data.email);
        } else {
          setError(data.error || "Invalid or expired invitation");
        }
      } catch {
        setError("Could not validate invitation");
      } finally {
        setValidating(false);
      }
    }
    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess("Welcome to the family! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #fefdfb 0%, #f9f1e4 50%, #f3e4cc 100%)",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid var(--color-stone-200)",
            borderTopColor: "var(--color-amber-400)",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background:
          "linear-gradient(135deg, #fefdfb 0%, #f9f1e4 50%, #f3e4cc 100%)",
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
          background:
            "radial-gradient(circle, rgba(127,186,138,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}
      >
        {/* Header */}
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
              background: "linear-gradient(135deg, #7fba8a, #5fa06c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 8px 30px rgba(95,160,108,0.3)",
              fontSize: "32px",
            }}
          >
            💌
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
            {error ? "Invalid Invitation" : "You're Invited!"}
          </h1>
          <p style={{ fontSize: "15px", color: "#8a847a", margin: 0 }}>
            {error
              ? error
              : familyName
              ? `Join ${familyName} on FamVault`
              : "Join your family on FamVault"}
          </p>
        </motion.div>

        {!error && (
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
              padding: "36px 32px",
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.04)",
            }}
          >
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(95, 160, 108, 0.1)",
                    border: "1px solid rgba(95, 160, 108, 0.2)",
                    color: "#5fa06c",
                    fontSize: "14px",
                    fontWeight: 500,
                    overflow: "hidden",
                  }}
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="invite-name"
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
                Your Name
              </label>
              <input
                id="invite-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="input-field"
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="invite-email"
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
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-field"
                readOnly={!!email}
                style={email ? { background: "#f5f3ef", cursor: "not-allowed" } : {}}
              />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <label
                htmlFor="invite-password"
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
                Create Password
              </label>
              <input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
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
                background: "linear-gradient(135deg, #7fba8a, #5fa06c)",
                boxShadow: "0 4px 16px rgba(95,160,108,0.3)",
              }}
            >
              {loading ? "Joining..." : "Join Family"}
            </motion.button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}

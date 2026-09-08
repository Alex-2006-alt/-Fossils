"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Mode = "join" | "create";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const url = "/api/auth/signup";
      const method = mode === "join" ? "POST" : "PUT";
      const body =
        mode === "join"
          ? { name, email, password, inviteCode }
          : { name, email, password, familyName };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (mode === "create" && data.inviteCode) {
        setSuccess(
          `Family created! Your invite code is: ${data.inviteCode} — share it with your family members.`
        );
        setTimeout(() => router.push("/login"), 4000);
      } else {
        setSuccess("Account created! Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
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
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-15%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(127,186,138,0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(94,180,217,0.08) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 1 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: "36px" }}
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
            👨‍👩‍👧‍👦
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
            Join FamVault
          </h1>
          <p style={{ fontSize: "15px", color: "#8a847a", margin: 0 }}>
            {mode === "join"
              ? "Enter your family's invite code to join"
              : "Create a new family vault"}
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <div
          style={{
            display: "flex",
            borderRadius: "16px",
            padding: "4px",
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(10px)",
            marginBottom: "24px",
            border: "1px solid rgba(255,255,255,0.4)",
          }}
        >
          {(["join", "create"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#2f2c28" : "#8a847a",
                boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {m === "join" ? "🔗 Join Family" : "✨ Create Family"}
            </button>
          ))}
        </div>

        {/* Form */}
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
            <label htmlFor="signup-name" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6b665e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Your Name
            </label>
            <input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required className="input-field" />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label htmlFor="signup-email" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6b665e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Email
            </label>
            <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label htmlFor="signup-password" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6b665e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Password
            </label>
            <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} className="input-field" />
          </div>

          <AnimatePresence mode="wait">
            {mode === "join" ? (
              <motion.div key="invite" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} style={{ marginBottom: "28px" }}>
                <label htmlFor="invite-code" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6b665e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Invite Code
                </label>
                <input id="invite-code" type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4" required className="input-field" style={{ fontFamily: "monospace", letterSpacing: "2px", textAlign: "center", fontSize: "18px" }} />
              </motion.div>
            ) : (
              <motion.div key="family" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} style={{ marginBottom: "28px" }}>
                <label htmlFor="family-name" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6b665e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Family Name
                </label>
                <input id="family-name" type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder='e.g. "The Sharmas"' required className="input-field" />
              </motion.div>
            )}
          </AnimatePresence>

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
              background: mode === "create"
                ? "linear-gradient(135deg, #7fba8a, #5fa06c)"
                : undefined,
              boxShadow: mode === "create"
                ? "0 4px 16px rgba(95,160,108,0.3)"
                : undefined,
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "join"
              ? "Join Family"
              : "Create Family Vault"}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{ textAlign: "center", marginTop: "28px", fontSize: "14px", color: "#8a847a" }}
        >
          <span>Already have an account? </span>
          <Link href="/login" style={{ color: "#e8961a", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

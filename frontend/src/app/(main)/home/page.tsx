"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

export default function HomePage() {
  const { data: session } = useSession();
  const userName =
    session?.user?.name?.split(" ")[0] || "there";

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "32px 28px", maxWidth: "1200px" }}>
      {/* Hero Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "40px" }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--color-stone-800)",
            margin: "0 0 8px",
            letterSpacing: "-0.5px",
          }}
        >
          {greeting}, {userName}
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--color-stone-400)",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          &ldquo;Memories worth keeping.&rdquo;
        </p>
      </motion.div>

      {/* Today in Your Family */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        style={{ marginBottom: "48px" }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-stone-700)",
            margin: "0 0 20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✨</span> Today in your family
        </h2>
        <div
          style={{
            background: "var(--color-surface-glass)",
            backdropFilter: "blur(20px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "20px",
            padding: "40px",
            textAlign: "center",
            color: "var(--color-stone-400)",
            fontSize: "15px",
          }}
        >
          <span style={{ fontSize: "40px", display: "block", marginBottom: "12px" }}>
            📸
          </span>
          Upload photos to start building your family&apos;s timeline.
          <br />
          <span style={{ fontSize: "13px", marginTop: "8px", display: "block" }}>
            Memories from this day will appear here.
          </span>
        </div>
      </motion.section>

      {/* Recently Added */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{ marginBottom: "48px" }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-stone-700)",
            margin: "0 0 20px",
          }}
        >
          Recently Added
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "8px",
          }}
        >
          {/* Skeleton placeholders */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                aspectRatio: "1",
                borderRadius: "12px",
              }}
            />
          ))}
        </div>
      </motion.section>

      {/* Memories from the Past */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        style={{ marginBottom: "48px" }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-stone-700)",
            margin: "0 0 20px",
          }}
        >
          Memories from the past
        </h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[2025, 2024, 2023, 2022, 2021].map((year) => (
            <div
              key={year}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-stone-100)",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-stone-500)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {year}
            </div>
          ))}
        </div>
      </motion.section>

      {/* Family Milestones */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-stone-700)",
            margin: "0 0 20px",
          }}
        >
          Family Milestones
        </h2>
        <div
          style={{
            background: "var(--color-surface-glass)",
            backdropFilter: "blur(20px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "16px",
            padding: "24px",
            color: "var(--color-stone-400)",
            fontSize: "14px",
          }}
        >
          Add birthdays, anniversaries, and special dates in Settings → Milestones.
        </div>
      </motion.section>
    </div>
  );
}

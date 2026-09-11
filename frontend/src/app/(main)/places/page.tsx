"use client";

import { motion } from "framer-motion";

export default function PlacesPage() {
  return (
    <div style={{ padding: "32px 28px", maxWidth: "1200px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--color-stone-800)",
            margin: "0 0 8px",
            letterSpacing: "-0.3px",
          }}
        >
          Places
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-stone-400)", margin: "0 0 32px" }}>
          Your family&apos;s journey across the world.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{
          background: "var(--color-surface-glass)",
          backdropFilter: "blur(20px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "20px",
          padding: "48px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>📍</span>
        <p style={{ color: "var(--color-stone-500)", fontSize: "15px", margin: 0 }}>
          Photos with GPS data will appear on a map here.
          <br />
          <span style={{ fontSize: "13px", color: "var(--color-stone-400)" }}>
            Upload photos with location data to get started.
          </span>
        </p>
      </motion.div>
    </div>
  );
}

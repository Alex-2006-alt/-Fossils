"use client";

import { motion } from "framer-motion";

export default function MemoriesPage() {
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
          Memories
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-stone-400)", margin: "0 0 32px" }}>
          AI-curated stories from your family&apos;s photos.
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
        <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>✨</span>
        <p style={{ color: "var(--color-stone-500)", fontSize: "15px", margin: 0 }}>
          Memories are automatically created from your uploaded photos.
          <br />
          <span style={{ fontSize: "13px", color: "var(--color-stone-400)" }}>
            Upload trip photos, event photos, or everyday moments to see the magic.
          </span>
        </p>
      </motion.div>
    </div>
  );
}

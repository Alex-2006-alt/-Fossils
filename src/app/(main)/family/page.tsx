"use client";

import { motion } from "framer-motion";

export default function FamilyPage() {
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
          Family Tree
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-stone-400)", margin: "0 0 32px" }}>
          Build your family tree and connect memories to people.
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
        <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>🌳</span>
        <p style={{ color: "var(--color-stone-500)", fontSize: "15px", margin: "0 0 20px" }}>
          Connect your family members with relationships and memories.
        </p>
        <button
          className="btn-primary"
          style={{ padding: "12px 28px", fontSize: "14px" }}
        >
          Start Building
        </button>
      </motion.div>
    </div>
  );
}

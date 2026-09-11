"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function SearchPage() {
  const [query, setQuery] = useState("");

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
          Search
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-stone-400)", margin: "0 0 32px" }}>
          Find any memory with natural language.
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        style={{ marginBottom: "40px" }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "600px",
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search your family memories... Try "Mom and Dad at the beach"'
            className="input-field"
            style={{
              padding: "18px 24px 18px 52px",
              fontSize: "16px",
              borderRadius: "16px",
              border: "1.5px solid var(--color-stone-200)",
              background: "var(--color-surface-elevated)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "20px",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
        </div>
      </motion.div>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--color-stone-500)",
            margin: "0 0 16px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Try searching for
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {[
            "Mom and Dad at the beach",
            "Birthday photos",
            "Our Goa trip",
            "Photos of grandma",
            "Family group photos",
            "Sunset photos",
            "Wedding photos",
            "Diwali celebrations",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              style={{
                padding: "10px 18px",
                borderRadius: "12px",
                border: "1px solid var(--color-stone-200)",
                background: "var(--color-surface-elevated)",
                color: "var(--color-stone-600)",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "var(--font-sans)",
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

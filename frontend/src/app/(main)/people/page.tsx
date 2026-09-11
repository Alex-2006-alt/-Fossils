"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";

interface Person {
  id: string;
  name: string;
  photoCount: number;
  coverUrl: string | null;
}

export default function PeoplePage() {
  const { data: people, isLoading } = useQuery<Person[]>({
    queryKey: ["people"],
    queryFn: async () => {
      const res = await fetch("/api/people");
      if (!res.ok) throw new Error("Failed to fetch people");
      return res.json();
    },
  });

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 800,
          marginBottom: "8px",
          letterSpacing: "-0.02em",
          color: "var(--color-stone-800)",
        }}
      >
        People
      </h1>
      <p style={{ color: "var(--color-stone-500)", marginBottom: "40px" }}>
        Auto-detected faces from your family vault.
      </p>

      {isLoading ? (
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                background: "var(--color-stone-200)",
              }}
            />
          ))}
        </div>
      ) : people && people.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "32px",
          }}
        >
          {people.map((person, index) => (
            <Link
              key={person.id}
              href={`/people/${person.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    marginBottom: "16px",
                    background: "var(--color-stone-100)",
                    boxShadow: "var(--shadow-md)",
                    border: "4px solid var(--color-surface)",
                  }}
                >
                  {person.coverUrl ? (
                    <img
                      src={person.coverUrl}
                      alt={person.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "48px",
                      }}
                    >
                      👤
                    </div>
                  )}
                </div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    margin: "0 0 4px 0",
                    textAlign: "center",
                  }}
                >
                  {person.name}
                </h3>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--color-stone-400)",
                  }}
                >
                  {person.photoCount} photo{person.photoCount !== 1 && "s"}
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>👥</div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-stone-600)" }}>
            No faces detected yet
          </h2>
          <p style={{ color: "var(--color-stone-400)" }}>
            Upload photos with faces, and they will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { useTheme } from "./Providers";

const navItems = [
  { href: "/timeline", label: "Timeline", icon: "📅" },
  { href: "/albums", label: "Albums", icon: "📁" },
  { href: "/favorites", label: "Favorites", icon: "❤️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  const familyName =
    (session?.user as Record<string, unknown>)?.familyName as string ||
    "Family";

  return (
    <aside
      style={{
        width: "280px",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        padding: "28px 20px",
        background: "var(--color-surface-elevated)",
        borderRight: "1px solid var(--color-stone-100)",
        zIndex: 40,
        transition: "background var(--duration-slow) var(--ease-out-expo), border-color var(--duration-slow) var(--ease-out-expo)",
      }}
      className="sidebar-desktop"
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "40px",
          paddingLeft: "4px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #f5a623, #c47f14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            boxShadow: "0 4px 12px rgba(245,166,35,0.25)",
          }}
        >
          📸
        </div>
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-stone-800)",
              letterSpacing: "-0.3px",
            }}
          >
            FamVault
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-stone-400)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {familyName}
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                borderRadius: "14px",
                marginBottom: "4px",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--color-stone-800)" : "var(--color-stone-500)",
                background: isActive ? "var(--color-stone-50)" : "transparent",
                transition: "all var(--duration-normal) var(--ease-out-expo)",
                position: "relative",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "14px",
                    background: "var(--color-cream-100)",
                    zIndex: -1,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Upload Button */}
        <Link
          href="/timeline?upload=true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "14px",
            marginTop: "16px",
            borderRadius: "14px",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: 600,
            color: "white",
            background: "linear-gradient(135deg, #f5a623, #c47f14)",
            boxShadow: "0 4px 16px rgba(245,166,35,0.3)",
            transition: "all var(--duration-normal) var(--ease-out-expo)",
          }}
        >
          <span style={{ fontSize: "18px" }}>➕</span>
          Upload Photos
        </Link>
      </nav>

      {/* Bottom Section */}
      <div style={{ borderTop: "1px solid var(--color-stone-100)", paddingTop: "20px" }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "14px",
            color: "var(--color-stone-500)",
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            width: "100%",
            transition: "background var(--duration-fast)",
          }}
        >
          <span style={{ fontSize: "18px" }}>{theme === "dark" ? "☀️" : "🌙"}</span>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {/* User Info & Logout */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--color-sage-400), var(--color-sage-500))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              color: "white",
              fontWeight: 700,
            }}
          >
            {session?.user?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                margin: 0,
                color: "var(--color-stone-700)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session?.user?.name}
            </p>
            <p
              style={{
                fontSize: "12px",
                margin: 0,
                color: "var(--color-stone-400)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session?.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              padding: "6px",
              borderRadius: "8px",
              transition: "background var(--duration-fast)",
              color: "var(--color-stone-400)",
            }}
          >
            🚪
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
        }
        .dark .sidebar-desktop {
          background: var(--color-dark-surface) !important;
          border-right-color: var(--color-dark-border) !important;
        }
      `}</style>
    </aside>
  );
}

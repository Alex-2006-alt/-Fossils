"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const navItems = [
  { href: "/timeline", label: "Timeline", icon: "📅" },
  { href: "/albums", label: "Albums", icon: "📁" },
  { href: "/timeline?upload=true", label: "Upload", icon: "➕", isUpload: true },
  { href: "/favorites", label: "Favorites", icon: "❤️" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-nav glass"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "none",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 12px 24px", // extra padding for safe area
        zIndex: 50,
      }}
    >
      {navItems.map((item) => {
        const isActive =
          !item.isUpload &&
          (pathname === item.href || pathname?.startsWith(item.href + "/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
              padding: item.isUpload ? "0" : "8px 16px",
              borderRadius: "12px",
              position: "relative",
              transition: "all var(--duration-normal) var(--ease-out-expo)",
            }}
          >
            {item.isUpload ? (
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #f5a623, #c47f14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  boxShadow: "0 4px 16px rgba(245,166,35,0.35)",
                  marginTop: "-16px",
                }}
              >
                {item.icon}
              </div>
            ) : (
              <>
                {isActive && (
                  <motion.div
                    layoutId="mobile-active"
                    style={{
                      position: "absolute",
                      top: "2px",
                      width: "24px",
                      height: "3px",
                      borderRadius: "2px",
                      background: "var(--color-amber-400)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span style={{ fontSize: "22px" }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive
                      ? "var(--color-stone-800)"
                      : "var(--color-stone-400)",
                    transition: "color var(--duration-fast)",
                  }}
                >
                  {item.label}
                </span>
              </>
            )}
          </Link>
        );
      })}

      <style>{`
        @media (max-width: 768px) {
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

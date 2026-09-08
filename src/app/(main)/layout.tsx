"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-surface-primary)",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid var(--color-stone-200)",
            borderTopColor: "var(--color-amber-400)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-surface-secondary)",
      }}
    >
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: "280px",
          paddingBottom: "80px",
          minHeight: "100vh",
          transition: "margin var(--duration-normal) var(--ease-out-expo)",
        }}
        className="main-content"
      >
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      <style>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

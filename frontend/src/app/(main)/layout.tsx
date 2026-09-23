"use client";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar, { navigation } from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Dialog from "@/components/Dialog";
import Icon from "@/components/Icon";
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);
  if (status === "loading")
    return (
      <div className="app-loading">
        <span className="brand-mark">
          <Icon name="album" size={28} />
        </span>
        <p>Opening your archive…</p>
      </div>
    );
  if (!session) return null;
  const current = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="desktop-navigation">
        <Sidebar />
      </div>
      <div className="workspace">
        <header className="workspace-bar">
          <span className="breadcrumb">
            Your archive <span>/</span>{" "}
            <strong>{current?.label || "Collection"}</strong>
          </span>
          <div className="bar-actions">
            <Link
              href="/search"
              className="top-search"
              aria-label="Find a moment"
            >
              <Icon name="search" size={16} />
              <span>Find a moment</span>
            </Link>
            <span className="archive-badge">
              <span className="status-dot" />
              Family space
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div key={pathname} className="page-transition">
            {children}
          </div>
        </main>
        <footer className="workspace-footer">
          <span>Made for the moments that matter.</span>
          <span>FAMVAULT ✳</span>
        </footer>
      </div>
      <MobileNav onMenu={() => setMenuOpen(true)} />
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Explore your archive"
        className="navigation-dialog"
      >
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </Dialog>
    </div>
  );
}

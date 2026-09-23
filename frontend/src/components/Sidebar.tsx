"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "./Providers";
import Icon, { type IconName } from "./Icon";
export const navigation: {
  href: string;
  label: string;
  icon: IconName;
}[] = [
  { href: "/home", label: "Overview", icon: "home" },
  { href: "/timeline", label: "All photos", icon: "photos" },
  { href: "/albums", label: "Albums", icon: "album" },
  { href: "/memories", label: "Memories", icon: "sparkle" },
  { href: "/favorites", label: "Favorites", icon: "heart" },
  { href: "/people", label: "People", icon: "people" },
  { href: "/places", label: "Places", icon: "pin" },
  { href: "/family", label: "Family space", icon: "tree" },
  { href: "/search", label: "Search", icon: "search" },
];
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const familyName =
    (
      session?.user as {
        familyName?: string;
      }
    )?.familyName || "Your family";
  return (
    <aside className="archive-sidebar">
      <Link href="/home" className="brand" onClick={onNavigate}>
        <span className="brand-mark">
          <Icon name="album" size={23} />
        </span>
        famvault<span className="brand-dot">.</span>
      </Link>
      <div className="family-label">
        <span className="status-dot" />
        {familyName}
        <span className="tiny-label">FAMILY ARCHIVE</span>
      </div>
      <span className="nav-caption">THE COLLECTION</span>
      <nav aria-label="Main navigation">
        {navigation.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "page"
                : undefined
            }
            className={`nav-link ${i === 5 ? "nav-divider" : ""}`}
          >
            <Icon name={item.icon} size={19} />
            {item.label}
            {pathname === item.href && <span className="nav-dot" />}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <Icon name="sparkle" size={23} />
          <p>
            Little moments.
            <br />
            <em>Lasting treasures.</em>
          </p>
          <Link
            href="/timeline?upload=true"
            className="btn-primary"
            onClick={onNavigate}
          >
            <Icon name="plus" size={17} />
            Add photos
          </Link>
        </div>
        <div className="account-row">
          <span className="avatar">
            {session?.user?.name?.[0]?.toUpperCase() || "F"}
          </span>
          <div>
            <strong>{session?.user?.name || "Your account"}</strong>
            <span>{familyName}</span>
          </div>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <button
            className="icon-button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

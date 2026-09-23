"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
export default function MobileNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <Link
        href="/home"
        aria-current={pathname === "/home" ? "page" : undefined}
      >
        <Icon name="home" />
        <span>Home</span>
      </Link>
      <Link
        href="/timeline"
        aria-current={pathname === "/timeline" ? "page" : undefined}
      >
        <Icon name="photos" />
        <span>Photos</span>
      </Link>
      <Link
        href="/timeline?upload=true"
        className="mobile-upload"
        aria-label="Upload photos"
      >
        <Icon name="plus" size={26} />
      </Link>
      <Link
        href="/memories"
        aria-current={pathname === "/memories" ? "page" : undefined}
      >
        <Icon name="sparkle" />
        <span>Memories</span>
      </Link>
      <button onClick={onMenu}>
        <Icon name="menu" />
        <span>Explore</span>
      </button>
    </nav>
  );
}

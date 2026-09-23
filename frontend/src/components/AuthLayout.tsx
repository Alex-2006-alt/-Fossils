import type { ReactNode } from "react";
import Link from "next/link";
import ArchiveArt from "./ArchiveArt";
import Icon from "./Icon";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="album" size={23} />
          </span>
          famvault<span className="brand-dot">.</span>
        </Link>
        <div className="auth-story-main">
          <span className="eyebrow">FOR THE STORIES ONLY YOU CAN TELL</span>
          <h1>
            Life moves fast.
            <br />
            <em>Keep the feeling.</em>
          </h1>
          <p>
            A thoughtful home for your family’s photos, familiar faces, and
            unforgettable little moments.
          </p>
          <ArchiveArt />
        </div>
        <div className="auth-story-footer">
          <span>A family archive. A shared story.</span>
          <span>EST. FOR EVERY GENERATION</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form">
          <Link href="/" className="brand auth-mobile-brand">
            <span className="brand-mark">
              <Icon name="album" />
            </span>
            famvault.
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}

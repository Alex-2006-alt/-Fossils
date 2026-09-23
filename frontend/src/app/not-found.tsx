import Link from "next/link";
import Icon from "@/components/Icon";
export default function NotFound() {
  return (
    <main className="app-loading">
      <div className="empty-object">
        <Icon name="search" size={36} />
      </div>
      <h1 style={{ fontSize: 40, margin: 0 }}>A moment out of reach.</h1>
      <p>This page may have moved, or it isn’t in your family’s archive.</p>
      <Link href="/home" className="btn-primary">
        Back to your archive
        <Icon name="arrow" size={17} />
      </Link>
    </main>
  );
}

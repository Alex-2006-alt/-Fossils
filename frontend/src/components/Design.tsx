import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";
export function PageHeader({
  eyebrow = "YOUR FAMILY ARCHIVE",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  icon = "photos",
  title,
  description,
  href,
  label,
}: {
  icon?: IconName;
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-object">
        <Icon name={icon} size={36} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && (
        <Link href={href} className="btn-primary">
          {label}
          <Icon name="arrow" size={17} />
        </Link>
      )}
    </div>
  );
}
export function QueryError({ retry }: { retry: () => void }) {
  return (
    <div className="query-error" role="alert">
      <Icon name="info" />
      <span>We couldn’t load this collection.</span>
      <button onClick={retry}>Try again</button>
    </div>
  );
}

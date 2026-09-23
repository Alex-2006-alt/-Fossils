import type { CSSProperties } from "react";
const paths = {
  home: "M3 10 12 3l9 7v10H15v-7H9v7H3Z",
  photos: "M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M8 8h.01",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  album: "M4 4h16v17H4z M4 8h16 M8 4v17",
  sparkle: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  tree: "M12 3v10 M5 21v-8h14v8 M9 3h6v5H9z M2 17h6v5H2z M16 17h6v5h-6z",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  plus: "M12 5v14 M5 12h14",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  close: "m6 6 12 12 M6 18 18 6",
  moon: "M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z",
  sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  logout: "M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3",
  upload: "M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  check: "m5 12 4 4L19 6",
  info: "M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  play: "m8 4 13 8-13 8Z",
  download: "M12 3v13 M7 11l5 5 5-5 M4 17v4h16v-4",
} as const;
export type IconName = keyof typeof paths;
export default function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}

"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import {
  useState,
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { MotionConfig } from "framer-motion";
// ── Theme Context ──
type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});
export function useTheme() {
  return useContext(ThemeContext);
}
// ── Providers ──
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const theme = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "light" as Theme,
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    fallbackTheme = next;
    try {
      localStorage.setItem("famvault-theme", next);
    } catch {
      /* Storage can be disabled. */
    }
    window.dispatchEvent(new Event("famvault-theme-change"));
  };
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </ThemeContext.Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
let fallbackTheme: Theme | undefined;
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("famvault-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Use the browser preference when storage is unavailable. */
  }
  return (
    fallbackTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")
  );
}
function subscribeTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("famvault-theme-change", listener);
  const preference = window.matchMedia("(prefers-color-scheme: dark)");
  preference.addEventListener("change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("famvault-theme-change", listener);
    preference.removeEventListener("change", listener);
  };
}

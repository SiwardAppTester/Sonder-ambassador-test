"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "dark";

/**
 * Owns the active color theme. The `.dark` / `.light` class on <html> is
 * applied pre-hydration by an inline script in the root layout (see
 * `app/layout.tsx`) to avoid a flash. This provider just keeps the
 * React-state in sync and persists changes to localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
  });

  const apply = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(next);
  }, []);

  // Re-sync on mount in case the inline script's value diverged from
  // whatever we initialized state with (it shouldn't, but cheap safety).
  useEffect(() => {
    apply(theme);
  }, [apply, theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      window.localStorage.setItem(STORAGE_KEY, next);
      setThemeState(next);
    },
    [],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

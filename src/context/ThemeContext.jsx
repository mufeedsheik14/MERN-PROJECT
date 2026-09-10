import { createContext, useContext, useState, useEffect, useMemo } from "react";

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  // useState: read initial theme from localStorage or system preference
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem("rr_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // useEffect: whenever theme changes, reflect it on <html data-theme="">
  // and persist the choice so it survives a refresh.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("rr_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  // useMemo: avoid re-creating the context value object (and re-rendering
  // every consumer) on every render unless theme actually changes.
  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

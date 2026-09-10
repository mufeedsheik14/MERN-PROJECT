import { useState, useEffect } from "react";
/**
 * useLocalStorage - a small custom hook that behaves like useState but
 * persists the value to localStorage and re-hydrates from it on load.
 * Demonstrates composing useState + useEffect into a reusable hook.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write errors (private mode, quota, etc.)
    }
  }, [key, value]);
  return [value, setValue];
}

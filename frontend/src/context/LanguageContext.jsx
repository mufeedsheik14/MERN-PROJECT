import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { translations } from "../i18n/translations";

const LanguageContext = createContext(undefined);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => window.localStorage.getItem("rr_lang") || "en");

  useEffect(() => {
    window.localStorage.setItem("rr_lang", lang);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  // useCallback: stable translation function reference so components that
  // receive `t` as a prop don't re-render needlessly.
  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations.en;
      let str = dict[key] ?? translations.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, v);
        });
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

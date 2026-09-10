import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="container">
        © {new Date().getFullYear()} {t("appName")} · {t("footer_text")}
      </div>
    </footer>
  );
}

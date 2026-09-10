import { useLanguage } from "../context/LanguageContext";

const STATUS_KEY = { A: "available", B: "booked", M: "maintenance", I: "inactive" };

export default function StatusChip({ status }) {
  const { t } = useLanguage();
  return <span className={`status-chip status-${status}`}>{t(STATUS_KEY[status] || "available")}</span>;
}

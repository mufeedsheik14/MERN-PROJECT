import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        animation: "fadeIn 0.18s ease-out",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "28px",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "var(--shadow)",
          transform: "scale(1)",
          animation: "scaleIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
          {title || t("confirm_title")}
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "24px" }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel || t("cancel")}
          </button>
          <button
            type="button"
            className={isDanger ? "btn-danger" : "btn btn-primary"}
            style={isDanger ? { borderRadius: "999px", padding: "10px 20px" } : {}}
            onClick={() => {
              onConfirm?.();
              onCancel?.();
            }}
          >
            {confirmLabel || t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useInteraction } from "../context/InteractionContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useInteraction();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span className="toast-icon">
            {t.icon ? t.icon : t.type === "success" ? "✅" : t.type === "warning" ? "⚠️" : "ℹ️"}
          </span>
          <span className="toast-message">{t.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(t.id)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

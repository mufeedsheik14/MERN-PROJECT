import { useEffect, useCallback } from "react";

/**
 * DocumentViewer — modal viewer for PDF and image documents.
 *
 * Props:
 *   doc        — the document record ({ fileName, dataUrl, mimeType, isSample, ... })
 *   onClose    — callback to close the modal
 */
export default function DocumentViewer({ doc, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!doc) return null;

  const isPdf = doc.mimeType === "application/pdf" || doc.fileName?.toLowerCase().endsWith(".pdf");
  const isImage =
    doc.mimeType?.startsWith("image/") ||
    [".jpg", ".jpeg", ".png"].some((ext) => doc.fileName?.toLowerCase().endsWith(ext));

  const renderContent = () => {
    // Sample documents — no real file stored
    if (doc.isSample || !doc.dataUrl) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 32px",
            gap: "16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem" }}>📄</div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--text)",
            }}
          >
            Sample Document
          </div>
          <div
            style={{
              maxWidth: "400px",
              color: "var(--text-muted)",
              fontSize: "0.92rem",
              lineHeight: "1.6",
            }}
          >
            <strong style={{ color: "var(--text)" }}>{doc.fileName}</strong>
            <br />
            <br />
            This is a pre-loaded sample document record for demonstration purposes.
            In a production environment, the actual document file would be securely
            retrieved from the document storage service and displayed here.
          </div>
          <div
            style={{
              marginTop: "8px",
              padding: "8px 20px",
              background: "var(--accent-subtle)",
              border: "1px solid var(--accent)",
              borderRadius: "999px",
              color: "var(--accent)",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            📋 Demo Record
          </div>
        </div>
      );
    }

    // Real uploaded PDF
    if (isPdf) {
      return (
        <iframe
          src={doc.dataUrl}
          title={doc.fileName}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
        />
      );
    }

    // Real uploaded image
    if (isImage) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            height: "100%",
            background: "var(--bg-inset)",
          }}
        >
          <img
            src={doc.dataUrl}
            alt={doc.fileName}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-md)",
            }}
          />
        </div>
      );
    }

    // Unknown type fallback
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          gap: "12px",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <div>Cannot preview this file type.</div>
      </div>
    );
  };

  return (
    /* Overlay */
    <div
      className="doc-viewer-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing: ${doc.fileName}`}
    >
      {/* Modal */}
      <div className="doc-viewer-modal">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-inset)",
            borderRadius: "var(--radius) var(--radius) 0 0",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "1.3rem" }}>{isPdf ? "📄" : "🖼️"}</span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "420px",
                }}
                title={doc.fileName}
              >
                {doc.fileName}
              </div>
              {doc.isSample && (
                <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
                  SAMPLE RECORD
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close document viewer"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text)",
              fontSize: "1.1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-inset)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

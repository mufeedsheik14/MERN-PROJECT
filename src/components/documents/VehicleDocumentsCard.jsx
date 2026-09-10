import { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDocuments } from "../../context/DocumentContext";
import { getEffectiveDocStatus, formatDocDate } from "../../data/vehicleDocuments";
import DocumentViewer from "./DocumentViewer";

/**
 * VehicleDocumentsCard — read-only card shown on VehicleDetail.
 * RC and Insurance certificates are only viewable after login.
 * Customers can View and Download documents once logged in.
 *
 * Props:
 *   vehicleId — int_Vehicle_Id of the vehicle
 */
export default function VehicleDocumentsCard({ vehicleId }) {
  const { user } = useAuth();
  const location = useLocation();
  const { getDocumentsForVehicle } = useDocuments();
  const [viewDoc, setViewDoc] = useState(null); // doc to show in viewer

  const { RC, Insurance } = getDocumentsForVehicle(vehicleId);

  const handleDownload = useCallback((doc) => {
    if (!doc) return;

    if (!doc.dataUrl) {
      // Sample document — generate a descriptive placeholder text file
      const content = [
        "ROADREADY VEHICLE RENTAL MANAGEMENT SYSTEM",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "SAMPLE DOCUMENT RECORD",
        "",
        `Document Type : ${doc.documentType === "RC" ? "Registration Certificate" : "Insurance Certificate"}`,
        `File Name     : ${doc.fileName}`,
        `Upload Date   : ${formatDocDate(doc.uploadDate)}`,
        doc.expiryDate ? `Expiry Date   : ${formatDocDate(doc.expiryDate)}` : "",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "NOTE: This is a pre-loaded sample record for demonstration.",
        "In production, the actual document would be downloaded here.",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ]
        .filter((l) => l !== undefined)
        .join("\n");

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Real uploaded file — download using the stored base64 dataUrl
    const a = document.createElement("a");
    a.href = doc.dataUrl;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const renderDocRow = (doc, type) => {
    const isRC = type === "RC";
    const icon = isRC ? "📄" : "🛡️";
    const label = isRC ? "Registration Certificate" : "Insurance Certificate";
    const effectiveStatus = getEffectiveDocStatus(doc);

    const statusConfig = {
      uploaded: { label: "Available", color: "var(--signal-green)", bg: "var(--signal-green-bg)", icon: "✓" },
      expired: { label: "Expired", color: "var(--signal-red)", bg: "var(--signal-red-bg)", icon: "✕" },
      missing: { label: "Missing", color: "var(--signal-amber)", bg: "var(--signal-amber-bg)", icon: "!" },
    };

    const cfg = statusConfig[effectiveStatus] || statusConfig.missing;
    const available = !!doc && effectiveStatus !== "missing";

    return (
      <div className="doc-item" key={type}>
        {/* Left: icon + info */}
        <div style={{ display: "flex", gap: "12px", flex: 1, alignItems: "flex-start" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-sm)",
              background: available ? "var(--signal-green-bg)" : effectiveStatus === "expired" ? "var(--signal-red-bg)" : "var(--signal-amber-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>{label}</div>

            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                className="doc-status-badge"
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}33`,
                }}
              >
                {cfg.icon} {cfg.label}
              </span>

              {doc && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Uploaded {formatDocDate(doc.uploadDate)}
                </span>
              )}
            </div>

            {/* Insurance expiry */}
            {!isRC && doc?.expiryDate && (
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "0.82rem",
                  color: effectiveStatus === "expired" ? "var(--signal-red)" : "var(--text-muted)",
                  fontWeight: effectiveStatus === "expired" ? 600 : 400,
                }}
              >
                {effectiveStatus === "expired" ? "⚠️ Expired on " : "Valid until "}
                {formatDocDate(doc.expiryDate)}
              </div>
            )}

            {/* File name (subtle) */}
            {doc && (
              <div
                style={{
                  marginTop: "2px",
                  fontSize: "0.72rem",
                  color: "var(--text-faint)",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "260px",
                }}
                title={doc.fileName}
              >
                {doc.fileName}
              </div>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          {available ? (
            <>
              <button
                type="button"
                id={`view-doc-${vehicleId}-${type}`}
                className="doc-action-btn"
                onClick={() => setViewDoc(doc)}
                title={`View ${label}`}
              >
                👁 View
              </button>
              <button
                type="button"
                id={`download-doc-${vehicleId}-${type}`}
                className="doc-action-btn doc-action-btn-download"
                onClick={() => handleDownload(doc)}
                title={`Download ${label}`}
              >
                ⬇ Download
              </button>
            </>
          ) : (
            <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", fontStyle: "italic" }}>
              Not available
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="doc-card" style={{ marginTop: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-inset)",
            borderRadius: "var(--radius) var(--radius) 0 0",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>📑</span>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "1.05rem",
              fontWeight: 700,
            }}
          >
            Vehicle Documents (RC &amp; Insurance)
          </h3>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.72rem",
              color: "var(--text-faint)",
              fontWeight: 600,
            }}
          >
            🔒 Members Only
          </span>
        </div>

        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: "10px" }}>🔒</div>
          <h4 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Login Required to View Documents</h4>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.88rem",
              maxWidth: "440px",
              margin: "0 auto 20px",
              lineHeight: "1.5",
            }}
          >
            The Registration Certificate (RC) and active Insurance policy are official records. Please log in to inspect or download verified vehicle certificates.
          </p>
          <Link
            to="/login"
            state={{ from: location }}
            className="btn btn-primary"
            style={{ display: "inline-block", padding: "10px 24px", fontSize: "0.88rem" }}
          >
            Login to View Documents →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="doc-card" style={{ marginTop: "28px" }}>
        {/* Card header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-inset)",
            borderRadius: "var(--radius) var(--radius) 0 0",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>📑</span>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "1.05rem",
              fontWeight: 700,
            }}
          >
            Vehicle Documents
          </h3>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.72rem",
              color: "var(--text-faint)",
              fontWeight: 500,
              fontStyle: "italic",
            }}
          >
            Read-only
          </span>
        </div>

        {/* Document rows */}
        <div style={{ padding: "4px 0" }}>
          {renderDocRow(RC, "RC")}
          <div style={{ height: "1px", background: "var(--border)", margin: "0 20px" }} />
          {renderDocRow(Insurance, "Insurance")}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDoc && <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </>
  );
}

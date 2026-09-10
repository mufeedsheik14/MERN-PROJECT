import { useState, useRef, useCallback } from "react";
import { useFleet } from "../../context/FleetContext";
import { useDocuments } from "../../context/DocumentContext";
import { getEffectiveDocStatus, formatDocDate } from "../../data/vehicleDocuments";
import { getBrandName, getBranchName } from "../../data/mockData";
import DocumentViewer from "./DocumentViewer";

/**
 * StaffDocumentManager — staff-facing document upload and management panel.
 * Embedded as a tab in StaffDashboard.
 *
 * Staff can:
 *  - Select any vehicle
 *  - Upload or replace RC and Insurance documents
 *  - Set/update insurance expiry date
 *  - View and download uploaded documents
 *
 * Customers NEVER see this component.
 */
export default function StaffDocumentManager() {
  const { vehicles } = useFleet();
  const { getDocumentsForVehicle, uploadDocument, ACCEPTED_EXTENSIONS } = useDocuments();

  const [selectedVehicleId, setSelectedVehicleId] = useState(
    vehicles.length > 0 ? vehicles[0].int_Vehicle_Id : null
  );
  const [viewDoc, setViewDoc] = useState(null);

  // Per-document-type upload state
  const [rcState, setRcState] = useState({ file: null, loading: false, error: null, success: null });
  const [insState, setInsState] = useState({
    file: null,
    loading: false,
    error: null,
    success: null,
    expiryDate: "",
    expiryError: null,
  });

  const rcFileRef = useRef(null);
  const insFileRef = useRef(null);

  const vehicle = vehicles.find((v) => v.int_Vehicle_Id === selectedVehicleId);
  const { RC: rcDoc, Insurance: insDoc } = selectedVehicleId
    ? getDocumentsForVehicle(selectedVehicleId)
    : { RC: null, Insurance: null };

  const rcStatus = getEffectiveDocStatus(rcDoc);
  const insStatus = getEffectiveDocStatus(insDoc);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const clearRcState = () => {
    setRcState({ file: null, loading: false, error: null, success: null });
    if (rcFileRef.current) rcFileRef.current.value = "";
  };

  const clearInsState = () => {
    setInsState({ file: null, loading: false, error: null, success: null, expiryDate: "", expiryError: null });
    if (insFileRef.current) insFileRef.current.value = "";
  };

  const handleVehicleChange = (e) => {
    setSelectedVehicleId(Number(e.target.value));
    clearRcState();
    clearInsState();
  };

  // ─── RC Upload ─────────────────────────────────────────────────────────────

  const handleRcFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setRcState((prev) => ({ ...prev, file, error: null, success: null }));
  };

  const handleRcUpload = useCallback(async () => {
    if (!rcState.file || !selectedVehicleId) return;
    setRcState((prev) => ({ ...prev, loading: true, error: null, success: null }));
    try {
      await uploadDocument(selectedVehicleId, "RC", rcState.file, null);
      setRcState({ file: null, loading: false, error: null, success: "Registration Certificate uploaded successfully." });
      if (rcFileRef.current) rcFileRef.current.value = "";
    } catch (err) {
      setRcState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [rcState.file, selectedVehicleId, uploadDocument]);

  // ─── Insurance Upload ──────────────────────────────────────────────────────

  const handleInsFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setInsState((prev) => ({ ...prev, file, error: null, success: null }));
  };

  const handleInsUpload = useCallback(async () => {
    if (!insState.file || !selectedVehicleId) return;

    // Validate expiry date
    if (!insState.expiryDate) {
      setInsState((prev) => ({ ...prev, expiryError: "Insurance expiry date is required." }));
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(insState.expiryDate) <= today) {
      setInsState((prev) => ({ ...prev, expiryError: "Expiry date must be in the future." }));
      return;
    }

    setInsState((prev) => ({ ...prev, loading: true, error: null, success: null, expiryError: null }));
    try {
      await uploadDocument(selectedVehicleId, "Insurance", insState.file, insState.expiryDate);
      setInsState({
        file: null,
        loading: false,
        error: null,
        success: "Insurance Certificate uploaded successfully.",
        expiryDate: "",
        expiryError: null,
      });
      if (insFileRef.current) insFileRef.current.value = "";
    } catch (err) {
      setInsState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [insState.file, insState.expiryDate, selectedVehicleId, uploadDocument]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const statusConfig = {
    uploaded: { label: "Uploaded", color: "var(--signal-green)", bg: "var(--signal-green-bg)", icon: "✓" },
    expired: { label: "Expired", color: "var(--signal-red)", bg: "var(--signal-red-bg)", icon: "✕" },
    missing: { label: "Missing", color: "var(--signal-amber)", bg: "var(--signal-amber-bg)", icon: "!" },
  };

  const renderCurrentDoc = (doc, status, type, onView) => {
    const cfg = statusConfig[status] || statusConfig.missing;
    const isRC = type === "RC";
    const label = isRC ? "Registration Certificate" : "Insurance Certificate";

    return (
      <div
        style={{
          marginTop: "12px",
          padding: "12px 14px",
          background: "var(--bg-inset)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px", fontWeight: 600 }}>
          Current {label}
        </div>

        {doc ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 700,
                background: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}33`,
              }}
            >
              {cfg.icon} {cfg.label}
            </span>

            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.82rem",
                color: "var(--text)",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "240px",
                flex: 1,
              }}
              title={doc.fileName}
            >
              {doc.fileName}
            </span>

            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {formatDocDate(doc.uploadDate)}
              </span>
              {!isRC && doc.expiryDate && (
                <span style={{ fontSize: "0.72rem", color: status === "expired" ? "var(--signal-red)" : "var(--text-muted)", fontWeight: status === "expired" ? 700 : 400 }}>
                  · Exp: {formatDocDate(doc.expiryDate)}
                </span>
              )}
              {doc.isSample && (
                <span style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.04em", padding: "1px 6px", background: "var(--accent-subtle)", borderRadius: "4px" }}>
                  SAMPLE
                </span>
              )}
              <button
                type="button"
                id={`staff-view-doc-${selectedVehicleId}-${type}`}
                className="doc-action-btn"
                style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                onClick={() => onView(doc)}
              >
                👁 View
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--signal-amber)", fontSize: "0.85rem", fontWeight: 600 }}>
            ⚠ No document on file — please upload.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Vehicle Selector */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "20px 24px",
          marginBottom: "24px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <label
            htmlFor="staff-doc-vehicle-select"
            style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            Select Vehicle
          </label>
        </div>
        <select
          id="staff-doc-vehicle-select"
          value={selectedVehicleId || ""}
          onChange={handleVehicleChange}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text)",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          {vehicles.map((v) => (
            <option key={v.int_Vehicle_Id} value={v.int_Vehicle_Id}>
              {getBrandName(v.int_Brand_Id)} {v.txt_Model_Name} — {v.txt_Registration_Number} ({getBranchName(v.int_Branch_Id)})
            </option>
          ))}
        </select>

        {vehicle && (
          <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            📍 {getBranchName(vehicle.int_Branch_Id)} · #{vehicle.txt_Registration_Number}
            <span
              style={{
                marginLeft: "10px",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "0.7rem",
                fontWeight: 700,
                background: vehicle.txt_Vehicle_Status === "A" ? "var(--signal-green-bg)" : vehicle.txt_Vehicle_Status === "M" ? "var(--signal-amber-bg)" : "var(--signal-red-bg)",
                color: vehicle.txt_Vehicle_Status === "A" ? "var(--signal-green)" : vehicle.txt_Vehicle_Status === "M" ? "var(--signal-amber)" : "var(--signal-red)",
              }}
            >
              {vehicle.txt_Vehicle_Status === "A" ? "Available" : vehicle.txt_Vehicle_Status === "M" ? "Maintenance" : "Inactive"}
            </span>
          </div>
        )}
      </div>

      {selectedVehicleId && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* ── RC Section ── */}
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            {/* Section header */}
            <div
              style={{
                padding: "14px 20px",
                background: "var(--bg-inset)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>📄</span>
              <div>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1rem" }}>
                  Registration Certificate (RC)
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Valid vehicle registration proof · PDF, JPG, JPEG, PNG · Max 5 MB
                </div>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Current doc status */}
              {renderCurrentDoc(rcDoc, rcStatus, "RC", setViewDoc)}

              {/* Upload controls */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {rcDoc ? "Replace Document" : "Upload Document"}
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <label className="doc-file-label" htmlFor="staff-rc-file">
                      <span style={{ fontSize: "1rem" }}>📎</span>
                      {rcState.file ? rcState.file.name : "Choose RC file…"}
                    </label>
                    <input
                      id="staff-rc-file"
                      type="file"
                      accept={ACCEPTED_EXTENSIONS.join(",")}
                      ref={rcFileRef}
                      onChange={handleRcFileChange}
                      style={{ display: "none" }}
                    />
                    {rcState.file && (
                      <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {(rcState.file.size / 1024).toFixed(0)} KB · {rcState.file.type || "unknown type"}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    id={`staff-rc-upload-btn-${selectedVehicleId}`}
                    className="btn btn-primary"
                    style={{ padding: "10px 20px", fontSize: "0.88rem", whiteSpace: "nowrap" }}
                    onClick={handleRcUpload}
                    disabled={!rcState.file || rcState.loading}
                  >
                    {rcState.loading ? "⏳ Uploading…" : rcDoc ? "🔄 Replace" : "⬆ Upload"}
                  </button>
                </div>

                {/* Messages */}
                {rcState.error && (
                  <div className="alert alert-error" style={{ marginTop: "10px", marginBottom: 0 }}>
                    ⚠ {rcState.error}
                  </div>
                )}
                {rcState.success && (
                  <div className="alert alert-success" style={{ marginTop: "10px", marginBottom: 0 }}>
                    ✓ {rcState.success}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Insurance Section ── */}
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              boxShadow: "var(--shadow)",
            }}
          >
            {/* Section header */}
            <div
              style={{
                padding: "14px 20px",
                background: "var(--bg-inset)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1rem" }}>
                  Insurance Certificate
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Comprehensive vehicle insurance · PDF, JPG, JPEG, PNG · Max 5 MB
                </div>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Current doc status */}
              {renderCurrentDoc(insDoc, insStatus, "Insurance", setViewDoc)}

              {/* Upload controls */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {insDoc ? "Replace Document" : "Upload Document"}
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <label className="doc-file-label" htmlFor="staff-ins-file">
                      <span style={{ fontSize: "1rem" }}>📎</span>
                      {insState.file ? insState.file.name : "Choose Insurance file…"}
                    </label>
                    <input
                      id="staff-ins-file"
                      type="file"
                      accept={ACCEPTED_EXTENSIONS.join(",")}
                      ref={insFileRef}
                      onChange={handleInsFileChange}
                      style={{ display: "none" }}
                    />
                    {insState.file && (
                      <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {(insState.file.size / 1024).toFixed(0)} KB · {insState.file.type || "unknown type"}
                      </div>
                    )}
                  </div>

                  {/* Expiry date */}
                  <div style={{ minWidth: "170px" }}>
                    <label
                      htmlFor="staff-ins-expiry"
                      style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}
                    >
                      Expiry Date <span style={{ color: "var(--signal-red)" }}>*</span>
                    </label>
                    <input
                      id="staff-ins-expiry"
                      type="date"
                      value={insState.expiryDate}
                      onChange={(e) =>
                        setInsState((prev) => ({ ...prev, expiryDate: e.target.value, expiryError: null }))
                      }
                      min={new Date().toISOString().split("T")[0]}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "var(--bg-inset)",
                        border: `1px solid ${insState.expiryError ? "var(--signal-red)" : "var(--border)"}`,
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text)",
                        fontSize: "0.88rem",
                      }}
                    />
                    {insState.expiryError && (
                      <div style={{ color: "var(--signal-red)", fontSize: "0.72rem", marginTop: "4px" }}>
                        {insState.expiryError}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    id={`staff-ins-upload-btn-${selectedVehicleId}`}
                    className="btn btn-primary"
                    style={{ padding: "10px 20px", fontSize: "0.88rem", whiteSpace: "nowrap" }}
                    onClick={handleInsUpload}
                    disabled={!insState.file || insState.loading}
                  >
                    {insState.loading ? "⏳ Uploading…" : insDoc ? "🔄 Replace" : "⬆ Upload"}
                  </button>
                </div>

                {/* Messages */}
                {insState.error && (
                  <div className="alert alert-error" style={{ marginTop: "10px", marginBottom: 0 }}>
                    ⚠ {insState.error}
                  </div>
                )}
                {insState.success && (
                  <div className="alert alert-success" style={{ marginTop: "10px", marginBottom: 0 }}>
                    ✓ {insState.success}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Note ── */}
          <div
            style={{
              padding: "12px 16px",
              background: "var(--accent-subtle)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
            }}
          >
            <strong style={{ color: "var(--accent)" }}>ℹ Note:</strong> Uploaded documents are stored locally in this
            browser session for demo purposes. In production, files will be securely uploaded to the document
            storage service. Maximum file size is 5 MB. Accepted formats: PDF, JPG, JPEG, PNG.
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  );
}

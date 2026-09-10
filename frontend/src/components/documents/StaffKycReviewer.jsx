import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useCustomerDocuments } from "../../context/CustomerDocumentContext";
import { getKycStatusConfig, formatKycDate, KYC_DOC_TYPES } from "../../data/customerDocuments";
import DocumentViewer from "./DocumentViewer";

/**
 * StaffKycReviewer — staff-facing panel to review, verify, or reject customer KYC documents.
 *
 * SECURITY:
 *   - Only rendered inside StaffDashboard (role: "staff") or AdminDashboard (role: "admin")
 *   - getAllCustomerDocs() is only called here (staff/admin context)
 *   - updateDocStatus() is a privileged action enforced by role at the UI layer
 *
 * Staff can:
 *   - View all customers' KYC statuses at a glance
 *   - Open a document in the viewer modal
 *   - Mark a document as Verified
 *   - Reject a document with a reason
 *   - Request re-upload (set status back to pending)
 */
export default function StaffKycReviewer() {
  const { users } = useAuth();
  const { getAllCustomerDocs, updateDocStatus } = useCustomerDocuments();

  const [viewDoc, setViewDoc] = useState(null);
  const [rejectState, setRejectState] = useState(null); // { customerId, docType }
  const [rejectReason, setRejectReason] = useState("");
  const [actionFeedback, setActionFeedback] = useState(null); // { customerId, docType, message, ok }
  const [filterStatus, setFilterStatus] = useState("all"); // all | pending | verified | rejected | not_uploaded
  const [searchQuery, setSearchQuery] = useState("");

  const allDocs = getAllCustomerDocs();

  // Build a merged list enriched with customerName from users if available
  const enrichedDocs = useMemo(() => {
    return allDocs.map((record) => {
      const userRecord = users?.find(
        (u) => u.username.toLowerCase() === record.customerId.toLowerCase()
      );
      return {
        ...record,
        customerName: userRecord?.name || record.customerName || record.customerId,
      };
    });
  }, [allDocs, users]);

  // Filter by status and search
  const filteredDocs = useMemo(() => {
    let results = enrichedDocs;
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      results = results.filter(
        (r) =>
          r.customerName.toLowerCase().includes(query) ||
          r.customerId.toLowerCase().includes(query)
      );
    }
    if (filterStatus !== "all") {
      results = results.filter((r) =>
        Object.values(r.documents).some((d) => d.status === filterStatus)
      );
    }
    return results;
  }, [enrichedDocs, filterStatus, searchQuery]);

  // Count how many pending docs exist
  const pendingCount = useMemo(() => {
    return allDocs.reduce((count, r) => {
      return (
        count +
        Object.values(r.documents).filter((d) => d.status === "pending").length
      );
    }, 0);
  }, [allDocs]);

  const showFeedback = (customerId, docType, message, ok) => {
    setActionFeedback({ customerId, docType, message, ok });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleVerify = (customerId, docType) => {
    updateDocStatus(customerId, docType, "verified", null);
    showFeedback(customerId, docType, "Document marked as Verified.", true);
    if (rejectState?.customerId === customerId && rejectState?.docType === docType) {
      setRejectState(null);
      setRejectReason("");
    }
  };

  const handleRequestReject = (customerId, docType) => {
    setRejectState({ customerId, docType });
    setRejectReason("");
  };

  const handleConfirmReject = (customerId, docType) => {
    if (!rejectReason.trim()) return;
    updateDocStatus(customerId, docType, "rejected", rejectReason.trim());
    showFeedback(customerId, docType, "Document rejected with reason.", false);
    setRejectState(null);
    setRejectReason("");
  };

  const handleReRequestUpload = (customerId, docType) => {
    updateDocStatus(customerId, docType, "pending", null);
    showFeedback(customerId, docType, "Document flagged for re-upload.", true);
  };

  const statusFilters = [
    { value: "all", label: "All Customers" },
    { value: "pending", label: "⏳ Pending" },
    { value: "verified", label: "✓ Verified" },
    { value: "rejected", label: "✕ Rejected" },
    { value: "not_uploaded", label: "— Not Uploaded" },
  ];

  const renderDocSection = (record, docType) => {
    const meta = KYC_DOC_TYPES[docType];
    const doc = record.documents[docType] || { status: "not_uploaded" };
    const statusCfg = getKycStatusConfig(doc.status);
    const isRejectOpen =
      rejectState?.customerId === record.customerId && rejectState?.docType === docType;
    const isFeedback =
      actionFeedback?.customerId === record.customerId &&
      actionFeedback?.docType === docType;
    const isUploaded = doc.status !== "not_uploaded" && doc.fileName;

    const isDL = docType === "drivingLicense";
    const docNumber = isDL
      ? `DL-04${record.customerId.slice(0, 4).toUpperCase()}7892`
      : `•••• •••• ${String(record.customerId.length * 137 + 4921).slice(-4)}`;

    return (
      <div
        key={docType}
        className={`kyc-document-card ${isDL ? "dl-card" : "aadhaar-card"} ${!isUploaded ? "unuploaded" : ""}`}
      >
        {/* Document Header Band */}
        <div className="doc-card-header">
          {isDL ? (
            <div className="doc-card-title-wrap">
              <div className="doc-authority-emblem">🏛️</div>
              <div>
                <div className="doc-card-national">UNION OF INDIA</div>
                <div className="doc-card-title">DRIVING LICENCE (FORM 7)</div>
              </div>
            </div>
          ) : (
            <div className="doc-card-title-wrap">
              <div className="doc-authority-emblem">☸️</div>
              <div>
                <div className="doc-card-national">भारत सरकार · GOVT OF INDIA</div>
                <div className="doc-card-title">UNIQUE IDENTIFICATION (AADHAAR)</div>
              </div>
            </div>
          )}

          <div
            className="doc-card-status-pill"
            style={{
              background: statusCfg.bg,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.borderColor}44`,
            }}
          >
            {statusCfg.icon} {statusCfg.label}
          </div>
        </div>

        {/* Aadhaar Tricolor Stripe */}
        {!isDL && <div className="aadhaar-tricolor-stripe" />}

        {/* Card Body with Chip & Identity Details */}
        <div className="doc-card-body">
          {/* Smart Chip / Hologram Visual */}
          <div className="doc-card-visual-col">
            {isDL ? (
              <div className="smart-card-chip" title="Smart Card Microchip">
                <div className="chip-line chip-line-h" />
                <div className="chip-line chip-line-v" />
                <div className="chip-core" />
              </div>
            ) : (
              <div className="aadhaar-qr-seal" title="UIDAI Secure Hologram & QR">
                <div className="qr-sim-box">
                  <span style={{ fontSize: "1.2rem" }}>🔲</span>
                </div>
                <span className="uidai-sub-tag">UIDAI</span>
              </div>
            )}
            <div className="doc-icon-preview">{meta.icon}</div>
          </div>

          {/* Details Column */}
          <div className="doc-card-info-col">
            <div className="doc-field">
              <span className="doc-field-label">NAME OF HOLDER</span>
              <span className="doc-field-val doc-name-val">{record.customerName}</span>
            </div>

            <div className="doc-grid-fields">
              <div className="doc-field">
                <span className="doc-field-label">{isDL ? "LICENCE NO." : "AADHAAR NO."}</span>
                <span className="doc-field-val doc-number-val">{docNumber}</span>
              </div>
              <div className="doc-field">
                <span className="doc-field-label">{isDL ? "CLASS" : "VALIDITY"}</span>
                <span className="doc-field-val">{isDL ? "LMV / MCWG" : "PERMANENT / UID"}</span>
              </div>
            </div>

            {/* Attached File Bar */}
            <div className="doc-attachment-strip">
              {isUploaded ? (
                <>
                  <span className="doc-attachment-icon">📎</span>
                  <span className="doc-attachment-name" title={doc.fileName}>{doc.fileName}</span>
                  {doc.uploadDate && (
                    <span className="doc-attachment-date">{formatKycDate(doc.uploadDate)}</span>
                  )}
                </>
              ) : (
                <span className="doc-not-uploaded-text">
                  ⚠️ No file document submitted yet by customer
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rejection Alert Box */}
        {doc.status === "rejected" && doc.rejectionReason && (
          <div className="doc-rejection-box">
            <strong>✕ Rejection Reason:</strong> {doc.rejectionReason}
          </div>
        )}

        {/* Action Feedback Message */}
        {isFeedback && (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              background: actionFeedback.ok ? "var(--signal-green-bg)" : "var(--signal-red-bg)",
              color: actionFeedback.ok ? "var(--signal-green)" : "var(--signal-red)",
              border: `1px solid ${actionFeedback.ok ? "var(--signal-green)33" : "var(--signal-red)33"}`,
              fontSize: "0.8rem",
              fontWeight: 600,
              margin: "8px 12px 0",
            }}
          >
            {actionFeedback.ok ? "✓" : "✕"} {actionFeedback.message}
          </div>
        )}

        {/* Rejection Prompt Form */}
        {isRejectOpen && (
          <div className="doc-reject-form">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State reason for rejection (e.g. blurred photo, expired document)..."
              rows={2}
            />
            <div className="doc-reject-actions">
              <button
                type="button"
                className="btn-confirm-reject"
                onClick={() => handleConfirmReject(record.customerId, docType)}
                disabled={!rejectReason.trim()}
              >
                Confirm Reject
              </button>
              <button
                type="button"
                className="btn-cancel-reject"
                onClick={() => { setRejectState(null); setRejectReason(""); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Document Action Buttons Toolbar */}
        {doc.status !== "not_uploaded" && (
          <div className="doc-card-actions">
            {doc.fileName && (
              <button
                type="button"
                id={`staff-kyc-view-${record.customerId}-${docType}`}
                className="doc-action-btn view-btn"
                onClick={() =>
                  setViewDoc({
                    fileName: doc.fileName,
                    dataUrl: doc.dataUrl,
                    mimeType: doc.fileName?.toLowerCase().endsWith(".pdf")
                      ? "application/pdf"
                      : "image/jpeg",
                    isSample: doc.isSample,
                  })
                }
              >
                👁 View Document
              </button>
            )}

            {doc.status !== "verified" && (
              <button
                type="button"
                id={`staff-kyc-verify-${record.customerId}-${docType}`}
                className="doc-action-btn verify-btn"
                onClick={() => handleVerify(record.customerId, docType)}
              >
                ✓ Verify
              </button>
            )}

            {doc.status !== "rejected" && !isRejectOpen && (
              <button
                type="button"
                id={`staff-kyc-reject-${record.customerId}-${docType}`}
                className="doc-action-btn reject-btn"
                onClick={() => handleRequestReject(record.customerId, docType)}
              >
                ✕ Reject
              </button>
            )}

            {(doc.status === "verified" || doc.status === "rejected") && (
              <button
                type="button"
                id={`staff-kyc-reupload-${record.customerId}-${docType}`}
                className="doc-action-btn reupload-btn"
                onClick={() => handleReRequestUpload(record.customerId, docType)}
              >
                ↺ Re-request
              </button>
            )}
          </div>
        )}

        {/* Aadhaar Tagline Footer */}
        {!isDL && (
          <div className="aadhaar-card-footer">
            <span>मेरा आधार, मेरी पहचान</span>
            <span>UIDAI OFFICIAL STANDARD</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.4rem" }}>Customer KYC Documents</h2>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.88rem" }}>
              Review, verify, or reject customer Driving License and Aadhaar submissions.
            </p>
          </div>
          {pendingCount > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "var(--signal-amber-bg)",
                color: "var(--signal-amber)",
                border: "1px solid var(--signal-amber)44",
                borderRadius: "999px",
                padding: "4px 14px",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              ⏳ {pendingCount} Pending Review
            </span>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          placeholder="Search customer name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: "var(--bg-inset)",
            color: "var(--text)",
            fontSize: "0.88rem",
            maxWidth: "280px",
            width: "100%",
          }}
        />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterStatus(f.value)}
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                border: `1px solid ${filterStatus === f.value ? "var(--accent)" : "var(--border)"}`,
                background: filterStatus === f.value ? "var(--accent-subtle)" : "var(--bg-elevated)",
                color: filterStatus === f.value ? "var(--accent)" : "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: filterStatus === f.value ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List */}
      {filteredDocs.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</div>
          <p style={{ color: "var(--text-muted)" }}>
            {searchQuery || filterStatus !== "all"
              ? "No customers match your filter."
              : "No customer KYC records found."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredDocs.map((record) => (
            <div
              key={record.customerId}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
              }}
            >
              {/* Customer Header */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-inset)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    flexShrink: 0,
                  }}
                >
                  {record.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {record.customerName}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
                    @{record.customerId}
                  </div>
                </div>
                {/* Quick summary badges */}
                <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                  {Object.entries(record.documents).map(([type, doc]) => {
                    const cfg = getKycStatusConfig(doc.status);
                    return (
                      <span
                        key={type}
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.borderColor}33`,
                          fontWeight: 600,
                        }}
                      >
                        {KYC_DOC_TYPES[type]?.icon} {cfg.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Document Sections */}
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {renderDocSection(record, "drivingLicense")}
                {renderDocSection(record, "aadhaar")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  );
}

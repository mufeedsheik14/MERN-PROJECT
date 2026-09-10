import { useState, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useCustomerDocuments } from "../../context/CustomerDocumentContext";
import { getKycStatusConfig, formatKycDate, KYC_DOC_TYPES } from "../../data/customerDocuments";
import DocumentViewer from "./DocumentViewer";

/**
 * CustomerDocumentsCard — shown on the customer's Profile page.
 *
 * Customers can:
 *   - See status of their Driving License and Aadhaar Card
 *   - Upload or replace a document
 *   - View a previously uploaded document
 *   - See a rejection reason if a document was rejected
 *
 * SECURITY:
 *   - Only shown to authenticated customers (parent ProtectedRoute enforces login)
 *   - getCustomerDocs is called with user.username — customers only see their own data
 *   - The component never renders for non-customer roles
 */
export default function CustomerDocumentsCard() {
  const { user } = useAuth();
  const { getCustomerDocs, uploadCustomerDoc, ACCEPTED_EXTENSIONS } = useCustomerDocuments();

  const [viewDoc, setViewDoc] = useState(null);
  const [uploadState, setUploadState] = useState({
    drivingLicense: { loading: false, error: null, success: null },
    aadhaar: { loading: false, error: null, success: null },
  });

  const dlFileRef = useRef(null);
  const aadhaarFileRef = useRef(null);

  if (!user || user.role !== "customer") return null;

  // Fetch this customer's own documents only
  const record = getCustomerDocs(user.username);
  const docs = record?.documents || {};

  const fileRefMap = {
    drivingLicense: dlFileRef,
    aadhaar: aadhaarFileRef,
  };

  const handleFileSelect = useCallback(
    async (docType, file) => {
      if (!file) return;

      setUploadState((prev) => ({
        ...prev,
        [docType]: { loading: true, error: null, success: null },
      }));

      try {
        await uploadCustomerDoc(user.username, docType, file, user.name);
        setUploadState((prev) => ({
          ...prev,
          [docType]: { loading: false, error: null, success: "Document uploaded successfully!" },
        }));
        // Clear success message after 4 seconds
        setTimeout(() => {
          setUploadState((prev) => ({
            ...prev,
            [docType]: { ...prev[docType], success: null },
          }));
        }, 4000);
      } catch (err) {
        setUploadState((prev) => ({
          ...prev,
          [docType]: { loading: false, error: err.message, success: null },
        }));
      }

      // Reset file input
      if (fileRefMap[docType]?.current) {
        fileRefMap[docType].current.value = "";
      }
    },
    [user, uploadCustomerDoc]
  );

  const renderDocRow = (docType) => {
    const meta = KYC_DOC_TYPES[docType];
    const doc = docs[docType] || { status: "not_uploaded", fileName: null, uploadDate: null };
    const statusCfg = getKycStatusConfig(doc.status);
    const state = uploadState[docType];
    const isUploaded = doc.status !== "not_uploaded" && doc.fileName;
    const fileRef = fileRefMap[docType];

    return (
      <div className="kyc-doc-row" key={docType}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileRef}
          accept={ACCEPTED_EXTENSIONS.join(",")}
          style={{ display: "none" }}
          aria-label={`Upload ${meta.label}`}
          onChange={(e) => handleFileSelect(docType, e.target.files?.[0])}
        />

        {/* Left: Icon + Info */}
        <div style={{ display: "flex", gap: "14px", flex: 1, alignItems: "flex-start" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-sm)",
              background: statusCfg.bg,
              border: `1px solid ${statusCfg.borderColor}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "5px" }}>
              {meta.label}
            </div>

            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                className="kyc-status-badge"
                style={{
                  background: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.borderColor}44`,
                }}
              >
                {statusCfg.icon} {statusCfg.label}
              </span>

              {doc.uploadDate && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Uploaded {formatKycDate(doc.uploadDate)}
                </span>
              )}
            </div>

            {/* Rejection reason */}
            {doc.status === "rejected" && doc.rejectionReason && (
              <div
                className="kyc-rejection-notice"
              >
                <span style={{ fontSize: "0.85rem", marginRight: "4px" }}>⚠️</span>
                <strong>Rejection reason:</strong> {doc.rejectionReason}
              </div>
            )}

            {/* File name */}
            {doc.fileName && (
              <div
                style={{
                  marginTop: "3px",
                  fontSize: "0.72rem",
                  color: "var(--text-faint)",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "280px",
                }}
                title={doc.fileName}
              >
                {doc.fileName}
              </div>
            )}

            {/* Upload feedback */}
            {state.error && (
              <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--signal-red)" }}>
                ✕ {state.error}
              </div>
            )}
            {state.success && (
              <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--signal-green)" }}>
                ✓ {state.success}
              </div>
            )}

            {/* Description */}
            <div style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: "3px" }}>
              {meta.description}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {/* View button — only if a real upload exists (not sample) */}
          {isUploaded && doc.dataUrl && (
            <button
              type="button"
              id={`kyc-view-${docType}`}
              className="doc-action-btn"
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
              title={`View ${meta.label}`}
            >
              👁 View
            </button>
          )}

          {/* Upload / Replace button */}
          <button
            type="button"
            id={`kyc-upload-${docType}`}
            className={`kyc-upload-btn ${isUploaded ? "kyc-upload-btn-replace" : "kyc-upload-btn-primary"}`}
            disabled={state.loading}
            onClick={() => fileRef.current?.click()}
            title={isUploaded ? `Replace ${meta.label}` : `Upload ${meta.label}`}
          >
            {state.loading
              ? "Uploading…"
              : isUploaded
              ? "↺ Replace"
              : "⬆ Upload"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="kyc-card" style={{ marginTop: "28px" }}>
        {/* Card Header */}
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
          <span style={{ fontSize: "1.2rem" }}>🪪</span>
          <div>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "1.05rem",
                fontWeight: 700,
              }}
            >
              Customer Documents (KYC)
            </h3>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Required for vehicle rental verification
            </div>
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.72rem",
              color: "var(--text-faint)",
              fontWeight: 500,
              fontStyle: "italic",
            }}
          >
            🔒 Private · Your documents only
          </span>
        </div>

        {/* Document Rows */}
        <div style={{ padding: "4px 0" }}>
          {renderDocRow("drivingLicense")}
          <div style={{ height: "1px", background: "var(--border)", margin: "0 20px" }} />
          {renderDocRow("aadhaar")}
        </div>

        {/* Footer note */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: "0.78rem",
            color: "var(--text-faint)",
            background: "var(--bg-inset)",
            borderRadius: "0 0 var(--radius) var(--radius)",
          }}
        >
          📋 Accepted formats: PDF, JPG, PNG · Max 5 MB per document · Documents are reviewed by our staff within 1–2 business days.
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDoc && <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </>
  );
}

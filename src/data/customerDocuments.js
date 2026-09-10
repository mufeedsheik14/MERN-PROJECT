// Customer KYC document metadata for the demo system.
// DEMO DATA ONLY — no real Aadhaar numbers, license numbers, or personal information.
// In production, replace localStorage with API calls to a secure document storage service.
//
// Fields per document entry:
//   customerId    — matches the user's `username` in MOCK_USERS
//   customerName  — display name
//   documents     — { drivingLicense: DocRecord, aadhaar: DocRecord }
//
// DocRecord fields:
//   status        — "not_uploaded" | "pending" | "verified" | "rejected"
//   fileName      — display filename (mimics a real filename)
//   uploadDate    — ISO date string "YYYY-MM-DD" or null
//   dataUrl       — null for sample records (no actual file blob)
//   isSample      — true for pre-loaded demo records
//   rejectionReason — string or null

/**
 * Returns the initial empty DocRecord for a document type.
 */
export function emptyDocRecord() {
  return {
    status: "not_uploaded",
    fileName: null,
    uploadDate: null,
    dataUrl: null,
    isSample: false,
    rejectionReason: null,
  };
}

export const SAMPLE_CUSTOMER_DOCUMENTS = [
  // ─────────────────────────────────────────────────────────────────────────
  // customer1 — Rahul Sharma
  // Driving License: Pending Verification
  // Aadhaar Card:    Verified
  // ─────────────────────────────────────────────────────────────────────────
  {
    customerId: "customer1",
    customerName: "Rahul Sharma",
    documents: {
      drivingLicense: {
        status: "pending",
        fileName: "Sample_DL_Rahul_Sharma.pdf",
        uploadDate: "2026-09-05",
        dataUrl: null,
        isSample: true,
        rejectionReason: null,
      },
      aadhaar: {
        status: "verified",
        fileName: "Sample_Aadhaar_Rahul_Sharma.pdf",
        uploadDate: "2026-09-04",
        dataUrl: null,
        isSample: true,
        rejectionReason: null,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // customer2 — Priya Nair
  // Driving License: Not Uploaded
  // Aadhaar Card:    Rejected (re-upload required)
  // ─────────────────────────────────────────────────────────────────────────
  {
    customerId: "customer2",
    customerName: "Priya Nair",
    documents: {
      drivingLicense: {
        status: "not_uploaded",
        fileName: null,
        uploadDate: null,
        dataUrl: null,
        isSample: false,
        rejectionReason: null,
      },
      aadhaar: {
        status: "rejected",
        fileName: "Sample_Aadhaar_Priya_Nair.pdf",
        uploadDate: "2026-09-03",
        dataUrl: null,
        isSample: true,
        rejectionReason: "Document image is blurry. Please upload a clear, readable scan.",
      },
    },
  },
];

// ─── Status Configuration ──────────────────────────────────────────────────

export const KYC_STATUS_CONFIG = {
  not_uploaded: {
    label: "Not Uploaded",
    icon: "—",
    color: "var(--text-faint)",
    bg: "var(--bg-inset)",
    borderColor: "var(--border)",
  },
  pending: {
    label: "Pending Verification",
    icon: "⏳",
    color: "var(--signal-amber)",
    bg: "var(--signal-amber-bg)",
    borderColor: "var(--signal-amber)",
  },
  verified: {
    label: "Verified",
    icon: "✓",
    color: "var(--signal-green)",
    bg: "var(--signal-green-bg)",
    borderColor: "var(--signal-green)",
  },
  rejected: {
    label: "Rejected",
    icon: "✕",
    color: "var(--signal-red)",
    bg: "var(--signal-red-bg)",
    borderColor: "var(--signal-red)",
  },
};

/**
 * Returns the status config object for a KYC status string.
 * @param {string} status
 * @returns {object}
 */
export function getKycStatusConfig(status) {
  return KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG.not_uploaded;
}

/**
 * Formats an ISO date string to "DD Mon YYYY".
 * e.g. "2026-09-05" → "05 Sep 2026"
 */
export function formatKycDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Document type display metadata.
 */
export const KYC_DOC_TYPES = {
  drivingLicense: {
    key: "drivingLicense",
    label: "Driving License",
    icon: "🪪",
    description: "Valid government-issued driving license",
  },
  aadhaar: {
    key: "aadhaar",
    label: "Aadhaar Card",
    icon: "🆔",
    description: "12-digit Aadhaar issued by UIDAI",
  },
};

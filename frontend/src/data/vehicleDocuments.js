// Sample vehicle document metadata for all vehicles in the system.
// This is DEMO DATA ONLY — no real personal information or sensitive documents.
// In production, replace localStorage with API calls to a real document storage service.
//
// Fields:
//   id           — unique document ID
//   vehicleId    — links to tbl_Vehicle
//   documentType — "RC" | "Insurance"
//   fileName     — display name (mimics a real filename)
//   uploadDate   — ISO date string "YYYY-MM-DD"
//   expiryDate   — ISO date string for Insurance; null for RC
//   status       — "uploaded" | "missing" | "expired"
//   mimeType     — MIME type of the (hypothetical) file
//   dataUrl      — null for sample records (no actual file blob stored)
//   isSample     — true for pre-loaded demo records

export const SAMPLE_VEHICLE_DOCUMENTS = [
  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 101 — Maruti Suzuki Swift VXI  (Branch: Madurai Central)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_101_RC",
    vehicleId: 101,
    documentType: "RC",
    fileName: "RC_Sample_Maruti_Swift_VXI.pdf",
    uploadDate: "2026-01-15",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_101_Insurance",
    vehicleId: 101,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Maruti_Swift_VXI.pdf",
    uploadDate: "2026-01-15",
    expiryDate: "2027-01-14",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 102 — Hyundai Verna SX  (Branch: Chennai Airport)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_102_RC",
    vehicleId: 102,
    documentType: "RC",
    fileName: "RC_Sample_Hyundai_Verna_SX.pdf",
    uploadDate: "2025-08-20",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_102_Insurance",
    vehicleId: 102,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Hyundai_Verna_SX.pdf",
    uploadDate: "2025-08-20",
    expiryDate: "2026-12-19",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 103 — Mahindra XUV700 AX7  (Branch: Bengaluru Whitefield)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_103_RC",
    vehicleId: 103,
    documentType: "RC",
    fileName: "RC_Sample_Mahindra_XUV700_AX7.pdf",
    uploadDate: "2026-03-10",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_103_Insurance",
    vehicleId: 103,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Mahindra_XUV700_AX7.pdf",
    uploadDate: "2026-03-10",
    expiryDate: "2027-03-09",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 104 — Royal Enfield Classic 350  (Branch: Madurai Central)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_104_RC",
    vehicleId: 104,
    documentType: "RC",
    fileName: "RC_Sample_Royal_Enfield_Classic_350.pdf",
    uploadDate: "2026-02-28",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_104_Insurance",
    vehicleId: 104,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Royal_Enfield_Classic_350.pdf",
    uploadDate: "2026-02-28",
    expiryDate: "2027-02-27",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 105 — Ashok Leyland Dost+  (Branch: Coimbatore RS Puram)
  // Insurance EXPIRED — illustrates the "Expired" status in the UI
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_105_RC",
    vehicleId: 105,
    documentType: "RC",
    fileName: "RC_Sample_Ashok_Leyland_Dost.pdf",
    uploadDate: "2025-05-12",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_105_Insurance",
    vehicleId: 105,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Ashok_Leyland_Dost.pdf",
    uploadDate: "2025-05-12",
    expiryDate: "2026-05-11", // Expired (before 2026-09-07)
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 106 — Tata Nexon EV  (Branch: Coimbatore RS Puram)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_106_RC",
    vehicleId: 106,
    documentType: "RC",
    fileName: "RC_Sample_Tata_Nexon_EV.pdf",
    uploadDate: "2026-04-18",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_106_Insurance",
    vehicleId: 106,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Tata_Nexon_EV.pdf",
    uploadDate: "2026-04-18",
    expiryDate: "2027-04-17",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 107 — Honda City ZX  (Branch: Chennai Airport)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_107_RC",
    vehicleId: 107,
    documentType: "RC",
    fileName: "RC_Sample_Honda_City_ZX.pdf",
    uploadDate: "2025-09-25",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_107_Insurance",
    vehicleId: 107,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Honda_City_ZX.pdf",
    uploadDate: "2025-09-25",
    expiryDate: "2026-11-24",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 108 — Honda Activa 6G  (Branch: Madurai Central)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_108_RC",
    vehicleId: 108,
    documentType: "RC",
    fileName: "RC_Sample_Honda_Activa_6G.pdf",
    uploadDate: "2026-06-05",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_108_Insurance",
    vehicleId: 108,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Honda_Activa_6G.pdf",
    uploadDate: "2026-06-05",
    expiryDate: "2027-06-04",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 109 — Toyota Fortuner Sigma4  (Branch: Bengaluru Whitefield)
  // Insurance EXPIRED — illustrates the "Expired" status in the UI
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_109_RC",
    vehicleId: 109,
    documentType: "RC",
    fileName: "RC_Sample_Toyota_Fortuner_Sigma4.pdf",
    uploadDate: "2025-03-08",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_109_Insurance",
    vehicleId: 109,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Toyota_Fortuner_Sigma4.pdf",
    uploadDate: "2025-03-08",
    expiryDate: "2026-03-07", // Expired (before 2026-09-07)
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 110 — Toyota Hilux Revo  (Branch: Coimbatore RS Puram)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_110_RC",
    vehicleId: 110,
    documentType: "RC",
    fileName: "RC_Sample_Toyota_Hilux_Revo.pdf",
    uploadDate: "2026-01-30",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_110_Insurance",
    vehicleId: 110,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Toyota_Hilux_Revo.pdf",
    uploadDate: "2026-01-30",
    expiryDate: "2027-01-29",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 111 — Toyota Innova Crysta  (Branch: Madurai Central)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_111_RC",
    vehicleId: 111,
    documentType: "RC",
    fileName: "RC_Sample_Toyota_Innova_Crysta.pdf",
    uploadDate: "2025-12-22",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_111_Insurance",
    vehicleId: 111,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Toyota_Innova_Crysta.pdf",
    uploadDate: "2025-12-22",
    expiryDate: "2026-12-21",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 112 — Mercedes-Benz C-Class  (Branch: Chennai Airport)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_112_RC",
    vehicleId: 112,
    documentType: "RC",
    fileName: "RC_Sample_Mercedes_C_Class.pdf",
    uploadDate: "2026-07-14",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_112_Insurance",
    vehicleId: 112,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Mercedes_C_Class.pdf",
    uploadDate: "2026-07-14",
    expiryDate: "2027-07-13",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 113 — Revolt RV400  (Branch: Bengaluru Whitefield)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_113_RC",
    vehicleId: 113,
    documentType: "RC",
    fileName: "RC_Sample_Revolt_RV400.pdf",
    uploadDate: "2026-05-03",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_113_Insurance",
    vehicleId: 113,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Revolt_RV400.pdf",
    uploadDate: "2026-05-03",
    expiryDate: "2027-05-02",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 114 — TVS Jupiter  (Branch: Chennai Airport)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_114_RC",
    vehicleId: 114,
    documentType: "RC",
    fileName: "RC_Sample_TVS_Jupiter.pdf",
    uploadDate: "2025-11-17",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_114_Insurance",
    vehicleId: 114,
    documentType: "Insurance",
    fileName: "Insurance_Sample_TVS_Jupiter.pdf",
    uploadDate: "2025-11-17",
    expiryDate: "2026-11-16",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle 115 — Hyundai i20 Asta  (Branch: Coimbatore RS Puram)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "doc_115_RC",
    vehicleId: 115,
    documentType: "RC",
    fileName: "RC_Sample_Hyundai_i20_Asta.pdf",
    uploadDate: "2026-02-09",
    expiryDate: null,
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
  {
    id: "doc_115_Insurance",
    vehicleId: 115,
    documentType: "Insurance",
    fileName: "Insurance_Sample_Hyundai_i20_Asta.pdf",
    uploadDate: "2026-02-09",
    expiryDate: "2027-02-08",
    status: "uploaded",
    mimeType: "application/pdf",
    dataUrl: null,
    isSample: true,
  },
];

/**
 * Computes the effective runtime status for a document.
 * For Insurance documents, if the expiryDate has passed today, status is "expired".
 * @param {object} doc
 * @returns {"uploaded"|"missing"|"expired"}
 */
export function getEffectiveDocStatus(doc) {
  if (!doc) return "missing";
  if (doc.documentType === "Insurance" && doc.expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(doc.expiryDate);
    if (expiry < today) return "expired";
  }
  return doc.status || "uploaded";
}

/**
 * Formats an ISO date string to a human-readable "DD Mon YYYY" format.
 * e.g. "2027-01-14" → "14 Jan 2027"
 */
export function formatDocDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { SAMPLE_VEHICLE_DOCUMENTS } from "../data/vehicleDocuments";

const DocumentContext = createContext(undefined);

const DOCS_STORAGE_KEY = "rr_vehicle_docs";

// Accepted MIME types and file extensions
const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function loadStoredDocs() {
  try {
    const stored = window.localStorage.getItem(DOCS_STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(SAMPLE_VEHICLE_DOCUMENTS));
      return SAMPLE_VEHICLE_DOCUMENTS;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_VEHICLE_DOCUMENTS;
  } catch {
    return SAMPLE_VEHICLE_DOCUMENTS;
  }
}

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState(loadStoredDocs);

  // Persist to localStorage whenever documents change
  useEffect(() => {
    try {
      window.localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      // localStorage might be full (base64 files are large)
      console.warn("DocumentContext: Could not persist documents to localStorage.", e);
    }
  }, [documents]);

  /** Returns { RC: doc|null, Insurance: doc|null } for a given vehicleId */
  const getDocumentsForVehicle = useCallback(
    (vehicleId) => {
      const vId = Number(vehicleId);
      const docs = documents.filter((d) => d.vehicleId === vId);
      return {
        RC: docs.find((d) => d.documentType === "RC") || null,
        Insurance: docs.find((d) => d.documentType === "Insurance") || null,
      };
    },
    [documents]
  );

  /**
   * Validates a File object.
   * @returns {{ valid: boolean, error?: string }}
   */
  const validateFile = (file) => {
    const nameLower = file.name.toLowerCase();
    const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
    // Some browsers report "image/jpg" which isn't standard; normalise by extension too
    const hasValidMime =
      ACCEPTED_MIME_TYPES.includes(file.type) ||
      (file.type === "" && hasValidExt); // edge case: OS reports no MIME

    if (!hasValidExt || !hasValidMime) {
      return {
        valid: false,
        error: "Only PDF, JPG, JPEG, or PNG files are accepted.",
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File is too large. Maximum allowed size is 5 MB (your file: ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      };
    }
    return { valid: true };
  };

  /**
   * Uploads (or replaces) a document for a vehicle.
   * Reads the file as a base64 dataUrl and stores it in state + localStorage.
   *
   * @param {number} vehicleId
   * @param {"RC"|"Insurance"} documentType
   * @param {File} file
   * @param {string|null} expiryDate — ISO date string (required for Insurance)
   * @returns {Promise<object>} the created document record
   */
  const uploadDocument = useCallback(
    (vehicleId, documentType, file, expiryDate) => {
      return new Promise((resolve, reject) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          const newDoc = {
            id: `doc_${vehicleId}_${documentType}_${Date.now()}`,
            vehicleId: Number(vehicleId),
            documentType,
            fileName: file.name,
            uploadDate: new Date().toISOString().split("T")[0],
            expiryDate: expiryDate || null,
            status: "uploaded",
            mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
            dataUrl: e.target.result, // base64 data URL
            isSample: false,
          };

          setDocuments((prev) => {
            // Replace any existing document for this vehicleId + documentType
            const filtered = prev.filter(
              (d) => !(d.vehicleId === Number(vehicleId) && d.documentType === documentType)
            );
            return [...filtered, newDoc];
          });

          resolve(newDoc);
        };

        reader.onerror = () => reject(new Error("Failed to read the selected file. Please try again."));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  /**
   * Convenience alias — replaceDocument behaves exactly like uploadDocument
   * (both remove the previous record and insert the new one).
   */
  const replaceDocument = useCallback(
    (vehicleId, documentType, file, expiryDate) => {
      return uploadDocument(vehicleId, documentType, file, expiryDate);
    },
    [uploadDocument]
  );

  const value = useMemo(
    () => ({
      documents,
      getDocumentsForVehicle,
      uploadDocument,
      replaceDocument,
      ACCEPTED_EXTENSIONS,
      MAX_FILE_SIZE_BYTES,
    }),
    [documents, getDocumentsForVehicle, uploadDocument, replaceDocument]
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDocuments() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocuments must be used within a DocumentProvider");
  return ctx;
}

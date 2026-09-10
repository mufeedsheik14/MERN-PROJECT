import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { SAMPLE_CUSTOMER_DOCUMENTS, emptyDocRecord } from "../data/customerDocuments";

const CustomerDocumentContext = createContext(undefined);

const CUSTOMER_DOCS_STORAGE_KEY = "rr_customer_docs";

// Accepted MIME types and file extensions (same as vehicle docs)
const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function loadStoredCustomerDocs() {
  try {
    const stored = window.localStorage.getItem(CUSTOMER_DOCS_STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(CUSTOMER_DOCS_STORAGE_KEY, JSON.stringify(SAMPLE_CUSTOMER_DOCUMENTS));
      return SAMPLE_CUSTOMER_DOCUMENTS;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_CUSTOMER_DOCUMENTS;
  } catch {
    return SAMPLE_CUSTOMER_DOCUMENTS;
  }
}

export function CustomerDocumentProvider({ children }) {
  const [customerDocs, setCustomerDocs] = useState(loadStoredCustomerDocs);

  // Persist to localStorage whenever customerDocs change
  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOMER_DOCS_STORAGE_KEY, JSON.stringify(customerDocs));
    } catch (e) {
      console.warn("CustomerDocumentContext: Could not persist to localStorage.", e);
    }
  }, [customerDocs]);

  /**
   * Returns the document record for a specific customer.
   * SECURITY: Callers must ensure they only pass their own username (enforced by UI).
   * Returns { drivingLicense: DocRecord, aadhaar: DocRecord }
   */
  const getCustomerDocs = useCallback(
    (username) => {
      if (!username) return null;
      const record = customerDocs.find(
        (d) => d.customerId.toLowerCase() === username.toLowerCase()
      );
      if (!record) {
        // Return an empty record shape for customers with no uploads yet
        return {
          customerId: username,
          customerName: username,
          documents: {
            drivingLicense: emptyDocRecord(),
            aadhaar: emptyDocRecord(),
          },
        };
      }
      return record;
    },
    [customerDocs]
  );

  /**
   * Returns ALL customer document records.
   * SECURITY: Only expose this to staff/admin roles — enforced by the calling component.
   */
  const getAllCustomerDocs = useCallback(() => {
    return customerDocs;
  }, [customerDocs]);

  /**
   * Validates a File object against allowed types and size.
   * @returns {{ valid: boolean, error?: string }}
   */
  const validateFile = (file) => {
    const nameLower = file.name.toLowerCase();
    const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
    const hasValidMime =
      ACCEPTED_MIME_TYPES.includes(file.type) ||
      (file.type === "" && hasValidExt);

    if (!hasValidExt || !hasValidMime) {
      return { valid: false, error: "Only PDF, JPG, JPEG, or PNG files are accepted." };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File too large. Maximum allowed is 5 MB (your file: ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      };
    }
    return { valid: true };
  };

  /**
   * Uploads (or replaces) a customer KYC document.
   * Reads file as base64 dataUrl, sets status to "pending".
   *
   * @param {string} username — customer's username
   * @param {"drivingLicense"|"aadhaar"} docType
   * @param {File} file
   * @param {string} customerName — for display
   * @returns {Promise<object>}
   */
  const uploadCustomerDoc = useCallback(
    (username, docType, file, customerName) => {
      return new Promise((resolve, reject) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          const newDocRecord = {
            status: "pending",
            fileName: file.name,
            uploadDate: new Date().toISOString().split("T")[0],
            dataUrl: e.target.result,
            isSample: false,
            rejectionReason: null,
          };

          setCustomerDocs((prev) => {
            const existingIdx = prev.findIndex(
              (d) => d.customerId.toLowerCase() === username.toLowerCase()
            );

            if (existingIdx === -1) {
              // New customer record
              const newRecord = {
                customerId: username,
                customerName: customerName || username,
                documents: {
                  drivingLicense: emptyDocRecord(),
                  aadhaar: emptyDocRecord(),
                  [docType]: newDocRecord,
                },
              };
              return [...prev, newRecord];
            }

            // Update existing customer record
            const updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              documents: {
                ...updated[existingIdx].documents,
                [docType]: newDocRecord,
              },
            };
            return updated;
          });

          resolve(newDocRecord);
        };

        reader.onerror = () =>
          reject(new Error("Failed to read the selected file. Please try again."));
        reader.readAsDataURL(file);
      });
    },
    []
  );

  /**
   * Updates the verification status of a customer's document.
   * SECURITY: Only staff/admin should call this — enforced by calling component.
   *
   * @param {string} username
   * @param {"drivingLicense"|"aadhaar"} docType
   * @param {"verified"|"rejected"|"pending"} status
   * @param {string|null} rejectionReason
   */
  const updateDocStatus = useCallback((username, docType, status, rejectionReason = null) => {
    setCustomerDocs((prev) => {
      const idx = prev.findIndex(
        (d) => d.customerId.toLowerCase() === username.toLowerCase()
      );
      if (idx === -1) return prev;

      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        documents: {
          ...updated[idx].documents,
          [docType]: {
            ...updated[idx].documents[docType],
            status,
            rejectionReason: status === "rejected" ? rejectionReason : null,
          },
        },
      };
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      getCustomerDocs,
      getAllCustomerDocs,
      uploadCustomerDoc,
      updateDocStatus,
      ACCEPTED_EXTENSIONS,
      MAX_FILE_SIZE_BYTES,
    }),
    [getCustomerDocs, getAllCustomerDocs, uploadCustomerDoc, updateDocStatus]
  );

  return (
    <CustomerDocumentContext.Provider value={value}>
      {children}
    </CustomerDocumentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomerDocuments() {
  const ctx = useContext(CustomerDocumentContext);
  if (!ctx) throw new Error("useCustomerDocuments must be used within a CustomerDocumentProvider");
  return ctx;
}

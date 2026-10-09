import { useState, useMemo } from "react";
import { exportToExcel } from "../../utils/reportExcelExporter";

export default function ReportViewerModal({
  isOpen,
  onClose,
  reportTitle,
  reportType,
  fileName,
  data = [],
  columns = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");

  // Determine if specific filter inputs should be visible based on report columns
  const hasDateField = useMemo(() => {
    return columns.some(
      (c) =>
        c.key.toLowerCase().includes("date") ||
        c.key.toLowerCase().includes("pickup") ||
        c.key.toLowerCase().includes("return")
    );
  }, [columns]);

  const hasStatusField = useMemo(() => {
    return columns.some((c) => c.key.toLowerCase().includes("status"));
  }, [columns]);

  const hasPaymentField = useMemo(() => {
    return columns.some(
      (c) =>
        c.key.toLowerCase().includes("payment") ||
        c.key.toLowerCase().includes("refund")
    );
  }, [columns]);

  const hasVehicleField = useMemo(() => {
    return columns.some(
      (c) =>
        c.key.toLowerCase().includes("vehicle") ||
        c.key.toLowerCase().includes("model")
    );
  }, [columns]);

  // Unique status options
  const statusOptions = useMemo(() => {
    const set = new Set();
    data.forEach((row) => {
      const val = row["Booking Status"] || row["Current Status"] || row["Availability Status"] || row.status;
      if (val) set.add(String(val));
    });
    return Array.from(set);
  }, [data]);

  // Unique payment status options
  const paymentOptions = useMemo(() => {
    const set = new Set();
    data.forEach((row) => {
      const val = row["Payment Status"] || row["Refund / Payment Status"] || row.paymentStatus;
      if (val) set.add(String(val));
    });
    return Array.from(set);
  }, [data]);

  // Unique vehicles options
  const vehicleOptions = useMemo(() => {
    const set = new Set();
    data.forEach((row) => {
      const val = row["Vehicle Name"] || row["Vehicle"] || row.vehicleLabel;
      if (val) set.add(String(val));
    });
    return Array.from(set);
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // 1. Text Search across all values in the row
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch = Object.values(row).some((val) =>
          String(val || "").toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // 2. Date Range Filter
      if (startDate || endDate) {
        // Try locating date fields in the row
        const dateVal =
          row["Pickup Date"] ||
          row["Booking Date"] ||
          row["Payment Date"] ||
          row["Cancelled Date"] ||
          row.dte_Pickup_Date;

        if (dateVal && dateVal !== "N/A") {
          const rowDate = new Date(dateVal);
          if (!isNaN(rowDate.getTime())) {
            if (startDate) {
              const start = new Date(startDate);
              if (rowDate < start) return false;
            }
            if (endDate) {
              const end = new Date(`${endDate}T23:59:59.999Z`);
              if (rowDate > end) return false;
            }
          }
        }
      }

      // 3. Status Filter
      if (statusFilter !== "all") {
        const rowStatus = String(
          row["Booking Status"] ||
          row["Current Status"] ||
          row["Availability Status"] ||
          row.status ||
          ""
        ).toLowerCase();
        if (rowStatus !== statusFilter.toLowerCase()) return false;
      }

      // 4. Payment Status Filter
      if (paymentFilter !== "all") {
        const rowPayment = String(
          row["Payment Status"] ||
          row["Refund / Payment Status"] ||
          row.paymentStatus ||
          ""
        ).toLowerCase();
        if (rowPayment !== paymentFilter.toLowerCase()) return false;
      }

      // 5. Vehicle Filter
      if (vehicleFilter !== "all") {
        const rowVeh = String(
          row["Vehicle Name"] || row["Vehicle"] || row.vehicleLabel || ""
        );
        if (rowVeh !== vehicleFilter) return false;
      }

      return true;
    });
  }, [data, searchTerm, startDate, endDate, statusFilter, paymentFilter, vehicleFilter]);

  if (!isOpen) return null;

  const handleExportFilteredExcel = () => {
    if (filteredData.length === 0) return;
    exportToExcel({
      sheetName: (reportTitle || "Report").slice(0, 31),
      fileName: fileName || `RoadReady_${(reportType || "Report").replace(/\s+/g, "_")}.xlsx`,
      data: filteredData,
      title: `RoadReady - ${reportTitle}`,
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setVehicleFilter("all");
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: "var(--bg-elevated)",
          color: "var(--text)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "1150px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-inset)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>📊</span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
                {reportTitle}
              </h2>
              <span
                style={{
                  background: "rgba(224, 99, 43, 0.12)",
                  color: "var(--accent)",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                }}
              >
                Real Database Records ({filteredData.length} of {data.length})
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Search, filter, and export live analytics datasets directly to Microsoft Excel (.xlsx)
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportFilteredExcel}
              disabled={filteredData.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "0.86rem",
              }}
            >
              <span>📥</span> Download Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            padding: "14px 24px",
            background: "var(--bg-elevated)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {/* Universal Search Input */}
          <div style={{ minWidth: "220px", flex: "1 1 200px" }}>
            <input
              type="text"
              placeholder="🔍 Search all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px",
                fontSize: "0.84rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-inset)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Date Range Filters */}
          {hasDateField && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                From:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                }}
              />
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                To:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                }}
              />
            </div>
          )}

          {/* Booking / General Status Filter */}
          {hasStatusField && statusOptions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.82rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Filter */}
          {hasPaymentField && paymentOptions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Payment:
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.82rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Payments</option>
                {paymentOptions.map((pay) => (
                  <option key={pay} value={pay}>
                    {pay}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle Dropdown Filter */}
          {hasVehicleField && vehicleOptions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Vehicle:
              </label>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.82rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                  maxWidth: "180px",
                }}
              >
                <option value="all">All Vehicles</option>
                {vehicleOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || startDate || endDate || statusFilter !== "all" || paymentFilter !== "all" || vehicleFilter !== "all") && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleResetFilters}
              style={{
                padding: "6px 12px",
                fontSize: "0.78rem",
                color: "var(--signal-red)",
              }}
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* Scrollable Data Table Container */}
        <div style={{ flex: 1, overflow: "auto", padding: "0" }}>
          {filteredData.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>🔍</div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>
                No records found matching filters
              </h3>
              <p style={{ margin: 0, fontSize: "0.84rem" }}>
                Try widening your date range or clearing the search query to see all data.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleResetFilters}
                style={{ marginTop: "14px", fontSize: "0.82rem" }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.86rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-inset)",
                    borderBottom: "2px solid var(--border)",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: "12px 16px",
                        fontWeight: 700,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={idx}
                      style={{
                        background: isEven ? "transparent" : "rgba(255, 255, 255, 0.02)",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-inset)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isEven
                          ? "transparent"
                          : "rgba(255, 255, 255, 0.02)";
                      }}
                    >
                      {columns.map((col) => {
                        const val = row[col.key];
                        const isAmount =
                          col.key.toLowerCase().includes("amount") ||
                          col.key.toLowerCase().includes("spending") ||
                          col.key.toLowerCase().includes("rent");
                        const isStatus =
                          col.key.toLowerCase().includes("status");

                        let renderedVal = val !== undefined && val !== null ? String(val) : "—";
                        if (isAmount && typeof val === "number") {
                          renderedVal = `₹${val.toLocaleString("en-IN")}`;
                        }

                        let badgeStyle = null;
                        if (isStatus) {
                          const lower = String(val || "").toLowerCase();
                          if (lower.includes("paid") || lower.includes("available") || lower.includes("confirmed") || lower.includes("verified")) {
                            badgeStyle = { color: "var(--signal-green)", background: "rgba(16, 185, 129, 0.12)" };
                          } else if (lower.includes("failed") || lower.includes("cancelled") || lower.includes("maintenance")) {
                            badgeStyle = { color: "var(--signal-red)", background: "rgba(239, 68, 68, 0.12)" };
                          } else if (lower.includes("pending") || lower.includes("ongoing") || lower.includes("booked")) {
                            badgeStyle = { color: "var(--signal-amber, #f59e0b)", background: "rgba(245, 158, 11, 0.12)" };
                          }
                        }

                        return (
                          <td
                            key={col.key}
                            style={{
                              padding: "10px 16px",
                              whiteSpace: col.key.includes("ID") || col.key.includes("Date") || col.key.includes("Number") ? "nowrap" : "normal",
                              fontFamily: col.key.includes("ID") || col.key.includes("Registration") ? "monospace" : "inherit",
                              fontWeight: isAmount || col.key.includes("Name") ? 600 : "normal",
                            }}
                          >
                            {badgeStyle ? (
                              <span
                                style={{
                                  ...badgeStyle,
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                }}
                              >
                                {renderedVal}
                              </span>
                            ) : (
                              renderedVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer with Quick Summary and Action Buttons */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-inset)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Showing <strong>{filteredData.length}</strong> of <strong>{data.length}</strong> rows
            {fileName && <span> · Filename target: <code style={{ color: "var(--accent)" }}>{fileName}</code></span>}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: "8px 18px", fontSize: "0.86rem" }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportFilteredExcel}
              disabled={filteredData.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                fontSize: "0.86rem",
              }}
            >
              <span>📥</span> Download Excel ({filteredData.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";

/**
 * Vehicle Utilization Ranking & Comparison Chart
 * Displays most and least utilized vehicles with gradient progress bars, booking counts, and percentages.
 */
export default function VehicleUtilizationChart({
  vehicles = [], // [{ name, category, plate, count, revenue, status, percentage }, ...]
  maxItems = 6,
  showToggle = true,
}) {
  const [sortOrder, setSortOrder] = useState("most"); // "most" | "least"
  const [hoveredVehicle, setHoveredVehicle] = useState(null);

  if (!vehicles || vehicles.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
        No vehicle utilization records available.
      </div>
    );
  }

  // Sort by count
  const sorted = [...vehicles].sort((a, b) => {
    return sortOrder === "most" ? (b.count || 0) - (a.count || 0) : (a.count || 0) - (b.count || 0);
  });

  const displayedVehicles = sorted.slice(0, maxItems);
  const maxBookingCount = Math.max(...vehicles.map((v) => v.count || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
      {showToggle && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Fleet Ranking ({vehicles.length} total)
          </span>
          <div style={{ display: "flex", gap: "4px", background: "var(--bg-inset)", padding: "3px", borderRadius: "8px" }}>
            <button
              type="button"
              onClick={() => setSortOrder("most")}
              style={{
                border: "none",
                background: sortOrder === "most" ? "var(--bg-elevated)" : "transparent",
                color: sortOrder === "most" ? "var(--accent)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: sortOrder === "most" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              🔥 Most Utilized
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("least")}
              style={{
                border: "none",
                background: sortOrder === "least" ? "var(--bg-elevated)" : "transparent",
                color: sortOrder === "least" ? "var(--accent)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: sortOrder === "least" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              ❄️ Least Utilized
            </button>
          </div>
        </div>
      )}

      {/* Vehicle Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {displayedVehicles.map((v, idx) => {
          const ratio = Math.min((v.count || 0) / maxBookingCount, 1);
          const percent = Math.round(ratio * 100);
          const isHovered = hoveredVehicle === (v.id || v.name);
          const fullVehicleLabel = v.plate ? `${v.name} (${v.plate})` : v.name;

          // Color gradient based on utilization
          let barGradient = "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)";
          if (percent >= 80) {
            barGradient = "linear-gradient(90deg, #10b981 0%, #34d399 100%)"; // High usage
          } else if (percent <= 20 && sortOrder === "least") {
            barGradient = "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"; // Needs attention
          }

          return (
            <div
              key={v.id || v.name + idx}
              title={fullVehicleLabel}
              onMouseEnter={() => setHoveredVehicle(v.id || v.name)}
              onMouseLeave={() => setHoveredVehicle(null)}
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: isHovered ? "var(--bg-inset)" : "transparent",
                transition: "all 0.15s ease",
                border: isHovered ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              {/* Header Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", width: 18 }}>
                    #{idx + 1}
                  </span>
                  <div
                    title={fullVehicleLabel}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>
                      {v.name}
                    </span>
                    {v.plate && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                        ({v.plate})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {v.revenue > 0 && (
                    <span style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
                      ₹{v.revenue.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
                    {v.count} {v.count === 1 ? "trip" : "trips"}
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div
                style={{
                  height: "8px",
                  width: "100%",
                  background: "var(--border, rgba(0,0,0,0.06))",
                  borderRadius: "999px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(percent, 4)}%`,
                    background: barGradient,
                    borderRadius: "999px",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

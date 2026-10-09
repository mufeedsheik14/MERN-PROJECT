import { useState } from "react";

/**
 * Branch Comparison Chart
 * Compares branch fleet sizes, booking counts, and revenue contribution.
 */
export default function BranchPerformanceChart({ branches = [] }) {
  // branches: [{ id, name, city, fleetCount, bookingCount, revenue }, ...]
  const [metric, setMetric] = useState("revenue"); // "revenue" | "bookings" | "fleet"
  const [hoveredBranch, setHoveredBranch] = useState(null);

  if (!branches || branches.length === 0) {
    return (
      <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
        No branch performance records available.
      </div>
    );
  }

  const maxValue = Math.max(
    ...branches.map((b) =>
      metric === "revenue"
        ? b.revenue || 0
        : metric === "bookings"
        ? b.bookingCount || 0
        : b.fleetCount || 0
    ),
    1
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* Metric Toggle Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Compare by:
        </span>
        <div style={{ display: "flex", gap: "4px", background: "var(--bg-inset)", padding: "3px", borderRadius: "8px" }}>
          {[
            { id: "revenue", label: "₹ Revenue" },
            { id: "bookings", label: "📋 Bookings" },
            { id: "fleet", label: "🚗 Fleet Size" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              style={{
                border: "none",
                background: metric === m.id ? "var(--bg-elevated)" : "transparent",
                color: metric === m.id ? "var(--accent)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.74rem",
                padding: "4px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: metric === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Branch Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {branches.map((b) => {
          const val =
            metric === "revenue"
              ? b.revenue || 0
              : metric === "bookings"
              ? b.bookingCount || 0
              : b.fleetCount || 0;
          const pct = Math.round((val / maxValue) * 100);
          const isHovered = hoveredBranch === b.name;

          let formattedVal = val;
          if (metric === "revenue") formattedVal = `₹${val.toLocaleString("en-IN")}`;
          else if (metric === "bookings") formattedVal = `${val} rides`;
          else formattedVal = `${val} vehicles`;

          return (
            <div
              key={b.id || b.name}
              onMouseEnter={() => setHoveredBranch(b.name)}
              onMouseLeave={() => setHoveredBranch(null)}
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: isHovered ? "var(--bg-inset)" : "transparent",
                border: isHovered ? "1px solid var(--border)" : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>
                    {b.name}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                    📍 {b.city}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)" }}>
                  {formattedVal}
                </div>
              </div>

              {/* Bar */}
              <div
                style={{
                  height: "8px",
                  width: "100%",
                  background: "var(--border, rgba(0,0,0,0.06))",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(pct, 4)}%`,
                    background:
                      metric === "revenue"
                        ? "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)"
                        : metric === "bookings"
                        ? "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)"
                        : "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                    borderRadius: "999px",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>

              {/* Subtitle details */}
              <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                <span>Fleet: {b.fleetCount}</span>
                <span>•</span>
                <span>Bookings: {b.bookingCount}</span>
                <span>•</span>
                <span>Revenue: ₹{(b.revenue || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

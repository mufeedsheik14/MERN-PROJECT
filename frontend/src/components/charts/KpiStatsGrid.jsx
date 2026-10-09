/**
 * Modern Business Intelligence KPI Statistics Grid
 * Renders executive-level metric cards with icons, change badges, and sparkline indicators.
 */
export default function KpiStatsGrid({ items = [] }) {
  // items: [{ title, value, icon, color, badge, subtitle, sparklineData }, ...]
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "18px",
        marginBottom: "28px",
      }}
    >
      {items.map((item, idx) => {
        const accentColor = item.color || "#3b82f6";
        return (
          <div
            key={idx}
            style={{
              background: "var(--bg-elevated, #ffffff)",
              border: "1px solid var(--border, #e2e8f0)",
              borderLeft: `4px solid ${accentColor}`,
              borderRadius: "var(--radius-lg, 14px)",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.03)";
            }}
          >
            {/* Top row: Label & Icon */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-muted, #64748b)",
                }}
              >
                {item.title}
              </span>
              {item.icon && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    background: `${accentColor}15`,
                    color: accentColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.05rem",
                  }}
                >
                  {item.icon}
                </div>
              )}
            </div>

            {/* Middle row: Big Value */}
            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "var(--text, #1e293b)",
                  fontFamily: "var(--font-display, inherit)",
                  lineHeight: 1.15,
                }}
              >
                {item.value}
              </div>
            </div>

            {/* Bottom row: Subtitle or Status Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "auto" }}>
              {item.subtitle && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {item.subtitle}
                </span>
              )}
              {item.badge && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: "10px",
                    background: `${accentColor}18`,
                    color: accentColor,
                    marginLeft: "auto",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

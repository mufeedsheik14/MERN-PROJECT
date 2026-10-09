import { memo } from "react";

/**
 * Reusable Chart Container Card
 * Provides uniform styling, header, subtitle, legend/action slot, loading, and empty states.
 */
function ChartCard({
  title,
  subtitle,
  icon,
  badge,
  action,
  loading = false,
  empty = false,
  emptyMessage = "No data available yet.",
  children,
  style,
}) {
  return (
    <div
      style={{
        background: "var(--bg-elevated, #ffffff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "var(--radius-lg, 16px)",
        padding: "22px 24px",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "18px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "160px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            {icon && <span style={{ fontSize: "1.1rem" }}>{icon}</span>}
            <h3
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text, #1e293b)",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h3>
            {badge && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "var(--accent-subtle, rgba(59, 130, 246, 0.1))",
                  color: "var(--accent, #3b82f6)",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: "var(--text-muted, #64748b)",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {action && <div>{action}</div>}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {loading ? (
          <div
            style={{
              minHeight: "220px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--border)",
                borderTopColor: "var(--accent, #3b82f6)",
                borderRadius: "50%",
                animation: "chartSpin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes chartSpin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: "0.85rem" }}>Loading analytics...</span>
          </div>
        ) : empty ? (
          <div
            style={{
              minHeight: "220px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "var(--bg-inset, rgba(0,0,0,0.02))",
              borderRadius: "12px",
              border: "1px dashed var(--border)",
            }}
          >
            <span style={{ fontSize: "1.8rem", marginBottom: "8px" }}>📊</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{emptyMessage}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default memo(ChartCard);

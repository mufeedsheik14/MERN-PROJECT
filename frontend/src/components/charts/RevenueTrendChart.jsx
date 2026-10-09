import { useState, useId, useMemo } from "react";

/**
 * Interactive SVG Line / Area Chart for Revenue & Booking Trends
 * Supports smooth bezier curves, gradient fills, hover vertical cursor, and rich tooltips.
 */
export default function RevenueTrendChart({
  data = [], // [{ label: "Oct 1", date: "2026-10-01", revenue: 4500, bookings: 2 }, ...]
  height = 240,
  activeMetric = "both", // "revenue" | "bookings" | "both"
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState(null);

  // Chart dimensions & padding
  const padding = { top: 20, right: 24, bottom: 36, left: 56 };
  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  // Maximum scales
  const maxRevenue = useMemo(() => {
    const max = Math.max(...data.map((d) => d.revenue || 0), 1000);
    return Math.ceil(max / 1000) * 1000;
  }, [data]);

  const maxBookings = useMemo(() => {
    const max = Math.max(...data.map((d) => d.bookings || 0), 5);
    return Math.ceil(max / 2) * 2;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        No trend data available for this range.
      </div>
    );
  }

  // Calculate points for Revenue (mapped to left Y axis)
  const revenuePoints = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.revenue || 0) / maxRevenue) * chartHeight;
    return { x, y, ...d };
  });

  // Calculate points for Bookings (mapped to right Y axis)
  const bookingPoints = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.bookings || 0) / maxBookings) * chartHeight;
    return { x, y, ...d };
  });

  // Helper to generate smooth cubic bezier path
  function buildBezierPath(points) {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }

  const revenueLinePath = buildBezierPath(revenuePoints);
  const revenueAreaPath =
    revenuePoints.length > 0
      ? `${revenueLinePath} L ${revenuePoints[revenuePoints.length - 1].x} ${padding.top + chartHeight} L ${revenuePoints[0].x} ${padding.top + chartHeight} Z`
      : "";

  const bookingLinePath = buildBezierPath(bookingPoints);

  // Y-axis grid ticks (4 divisions)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => ({
    pct,
    revVal: Math.round(pct * maxRevenue),
    bookVal: Math.round(pct * maxBookings),
    y: padding.top + chartHeight - pct * chartHeight,
  }));

  const activePoint = hoverIndex !== null ? revenuePoints[hoverIndex] : null;

  return (
    <div style={{ position: "relative", width: "100%", userSelect: "none" }}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          {/* Revenue Area Gradient */}
          <linearGradient id={`${gradientId}-rev`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* Bookings Line Glow Filter */}
          <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Labels */}
        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + chartWidth}
              y2={tick.y}
              stroke="var(--border, #e2e8f0)"
              strokeDasharray={idx === 0 ? "none" : "3 4"}
              strokeOpacity={0.6}
            />
            {/* Revenue Axis (Left) */}
            {(activeMetric === "revenue" || activeMetric === "both") && (
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted, #64748b)"
                fontWeight="500"
              >
                ₹{tick.revVal >= 1000 ? `${(tick.revVal / 1000).toFixed(0)}k` : tick.revVal}
              </text>
            )}

            {/* Bookings Axis (Right, if dual) */}
            {activeMetric === "both" && (
              <text
                x={padding.left + chartWidth + 8}
                y={tick.y + 4}
                textAnchor="start"
                fontSize="10"
                fill="#8b5cf6"
                fontWeight="500"
              >
                {tick.bookVal}
              </text>
            )}
          </g>
        ))}

        {/* Revenue Area Fill */}
        {(activeMetric === "revenue" || activeMetric === "both") && (
          <path d={revenueAreaPath} fill={`url(#${gradientId}-rev)`} />
        )}

        {/* Revenue Smooth Curve */}
        {(activeMetric === "revenue" || activeMetric === "both") && (
          <path
            d={revenueLinePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Bookings Smooth Curve (Secondary Series) */}
        {(activeMetric === "bookings" || activeMetric === "both") && (
          <path
            d={bookingLinePath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeDasharray={activeMetric === "both" ? "4 3" : "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${gradientId}-glow)`}
          />
        )}

        {/* X-Axis Labels */}
        {data.map((d, i) => {
          // If too many points, show sparse labels (e.g. every 2nd or 3rd)
          const skipFactor = data.length > 10 ? Math.ceil(data.length / 7) : 1;
          if (i % skipFactor !== 0 && i !== data.length - 1) return null;

          const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
          return (
            <text
              key={i}
              x={x}
              y={padding.top + chartHeight + 18}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted, #64748b)"
              fontWeight="500"
            >
              {d.label}
            </text>
          );
        })}

        {/* Interactive Hover Vertical Hairline & Dots */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={revenuePoints[hoverIndex].x}
              y1={padding.top}
              x2={revenuePoints[hoverIndex].x}
              y2={padding.top + chartHeight}
              stroke="#64748b"
              strokeDasharray="2 2"
              strokeWidth="1.2"
            />

            {/* Revenue Marker */}
            {(activeMetric === "revenue" || activeMetric === "both") && (
              <circle
                cx={revenuePoints[hoverIndex].x}
                cy={revenuePoints[hoverIndex].y}
                r="5"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            )}

            {/* Bookings Marker */}
            {(activeMetric === "bookings" || activeMetric === "both") && (
              <circle
                cx={bookingPoints[hoverIndex].x}
                cy={bookingPoints[hoverIndex].y}
                r="4.5"
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
          </g>
        )}

        {/* Invisible Hover Hitboxes across columns */}
        {data.map((_, i) => {
          const colWidth = chartWidth / data.length;
          const x = padding.left + i * colWidth - colWidth / 2;
          return (
            <rect
              key={i}
              x={Math.max(x, padding.left)}
              y={padding.top}
              width={colWidth}
              height={chartHeight}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && activePoint && (
        <div
          style={{
            position: "absolute",
            left: `${(activePoint.x / viewBoxWidth) * 100}%`,
            top: "10px",
            transform:
              hoverIndex > data.length / 2
                ? "translateX(-105%)"
                : "translateX(10%)",
            background: "var(--bg-elevated, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "10px",
            padding: "8px 12px",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: "130px",
            fontSize: "0.8rem",
            transition: "all 0.1s ease",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
            📅 {activePoint.label} {activePoint.date ? `(${activePoint.date})` : ""}
          </div>
          {(activeMetric === "revenue" || activeMetric === "both") && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#3b82f6", fontWeight: 600, gap: "10px" }}>
              <span>Revenue:</span>
              <span>₹{(activePoint.revenue || 0).toLocaleString("en-IN")}</span>
            </div>
          )}
          {(activeMetric === "bookings" || activeMetric === "both") && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#8b5cf6", fontWeight: 600, gap: "10px" }}>
              <span>Bookings:</span>
              <span>{activePoint.bookings || 0} rides</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginTop: "6px",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
        }}
      >
        {(activeMetric === "revenue" || activeMetric === "both") && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 12, height: 3, background: "#3b82f6", borderRadius: 2 }} />
            <span>Revenue (₹)</span>
          </div>
        )}
        {(activeMetric === "bookings" || activeMetric === "both") && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 12, height: 3, background: "#8b5cf6", borderRadius: 2 }} />
            <span>Booking Volume</span>
          </div>
        )}
      </div>
    </div>
  );
}

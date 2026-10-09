import { useState, useMemo } from "react";

/**
 * Interactive SVG Donut / Pie Chart for Booking Statuses & Categories
 * Features hover slice interaction, center summary metric, and responsive legend.
 */
export default function StatusDonutChart({
  data = [], // [{ label: "Confirmed", count: 12, color: "#3b82f6" }, ...]
  size = 190,
  strokeWidth = 26,
  centerTitle = "Total",
  centerSubtitle = "Bookings",
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + (d.count || 0), 0);
  }, [data]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate SVG stroke dashes for each segment
  let accumulatedPercent = 0;
  const segments = useMemo(() => {
    if (total === 0) return [];
    let acc = 0;
    return data.map((d) => {
      const percent = (d.count || 0) / total;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -acc * circumference;
      acc += percent;
      return {
        ...d,
        percent: Math.round(percent * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [data, total, circumference]);

  const activeSegment = hoveredIdx !== null ? segments[hoveredIdx] : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        flexWrap: "wrap",
        gap: "20px",
        width: "100%",
        padding: "6px 0",
      }}
    >
      {/* SVG Donut Circle */}
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)", overflow: "visible" }}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--border, #e2e8f0)"
            strokeWidth={strokeWidth}
            strokeOpacity={0.4}
          />

          {/* Slices */}
          {total > 0 &&
            segments.map((seg, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color || "#3b82f6"}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="butt"
                  style={{
                    cursor: "pointer",
                    transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.65,
                  }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              );
            })}
        </svg>

        {/* Center Text (shows Total or Hovered Segment) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              fontFamily: "var(--font-display, inherit)",
              color: activeSegment ? activeSegment.color : "var(--text, #1e293b)",
              lineHeight: 1.1,
              transition: "color 0.15s ease",
            }}
          >
            {activeSegment ? activeSegment.count : total}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-muted, #64748b)",
              marginTop: "2px",
            }}
          >
            {activeSegment ? `${activeSegment.percent}%` : centerSubtitle}
          </span>
        </div>
      </div>

      {/* Rich Legend Breakdown */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flex: 1,
          minWidth: "150px",
          maxWidth: "240px",
        }}
      >
        {segments.map((seg, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: "8px",
                background: isHovered ? "var(--bg-inset, rgba(0,0,0,0.03))" : "transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: seg.color || "#3b82f6",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: isHovered ? 700 : 500,
                    color: "var(--text, #1e293b)",
                  }}
                >
                  {seg.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
                  {seg.count}
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  ({seg.percent}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import StatusDonutChart from "./StatusDonutChart";

/**
 * Customer Personal Travel Analytics
 * Strictly personal metrics: personal trip history, spending summary, and booking status breakdown.
 * Does NOT expose company-wide revenue, fleet data, or admin/staff metrics.
 */
export default function CustomerAnalytics({ customerBookings = [], userName = "" }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 1. Personal Spending & Trip Summary
  const personalStats = useMemo(() => {
    const totalSpent = customerBookings
      .filter((b) => b.int_Booking_Status_Id !== 5 && b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);

    const completedTrips = customerBookings.filter(
      (b) => b.int_Booking_Status_Id === 4
    ).length;

    const activeTrips = customerBookings.filter(
      (b) => [1, 2, 3].includes(b.int_Booking_Status_Id)
    ).length;

    const cancelledTrips = customerBookings.filter(
      (b) => b.int_Booking_Status_Id === 5 || b.status === "cancelled"
    ).length;

    return {
      totalSpent,
      totalTrips: customerBookings.length,
      completedTrips,
      activeTrips,
      cancelledTrips,
    };
  }, [customerBookings]);

  // 2. Personal Monthly Spend History (Aggregated strictly by booking month)
  const monthlySpendData = useMemo(() => {
    const monthMap = {};
    // Last 6 months labels
    customerBookings.forEach((b) => {
      if (b.int_Booking_Status_Id === 5 || b.status === "cancelled") return;
      const rawDate = b.dte_Rental_Start_Date || b.createdAt;
      const d = rawDate ? new Date(rawDate) : new Date();
      const monthKey = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      monthMap[monthKey] = (monthMap[monthKey] || 0) + (b.dbl_Net_Amount || 0);
    });

    return Object.entries(monthMap).map(([month, amount]) => ({
      month,
      amount,
    }));
  }, [customerBookings]);

  // 3. Status Breakdown Data for Donut Chart
  const statusDonutData = useMemo(() => {
    return [
      { label: "Completed", count: personalStats.completedTrips, color: "#10b981" },
      { label: "Active / Confirmed", count: personalStats.activeTrips, color: "#3b82f6" },
      { label: "Cancelled", count: personalStats.cancelledTrips, color: "#ef4444" },
    ].filter((s) => s.count > 0);
  }, [personalStats]);

  if (!customerBookings || customerBookings.length === 0) {
    return null; // Do not display analytics if customer has no bookings yet
  }

  const maxMonthSpend = Math.max(...monthlySpendData.map((m) => m.amount), 1);

  return (
    <div
      style={{
        background: "var(--bg-elevated, #ffffff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "var(--radius-lg, 16px)",
        padding: "20px 24px",
        marginBottom: "28px",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header with Collapse Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.2rem" }}>📊</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
              My Travel & Spending Analytics
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {userName ? `Personal summary for ${userName}` : "Your rental history and spend breakdown"}
            </p>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          {isExpanded ? "Hide ▲" : "Show Insights ▼"}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: "20px" }}>
          {/* Personal KPI Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "var(--bg-inset)",
                borderRadius: "10px",
                borderLeft: "3px solid #3b82f6",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Total Spent
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", marginTop: "4px" }}>
                ₹{personalStats.totalSpent.toLocaleString("en-IN")}
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: "var(--bg-inset)",
                borderRadius: "10px",
                borderLeft: "3px solid #8b5cf6",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Total Bookings
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", marginTop: "4px" }}>
                {personalStats.totalTrips} rides
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: "var(--bg-inset)",
                borderRadius: "10px",
                borderLeft: "3px solid #10b981",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Completed
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", marginTop: "4px" }}>
                {personalStats.completedTrips} trips
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: "var(--bg-inset)",
                borderRadius: "10px",
                borderLeft: "3px solid #f59e0b",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Active / Upcoming
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", marginTop: "4px" }}>
                {personalStats.activeTrips}
              </div>
            </div>
          </div>

          {/* Charts Row: Monthly Spend Bars & Status Donut */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: monthlySpendData.length > 0 ? "1fr 1fr" : "1fr",
              gap: "20px",
              paddingTop: "14px",
              borderTop: "1px dashed var(--border)",
            }}
          >
            {/* Monthly Spend Bar */}
            {monthlySpendData.length > 0 && (
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>
                  📅 Monthly Rental Spending
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {monthlySpendData.map((m, idx) => {
                    const pct = Math.round((m.amount / maxMonthSpend) * 100);
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: 48, flexShrink: 0 }}>
                          {m.month}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: "7px",
                            background: "var(--border)",
                            borderRadius: "999px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.max(pct, 5)}%`,
                              background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
                              borderRadius: "999px",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", width: 68, textAlign: "right" }}>
                          ₹{m.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trip Status Breakdown */}
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
                🎯 Trip Status Distribution
              </div>
              <StatusDonutChart
                data={statusDonutData}
                size={140}
                strokeWidth={20}
                centerTitle={personalStats.totalTrips}
                centerSubtitle="Rides"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

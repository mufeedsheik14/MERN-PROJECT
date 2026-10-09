import { useState, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useBookings } from "../../context/BookingContext";
import { useFleet } from "../../context/FleetContext";
import { useCustomerDocuments } from "../../context/CustomerDocumentContext";
import { useSearchParams } from "react-router-dom";
import ConfirmModal from "../ConfirmModal";
import StaffDocumentManager from "../documents/StaffDocumentManager";
import StaffKycReviewer from "../documents/StaffKycReviewer";
import FleetLiveTracking from "./FleetLiveTracking";
import AddVehicleModal from "./AddVehicleModal";
import StaffProfileCard from "./StaffProfileCard";
import {
  bookingStatuses,
  getBranchName,
  getCategoryName,
  getBrandName,
  getFuelName,
  getTransmissionName,
} from "../../data/mockData";
import ChartCard from "../charts/ChartCard";
import RevenueTrendChart from "../charts/RevenueTrendChart";
import VehicleUtilizationChart from "../charts/VehicleUtilizationChart";
import StatusDonutChart from "../charts/StatusDonutChart";
import ReportsExportSection from "./ReportsExportSection";


export default function StaffDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { bookings, updateBookingStatus, cancelBooking } = useBookings();
  const { vehicles, setVehicleStatus } = useFleet();

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "bookings";
  const [activeTab, setActiveTab] = useState(initialTab); // "bookings" | "fleet" | "documents" | "kyc" | "tracking" | "profile"
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingBookingId, setTrackingBookingId] = useState(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  const { getAllCustomerDocs } = useCustomerDocuments();

  // Count pending KYC docs for badge
  const kycPendingCount = useMemo(() => {
    const allDocs = getAllCustomerDocs();
    return allDocs.reduce((count, r) => {
      return count + Object.values(r.documents).filter((d) => d.status === "pending").length;
    }, 0);
  }, [getAllCustomerDocs]);

  const branchId = user?.int_Branch_Id || 1;
  const branchName = getBranchName(branchId);

  // Filter bookings strictly for this branch
  const branchBookings = useMemo(() => {
    return bookings.filter((b) => b.int_Pickup_Branch_Id === branchId);
  }, [bookings, branchId]);

  // Filter branch vehicles strictly
  const branchVehicles = useMemo(() => {
    return vehicles.filter((v) => v.int_Branch_Id === branchId);
  }, [vehicles, branchId]);

  // Metrics for this branch
  const branchStats = useMemo(() => {
    const revenue = branchBookings.reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);
    const active = branchBookings.filter((b) => ![4, 5].includes(b.int_Booking_Status_Id));
    const maintenance = branchVehicles.filter((v) => v.txt_Vehicle_Status === "M");

    return {
      totalVehicles: branchVehicles.length,
      totalBookings: branchBookings.length,
      activeBookings: active.length,
      maintenanceVehicles: maintenance.length,
      revenue,
    };
  }, [branchBookings, branchVehicles]);

  const branchOngoingCount = useMemo(() => {
    return branchBookings.filter((b) => b.int_Booking_Status_Id === 3).length;
  }, [branchBookings]);

  // Filtered list by search
  const filteredBookings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return branchBookings;
    return branchBookings.filter(
      (b) =>
        b.txt_Booking_Number?.toLowerCase().includes(query) ||
        b.customerName?.toLowerCase().includes(query) ||
        b.vehicleLabel?.toLowerCase().includes(query)
    );
  }, [branchBookings, searchQuery]);

  // Branch Rental Trend Time-Series Data
  const branchTrendData = useMemo(() => {
    if (!branchBookings || branchBookings.length === 0) return [];
    const groups = {};
    const sorted = [...branchBookings].sort((a, b) => {
      const da = new Date(a.dte_Rental_Start_Date || a.createdAt || Date.now());
      const db = new Date(b.dte_Rental_Start_Date || b.createdAt || Date.now());
      return da - db;
    });

    sorted.forEach((b) => {
      const d = new Date(b.dte_Rental_Start_Date || b.createdAt || Date.now());
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!groups[label]) {
        groups[label] = { label, date: d.toISOString().slice(0, 10), revenue: 0, bookings: 0 };
      }
      groups[label].revenue += b.dbl_Net_Amount || 0;
      groups[label].bookings += 1;
    });

    return Object.values(groups);
  }, [branchBookings]);

  // Branch Booking Status Distribution for Donut Chart
  const branchStatusData = useMemo(() => {
    const statusColorMap = {
      1: "#f59e0b",
      2: "#3b82f6",
      3: "#8b5cf6",
      4: "#10b981",
      5: "#ef4444",
    };

    return bookingStatuses.map((s) => {
      const count = branchBookings.filter((b) => b.int_Booking_Status_Id === s.int_Booking_Status_Id).length;
      return {
        id: s.int_Booking_Status_Id,
        label: t(s.key),
        count,
        color: statusColorMap[s.int_Booking_Status_Id] || "#64748b",
      };
    });
  }, [branchBookings, t]);

  // Branch Vehicle Utilization Data
  const branchFleetUtilizationData = useMemo(() => {
    return branchVehicles.map((v) => {
      const vBookings = branchBookings.filter((b) => b.int_Vehicle_Id === v.int_Vehicle_Id);
      const rev = vBookings.reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);
      const brandName = (v.int_Brand_Id ? getBrandName(v.int_Brand_Id) : v.brand) || "";
      const modelName = v.txt_Model_Name || v.model || v.name || "";
      let vehicleName = "";
      if (brandName && modelName) {
        vehicleName = modelName.toLowerCase().includes(brandName.toLowerCase())
          ? modelName
          : `${brandName} ${modelName}`;
      } else {
        vehicleName = brandName || modelName || (v.int_Vehicle_Id ? `Vehicle #${v.int_Vehicle_Id}` : (v.id ? `Vehicle #${v.id}` : "Unknown Vehicle"));
      }
      const regNumber = v.txt_Registration_Number || v.plateNumber || v.regNumber || "";

      return {
        id: v.int_Vehicle_Id,
        name: vehicleName,
        plate: regNumber,
        category: getCategoryName(v.int_Category_Id),
        count: vBookings.length,
        revenue: rev,
        status: v.txt_Vehicle_Status,
      };
    });
  }, [branchVehicles, branchBookings]);


  return (
    <div className="container" style={{ padding: "32px 16px" }}>
      {/* Staff Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(46, 125, 79, 0.08) 100%)",
          border: "1px solid rgba(14, 165, 233, 0.3)",
          borderRadius: "var(--radius)",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span className="role-pill role-pill-staff">🏢 {t("role_staff")}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Logged in as {user?.name}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>
            {t("staff_dashboard_title")} — {branchName}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
            Manage bookings, handovers, returns, and vehicle readiness for your branch.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddVehicleModal(true)}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            + {t("add_vehicle")}
          </button>
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-elevated)",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              fontWeight: 700,
              fontSize: "0.88rem",
            }}
          >
            📍 Branch #{branchId}
          </div>
        </div>
      </div>

      {/* Branch Metric Cards */}
      <div className="stat-grid" style={{ margin: "0 0 32px 0" }}>
        <div className="stat-card" style={{ borderLeftColor: "#0284c7" }}>
          <div className="stat-label">Branch Fleet</div>
          <div className="stat-value">{branchStats.totalVehicles}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "var(--signal-amber)" }}>
          <div className="stat-label">{t("active_bookings")}</div>
          <div className="stat-value">{branchStats.activeBookings}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "var(--signal-green)" }}>
          <div className="stat-label">Branch Revenue</div>
          <div className="stat-value">₹{branchStats.revenue.toLocaleString("en-IN")}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: branchStats.maintenanceVehicles > 0 ? "var(--signal-red)" : "var(--border)" }}>
          <div className="stat-label">In Maintenance</div>
          <div className="stat-value">{branchStats.maintenanceVehicles}</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "bookings" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "bookings" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          📋 Branch Bookings ({branchBookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fleet")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "fleet" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "fleet" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          🚘 {t("branch_vehicles")} ({branchVehicles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "documents" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "documents" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          📄 Vehicle Documents
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("kyc")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "kyc" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "kyc" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🪪 Customer KYC
          {kycPendingCount > 0 && (
            <span
              style={{
                background: "var(--signal-amber)",
                color: "#fff",
                borderRadius: "999px",
                fontSize: "0.7rem",
                padding: "1px 6px",
                fontWeight: 700,
              }}
            >
              {kycPendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tracking")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "tracking" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "tracking" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🛰️ Live Tracking ({branchOngoingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "profile" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "profile" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          👤 Staff Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "analytics" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "analytics" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          📊 Branch Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "reports" ? "3px solid var(--accent)" : "3px solid transparent",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "reports" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          📗 Reports / Export
        </button>
      </div>

      {/* TAB: BRANCH OPERATIONAL ANALYTICS */}
      {activeTab === "analytics" && (
        <div style={{ marginBottom: "36px" }}>
          {/* Row 1: Rental Trend & Status Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {/* Daily / Weekly Rental Trend Line Chart */}
            <ChartCard
              title="Rental Activity Trends"
              subtitle={`Booking frequency and volume for ${branchName}`}
              icon="📈"
              badge="Operational"
              empty={branchTrendData.length === 0}
              emptyMessage="No rental transactions recorded for this branch yet."
            >
              <RevenueTrendChart
                data={branchTrendData}
                height={220}
                activeMetric="bookings"
              />
            </ChartCard>

            {/* Booking Status Donut Chart */}
            <ChartCard
              title="Booking Status Proportions"
              subtitle={`Status breakdown for ${branchName} (${branchBookings.length} total)`}
              icon="🎯"
              badge="Live Status"
              empty={branchBookings.length === 0}
              emptyMessage="No bookings for this branch."
            >
              <StatusDonutChart
                data={branchStatusData}
                size={165}
                strokeWidth={22}
                centerSubtitle="Rides"
              />
            </ChartCard>
          </div>

          {/* Row 2: Branch Vehicle Availability & Utilization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
            <ChartCard
              title="Branch Fleet Utilization"
              subtitle={`Rental activity and demand per vehicle at ${branchName}`}
              icon="🏎️"
              badge={`${branchVehicles.length} Vehicles`}
              empty={branchFleetUtilizationData.length === 0}
              emptyMessage="No vehicles assigned to this branch."
            >
              <VehicleUtilizationChart
                vehicles={branchFleetUtilizationData}
                maxItems={8}
                showToggle={true}
              />
            </ChartCard>
          </div>

          {/* Row 3: Operational Reports & Export Section */}
          <ReportsExportSection role="staff" branchId={branchId} />
        </div>
      )}

      {/* TAB: BRANCH REPORTS DIRECT VIEW */}
      {activeTab === "reports" && (
        <ReportsExportSection role="staff" branchId={branchId} />
      )}

      {/* TAB 1: BRANCH BOOKINGS */}
      {activeTab === "bookings" && (

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <input
              placeholder="Search reference # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: "var(--bg-inset)",
                color: "var(--text)",
                fontSize: "0.88rem",
                maxWidth: "320px",
                width: "100%",
              }}
            />
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {filteredBookings.length} bookings at {branchName}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">{t("no_bookings")}</div>
          ) : (
            filteredBookings.map((b) => {
              const status = b.int_Booking_Status_Id;
              return (
                <div
                  key={b.txt_Booking_Number}
                  className="booking-row"
                  style={{
                    alignItems: "flex-start",
                    gap: "16px",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                        #{b.txt_Booking_Number}
                      </span>
                      <span className={`badge badge-${status}`}>
                        {t(bookingStatuses.find((s) => s.int_Booking_Status_Id === status)?.key || "status_pending")}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: b.paymentStatus === "Paid" ? "rgba(16, 185, 129, 0.15)" : b.paymentStatus === "Failed" ? "rgba(239, 68, 68, 0.15)" : "var(--accent-subtle)",
                          color: b.paymentStatus === "Paid" ? "var(--signal-green)" : b.paymentStatus === "Failed" ? "var(--signal-red)" : "var(--accent)",
                        }}
                      >
                        Payment: {b.paymentStatus || "Pending"}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, marginTop: "4px", fontSize: "0.95rem" }}>
                      🚗 {b.vehicleLabel}
                    </div>

                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                      👤 {b.customerName || "Customer"} · 📞 {b.phone || "-"} · ✉️ {b.email || "-"}
                    </div>

                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                      📅 {b.dte_Pickup_Date} → {b.dte_Return_Date} ({b.int_Total_Days} days)
                    </div>

                    {b.paymentStatus === "Paid" && (
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px", background: "var(--bg-base, #0d1117)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                        💳 Razorpay ID: <strong style={{ color: "var(--signal-green)" }}>{b.razorpayPaymentId || "-"}</strong>
                        {b.razorpayOrderId && <span> · Order: <code>{b.razorpayOrderId}</code></span>}
                        {b.paidAt && <span> · Paid At: {new Date(b.paidAt).toLocaleString()}</span>}
                      </div>
                    )}
                  </div>

                  {/* Financial Details */}
                  <div style={{ textAlign: "right", minWidth: "120px" }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Net Payable
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem" }}>
                      ₹{b.dbl_Net_Amount?.toFixed(0)}
                    </div>
                  </div>

                  {/* Booking Lifecycle Action Controls */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "180px" }}>
                    {status === 1 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "8px 14px", fontSize: "0.82rem", width: "100%" }}
                        onClick={() => updateBookingStatus(b.txt_Booking_Number, 2)}
                      >
                        ✓ Confirm Booking
                      </button>
                    )}

                    {status === 2 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          padding: "8px 14px",
                          fontSize: "0.82rem",
                          width: "100%",
                          background: "var(--signal-green)",
                        }}
                        onClick={() => updateBookingStatus(b.txt_Booking_Number, 3)}
                      >
                        🔑 Hand Over Keys (Start)
                      </button>
                    )}

                    {status === 3 && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: "8px 14px",
                            fontSize: "0.82rem",
                            width: "100%",
                            background: "#0284c7",
                            marginBottom: "6px",
                          }}
                          onClick={() => updateBookingStatus(b.txt_Booking_Number, 4)}
                        >
                          📥 Complete Return
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            padding: "7px 14px",
                            fontSize: "0.82rem",
                            width: "100%",
                            background: "var(--accent-subtle)",
                            color: "var(--accent)",
                            borderColor: "var(--accent)",
                            marginBottom: "6px",
                          }}
                          onClick={() => {
                            setTrackingBookingId(b.txt_Booking_Number);
                            setActiveTab("tracking");
                          }}
                        >
                          🛰️ Track Live GPS
                        </button>
                      </>
                    )}

                    {status !== 5 && status !== 4 && (
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }}
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: t("cancel_booking"),
                            message: `${t("confirm_cancel_booking")} (Booking #${b.txt_Booking_Number})`,
                            isDanger: true,
                            onConfirm: () => cancelBooking(b.txt_Booking_Number),
                          });
                        }}
                      >
                        {t("cancel_booking")}
                      </button>
                    )}

                    {status === 4 && (
                      <div style={{ color: "var(--signal-green)", fontSize: "0.85rem", fontWeight: 600, textAlign: "center" }}>
                        ✓ Rental Completed
                      </div>
                    )}
                    {status === 5 && (
                      <div style={{ color: "var(--signal-red)", fontSize: "0.85rem", fontWeight: 600, textAlign: "center" }}>
                        ✕ Cancelled
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: BRANCH FLEET */}
      {activeTab === "fleet" && (
        <div>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-inset)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 16px" }}>Vehicle</th>
                  <th style={{ padding: "12px 16px" }}>Registration</th>
                  <th style={{ padding: "12px 16px" }}>Category</th>
                  <th style={{ padding: "12px 16px" }}>Fuel / Transmission</th>
                  <th style={{ padding: "12px 16px" }}>Current Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Maintenance Action</th>
                </tr>
              </thead>
              <tbody>
                {branchVehicles.map((v) => (
                  <tr key={v.int_Vehicle_Id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {getBrandName(v.int_Brand_Id)} {v.txt_Model_Name}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {v.txt_Registration_Number}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{getCategoryName(v.int_Category_Id)}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      {getFuelName(v.int_Fuel_Type_Id)} · {getTransmissionName(v.int_Transmission_Id)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        className="badge"
                        style={{
                          background:
                            v.txt_Vehicle_Status === "A"
                              ? "rgba(46,125,79,0.16)"
                              : v.txt_Vehicle_Status === "M"
                              ? "rgba(198,138,18,0.16)"
                              : "rgba(181,67,45,0.14)",
                          color:
                            v.txt_Vehicle_Status === "A"
                              ? "var(--signal-green)"
                              : v.txt_Vehicle_Status === "M"
                              ? "var(--signal-amber)"
                              : "var(--signal-red)",
                        }}
                      >
                        {v.txt_Vehicle_Status === "A"
                          ? t("available")
                          : v.txt_Vehicle_Status === "M"
                          ? t("maintenance")
                          : t("inactive")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        className={v.txt_Vehicle_Status === "A" ? "btn-danger" : "btn btn-primary"}
                        style={{
                          padding: "6px 14px",
                          fontSize: "0.8rem",
                          borderRadius: "999px",
                        }}
                        onClick={() => {
                          const nextStatus = v.txt_Vehicle_Status === "A" ? "M" : "A";
                          setModalConfig({
                            isOpen: true,
                            title: t("confirm_title"),
                            message: `${t("confirm_maintenance")} (${getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name})`,
                            onConfirm: () => setVehicleStatus(v.int_Vehicle_Id, nextStatus),
                          });
                        }}
                      >
                        {v.txt_Vehicle_Status === "A" ? `🔧 ${t("mark_maintenance")}` : `✨ ${t("mark_available")}`}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VEHICLE DOCUMENTS */}
      {activeTab === "documents" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.4rem" }}>Vehicle Documents</h2>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.88rem" }}>
              Upload and manage Registration Certificates and Insurance documents for fleet vehicles.
            </p>
          </div>
          <StaffDocumentManager />
        </div>
      )}

      {/* TAB 4: CUSTOMER KYC DOCUMENTS */}
      {activeTab === "kyc" && (
        <div>
          <StaffKycReviewer />
        </div>
      )}

      {/* TAB 5: LIVE FLEET TRACKING */}
      {activeTab === "tracking" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.4rem" }}>Branch Fleet Live Tracking</h2>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.88rem" }}>
              Active rental vehicles from your branch currently on the road with real-time phone GPS tracking.
            </p>
          </div>
          <FleetLiveTracking branchFilter={user?.int_Branch_Id} initialBookingId={trackingBookingId} />
        </div>
      )}

      {/* TAB 6: STAFF PROFILE */}
      {activeTab === "profile" && (
        <StaffProfileCard />
      )}

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        branchLock={branchId}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isDanger={modalConfig.isDanger}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig({ isOpen: false })}
      />
    </div>
  );
}

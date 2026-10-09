import { useState, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useBookings } from "../../context/BookingContext";
import { useFleet } from "../../context/FleetContext";
import ConfirmModal from "../ConfirmModal";
import StaffKycReviewer from "../documents/StaffKycReviewer";
import FleetLiveTracking from "./FleetLiveTracking";
import AddVehicleModal from "./AddVehicleModal";
import { useCustomerDocuments } from "../../context/CustomerDocumentContext";
import {
  branches,
  bookingStatuses,
  getBranchName,
  getCategoryName,
  getBrandName,
} from "../../data/mockData";
import ChartCard from "../charts/ChartCard";
import KpiStatsGrid from "../charts/KpiStatsGrid";
import RevenueTrendChart from "../charts/RevenueTrendChart";
import VehicleUtilizationChart from "../charts/VehicleUtilizationChart";
import StatusDonutChart from "../charts/StatusDonutChart";
import BranchPerformanceChart from "../charts/BranchPerformanceChart";
import ReportsExportSection from "./ReportsExportSection";


export default function AdminDashboard() {
  const { t } = useLanguage();
  const {
    user,
    users,
    createStaff,
    updateStaff,
    toggleStaffStatus,
    setStaffAccountStatus,
  } = useAuth();
  const { bookings, updateBookingStatus, cancelBooking } = useBookings();
  const {
    vehicles,
    coupons,
    categories,
    brands,
    addVehicle,
    deleteVehicle,
    setVehicleStatus,
    addCoupon,
    deleteCoupon,
  } = useFleet();

  const [activeTab, setActiveTab] = useState("analytics"); // analytics | fleet | staff | coupons | bookings | kyc | tracking
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const [trackingBookingId, setTrackingBookingId] = useState(null);

  // Filter state for fleet and bookings
  const [fleetBranchFilter, setFleetBranchFilter] = useState("");
  const [bookingBranchFilter, setBookingBranchFilter] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");

  // Add Vehicle modal state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Add Staff form state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    username: "",
    password: "",
    int_Branch_Id: 1,
    employeeId: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    accountStatus: "Active",
  });
  const [staffError, setStaffError] = useState("");

  // Edit Staff modal state
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editStaffTarget, setEditStaffTarget] = useState(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: "",
    employeeId: "",
    int_Branch_Id: 1,
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    accountStatus: "Active",
  });
  const [editStaffError, setEditStaffError] = useState("");

  // Staff search and branch filters
  const [staffSearch, setStaffSearch] = useState("");
  const [staffBranchFilter, setStaffBranchFilter] = useState("");

  // Add Coupon form state
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    txt_Coupon_Code: "",
    dbl_Discount_Percent: 15,
    dbl_Max_Discount_Amount: 1000,
    dte_Valid_To: "2027-12-31",
  });

  // --- Analytics Calculations ---
  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);
    const activeBookings = bookings.filter((b) => ![4, 5].includes(b.int_Booking_Status_Id));
    const maintenanceVehicles = vehicles.filter((v) => v.txt_Vehicle_Status === "M");
    const bookedVehicleIds = new Set(activeBookings.map((b) => b.int_Vehicle_Id));
    const utilization = vehicles.length > 0 ? ((bookedVehicleIds.size / vehicles.length) * 100).toFixed(1) : "0";

    return {
      totalVehicles: vehicles.length,
      totalBookings: bookings.length,
      totalRevenue,
      activeBookings: activeBookings.length,
      maintenanceVehicles: maintenanceVehicles.length,
      utilization,
    };
  }, [bookings, vehicles]);

  // Branch Performance
  const branchPerformance = useMemo(() => {
    return branches.map((b) => {
      const bVehicles = vehicles.filter((v) => v.int_Branch_Id === b.int_Branch_Id);
      const bBookings = bookings.filter((bk) => bk.int_Pickup_Branch_Id === b.int_Branch_Id);
      const bRevenue = bBookings.reduce((sum, bk) => sum + (bk.dbl_Net_Amount || 0), 0);
      return {
        id: b.int_Branch_Id,
        name: b.txt_Branch_Name,
        city: b.txt_City,
        fleetCount: bVehicles.length,
        bookingCount: bBookings.length,
        revenue: bRevenue,
      };
    });
  }, [vehicles, bookings]);

  // Top Vehicles
  const topVehicles = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => {
      let label = b.vehicleLabel;
      if (!label && b.int_Vehicle_Id) {
        const v = vehicles.find((veh) => veh.int_Vehicle_Id === b.int_Vehicle_Id);
        if (v) {
          const brandName = (v.int_Brand_Id ? getBrandName(v.int_Brand_Id) : v.brand) || "";
          const modelName = v.txt_Model_Name || v.model || v.name || "";
          if (brandName && modelName) {
            label = modelName.toLowerCase().includes(brandName.toLowerCase())
              ? modelName
              : `${brandName} ${modelName}`;
          } else {
            label = brandName || modelName;
          }
        }
      }
      const key = label || (b.int_Vehicle_Id ? `Vehicle #${b.int_Vehicle_Id}` : "Unknown Vehicle");
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [bookings, vehicles]);

  // Status Breakdown
  const statusCounts = useMemo(() => {
    return bookingStatuses.map((s) => {
      const count = bookings.filter((b) => b.int_Booking_Status_Id === s.int_Booking_Status_Id).length;
      return { ...s, count };
    });
  }, [bookings]);

  // Revenue & Booking Trend Time-Series Data
  const trendData = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    const groups = {};
    const sorted = [...bookings].sort((a, b) => {
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
  }, [bookings]);

  // Vehicle Utilization List Data
  const vehicleUtilizationData = useMemo(() => {
    return vehicles.map((v) => {
      const vBookings = bookings.filter((b) => b.int_Vehicle_Id === v.int_Vehicle_Id);
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
  }, [vehicles, bookings]);

  // Status Breakdown for Donut Chart
  const statusChartData = useMemo(() => {
    const statusColorMap = {
      1: "#f59e0b", // Pending - amber
      2: "#3b82f6", // Confirmed - blue
      3: "#8b5cf6", // Ongoing - purple
      4: "#10b981", // Completed - green
      5: "#ef4444", // Cancelled - red
    };

    return bookingStatuses.map((s) => {
      const count = bookings.filter((b) => b.int_Booking_Status_Id === s.int_Booking_Status_Id).length;
      return {
        id: s.int_Booking_Status_Id,
        label: t(s.key),
        count,
        color: statusColorMap[s.int_Booking_Status_Id] || "#64748b",
      };
    });
  }, [bookings, t]);


  // Filtered Bookings for "All Bookings" Tab
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const branchMatch = !bookingBranchFilter || String(b.int_Pickup_Branch_Id) === bookingBranchFilter;
      const searchLower = bookingSearch.toLowerCase().trim();
      const searchMatch =
        !searchLower ||
        b.txt_Booking_Number?.toLowerCase().includes(searchLower) ||
        b.customerName?.toLowerCase().includes(searchLower) ||
        b.vehicleLabel?.toLowerCase().includes(searchLower);
      return branchMatch && searchMatch;
    });
  }, [bookings, bookingBranchFilter, bookingSearch]);

  // Filtered Vehicles for "Fleet" Tab
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      return !fleetBranchFilter || String(v.int_Branch_Id) === fleetBranchFilter;
    });
  }, [vehicles, fleetBranchFilter]);

  // Staff members list with search and branch filter
  const staffList = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== "staff") return false;
      if (staffBranchFilter && String(u.int_Branch_Id) !== staffBranchFilter) return false;
      if (!staffSearch.trim()) return true;
      const q = staffSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.emergencyContactName?.toLowerCase().includes(q)
      );
    });
  }, [users, staffBranchFilter, staffSearch]);

  // KYC pending count for admin badge
  const { getAllCustomerDocs } = useCustomerDocuments();
  const kycPendingCount = useMemo(() => {
    return getAllCustomerDocs().reduce((count, r) => {
      return count + Object.values(r.documents).filter((d) => d.status === "pending").length;
    }, 0);
  }, [getAllCustomerDocs]);

  const ongoingRentalsCount = useMemo(() => {
    return bookings.filter((b) => b.int_Booking_Status_Id === 3).length;
  }, [bookings]);

  // Handle Add Staff
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffError("");
    if (!staffForm.username.trim() || !staffForm.password || !staffForm.name.trim()) {
      setStaffError(t("field_required"));
      return;
    }
    const result = await createStaff(staffForm);
    if (!result.success) {
      setStaffError(result.message || t(result.errorKey || "username_taken"));
      return;
    }
    setStaffForm({
      name: "",
      username: "",
      password: "",
      int_Branch_Id: 1,
      employeeId: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      accountStatus: "Active",
    });
    setShowAddStaffModal(false);
  };

  // Open Edit Staff Modal
  const handleOpenEditStaff = (staff) => {
    setEditStaffTarget(staff);
    setEditStaffForm({
      name: staff.name || "",
      employeeId: staff.employeeId || "",
      int_Branch_Id: staff.int_Branch_Id || 1,
      email: staff.email || "",
      phone: staff.phone || "",
      address: staff.address || "",
      dateOfBirth: staff.dateOfBirth || "",
      emergencyContactName: staff.emergencyContactName || "",
      emergencyContactPhone: staff.emergencyContactPhone || "",
      accountStatus: staff.accountStatus || (staff.active !== false ? "Active" : "Deactivated"),
    });
    setEditStaffError("");
    setShowEditStaffModal(true);
  };

  // Save Edit Staff
  const handleSaveEditStaff = async (e) => {
    e.preventDefault();
    setEditStaffError("");
    if (!editStaffForm.name.trim()) {
      setEditStaffError("Full Name is required.");
      return;
    }
    const result = await updateStaff(editStaffTarget.username, editStaffForm);
    if (!result.success) {
      setEditStaffError(result.message || "Failed to update staff member.");
      return;
    }
    setShowEditStaffModal(false);
    setEditStaffTarget(null);
  };

  // Handle Add Coupon
  const handleSaveCoupon = (e) => {
    e.preventDefault();
    if (!couponForm.txt_Coupon_Code.trim()) return;
    addCoupon(couponForm);
    setShowAddCouponModal(false);
    setCouponForm({
      txt_Coupon_Code: "",
      dbl_Discount_Percent: 15,
      dbl_Max_Discount_Amount: 1000,
      dte_Valid_To: "2027-12-31",
    });
  };

  return (
    <div className="container" style={{ padding: "32px 16px" }}>
      {/* Admin Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(224, 99, 43, 0.08) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
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
            <span className="role-pill role-pill-admin">👑 {t("role_admin")}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Logged in as {user?.name}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>{t("admin_dashboard_title")}</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
            Global fleet oversight, branch analytics, staff accounts, and system promotions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddVehicleModal(true)}
            style={{ fontSize: "0.85rem", padding: "10px 18px" }}
          >
            + {t("add_vehicle")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowAddStaffModal(true)}
            style={{ fontSize: "0.85rem", padding: "10px 18px" }}
          >
            + {t("add_staff")}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "28px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "analytics", label: `📊 ${t("tab_analytics")}` },
          { id: "reports", label: `📗 Reports / Export` },
          { id: "fleet", label: `🚘 ${t("tab_fleet")} (${vehicles.length})` },
          { id: "staff", label: `👥 ${t("tab_staff")} (${staffList.length})` },
          { id: "coupons", label: `🏷️ ${t("tab_coupons")} (${coupons.length})` },
          { id: "bookings", label: `📋 ${t("tab_bookings")} (${bookings.length})` },
          { id: "kyc", label: `🪪 Customer KYC${kycPendingCount > 0 ? ` (${kycPendingCount} ⏳)` : ""}` },
          { id: "tracking", label: `🛰️ Live Fleet Tracking (${ongoingRentalsCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid var(--accent)" : "3px solid transparent",
              fontWeight: 700,
              fontSize: "0.92rem",
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GLOBAL ANALYTICS */}
      {activeTab === "analytics" && (
        <div>
          {/* Executive KPI Cards */}
          <KpiStatsGrid
            items={[
              {
                title: t("total_revenue"),
                value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
                icon: "💰",
                color: "#10b981",
                badge: "Gross Revenue",
                subtitle: `Across ${bookings.length} reservations`,
              },
              {
                title: t("total_bookings"),
                value: `${stats.totalBookings} Rides`,
                icon: "📋",
                color: "#3b82f6",
                badge: "All Time",
                subtitle: `${stats.activeBookings} active reservations`,
              },
              {
                title: "Active Rentals",
                value: ongoingRentalsCount || stats.activeBookings,
                icon: "🚗",
                color: "#8b5cf6",
                badge: "On Road",
                subtitle: "Vehicles with customers right now",
              },
              {
                title: t("fleet_utilization"),
                value: `${stats.utilization}%`,
                icon: "⚡",
                color: "#f59e0b",
                badge: `${stats.totalVehicles} Vehicles`,
                subtitle: `${stats.maintenanceVehicles} in maintenance`,
              },
            ]}
          />

          {/* Row 1: Revenue Trends & Booking Status Donut */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {/* Revenue & Booking Trends Area Chart */}
            <ChartCard
              title="Revenue & Booking Trends"
              subtitle="Daily revenue (₹) and rental volume over time"
              icon="📈"
              badge="Live Data"
              empty={trendData.length === 0}
              emptyMessage="No booking transactions recorded yet."
            >
              <RevenueTrendChart data={trendData} height={230} activeMetric="both" />
            </ChartCard>

            {/* Booking Lifecycle Breakdown Donut Chart */}
            <ChartCard
              title="Booking Status Breakdown"
              subtitle="Proportions across active, completed, and cancelled trips"
              icon="🎯"
              badge={`${bookings.length} Total`}
              empty={bookings.length === 0}
              emptyMessage="No booking status records available."
            >
              <StatusDonutChart
                data={statusChartData}
                size={170}
                strokeWidth={24}
                centerSubtitle="Total Rides"
              />
            </ChartCard>
          </div>

          {/* Row 2: Vehicle Utilization Ranking & Branch Performance */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "24px",
              marginBottom: "36px",
            }}
          >
            {/* Vehicle Utilization Bar Chart */}
            <ChartCard
              title="Vehicle Utilization"
              subtitle="Ranking fleet vehicles by booking frequency and days on road"
              icon="🏎️"
              badge={`${vehicles.length} Vehicles`}
              empty={vehicleUtilizationData.length === 0}
              emptyMessage="No fleet vehicles available."
            >
              <VehicleUtilizationChart
                vehicles={vehicleUtilizationData}
                maxItems={6}
                showToggle={true}
              />
            </ChartCard>

            {/* Branch Performance Comparison */}
            <ChartCard
              title={t("branch_performance")}
              subtitle="Multi-location revenue, fleet inventory, and rental volume"
              icon="🏢"
              badge={`${branchPerformance.length} Hubs`}
              empty={branchPerformance.length === 0}
              emptyMessage="No branch data available."
            >
              <BranchPerformanceChart branches={branchPerformance} />
            </ChartCard>
          </div>

          {/* Row 3: Reports & Export Section */}
          <ReportsExportSection role="admin" />
        </div>
      )}

      {/* TAB: REPORTS & EXPORT DIRECT VIEW */}
      {activeTab === "reports" && (
        <ReportsExportSection role="admin" />
      )}


      {/* TAB 2: FLEET INVENTORY */}
      {activeTab === "fleet" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Filter Branch:</label>
              <select
                className="lang-select"
                value={fleetBranchFilter}
                onChange={(e) => setFleetBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.int_Branch_Id} value={String(b.int_Branch_Id)}>
                    {b.txt_Branch_Name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddVehicleModal(true)}
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              + {t("add_vehicle")}
            </button>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-inset)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 16px" }}>Vehicle</th>
                  <th style={{ padding: "12px 16px" }}>Reg #</th>
                  <th style={{ padding: "12px 16px" }}>Branch</th>
                  <th style={{ padding: "12px 16px" }}>Rate / Day</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={v.int_Vehicle_Id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {getBrandName(v.int_Brand_Id)} {v.txt_Model_Name}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {v.txt_Registration_Number}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{getBranchName(v.int_Branch_Id)}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>₹{v.dbl_Daily_Rent}</td>
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
                        className="btn-ghost"
                        style={{ padding: "4px 8px", fontSize: "0.78rem", marginRight: "6px" }}
                        onClick={() => {
                          const nextStatus = v.txt_Vehicle_Status === "A" ? "M" : "A";
                          setVehicleStatus(v.int_Vehicle_Id, nextStatus);
                        }}
                      >
                        {v.txt_Vehicle_Status === "A" ? t("mark_maintenance") : t("mark_available")}
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: t("delete_vehicle"),
                            message: `${t("confirm_delete_vehicle")} (${getBrandName(v.int_Brand_Id)} ${v.txt_Model_Name} - ${v.txt_Registration_Number})`,
                            isDanger: true,
                            onConfirm: () => deleteVehicle(v.int_Vehicle_Id),
                          });
                        }}
                      >
                        {t("remove")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF MANAGEMENT */}
      {activeTab === "staff" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.3rem" }}>
                Enterprise Staff Accounts ({staffList.length})
              </h3>
              <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Admin oversight: View and manage staff personal information, employee IDs, emergency contacts, and approval status.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search staff by name, ID, phone..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  fontSize: "0.85rem",
                  minWidth: "240px",
                }}
              />
              <select
                value={staffBranchFilter}
                onChange={(e) => setStaffBranchFilter(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.int_Branch_Id} value={String(b.int_Branch_Id)}>
                    {b.txt_Branch_Name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddStaffModal(true)}
                style={{ fontSize: "0.85rem", padding: "8px 16px" }}
              >
                + {t("add_staff")}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
            {staffList.map((s) => {
              const status = s.accountStatus || (s.active !== false ? "Active" : "Deactivated");
              const isPending = status === "Pending Approval";
              const isActive = status === "Active";

              const badgeColor = isActive
                ? { bg: "rgba(46,125,79,0.16)", text: "var(--signal-green)", border: "1px solid rgba(46,125,79,0.3)" }
                : isPending
                ? { bg: "rgba(217,119,6,0.16)", text: "var(--signal-amber)", border: "1px solid rgba(217,119,6,0.3)" }
                : { bg: "rgba(181,67,45,0.14)", text: "var(--signal-red)", border: "1px solid rgba(181,67,45,0.3)" };

              return (
                <div
                  key={s.username}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                  }}
                >
                  <div>
                    {/* Header line: Name & Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{s.name}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          @{s.username} · <span style={{ color: "var(--accent)", fontWeight: 600 }}>{s.employeeId || `RR-STF-${s.int_Branch_Id}`}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          background: badgeColor.bg,
                          color: badgeColor.text,
                          border: badgeColor.border,
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        ● {status}
                      </span>
                    </div>

                    {/* Staff Personal Info Details Grid */}
                    <div
                      style={{
                        background: "var(--bg-inset)",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "0.83rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginTop: "8px",
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>🏢 Branch: </span>
                        <strong>{getBranchName(s.int_Branch_Id)}</strong> (#{s.int_Branch_Id})
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>📧 Email: </span>
                        <strong>{s.email || "Not provided"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>📱 Phone: </span>
                        <strong>{s.phone || "Not provided"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>🏠 Address: </span>
                        <span>{s.address || "Not provided"}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>🎂 Date of Birth: </span>
                        <span>{s.dateOfBirth || "Not provided"}</span>
                      </div>
                      <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "6px", marginTop: "2px" }}>
                        <span style={{ color: "var(--text-muted)" }}>🚨 Emergency Contact: </span>
                        <strong>{s.emergencyContactName || "None"}</strong>
                        {s.emergencyContactPhone && (
                          <span style={{ marginLeft: "4px", color: "var(--accent)" }}>
                            ({s.emergencyContactPhone})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border)",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: "0.82rem", padding: "6px 10px" }}
                      onClick={() => handleOpenEditStaff(s)}
                    >
                      ✏️ Edit Profile
                    </button>

                    {isPending && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          background: "var(--signal-green)",
                          borderColor: "var(--signal-green)",
                          fontSize: "0.82rem",
                          padding: "6px 12px",
                        }}
                        onClick={() => setStaffAccountStatus(s.username, "Active")}
                      >
                        ✅ Approve
                      </button>
                    )}

                    <button
                      type="button"
                      className={s.active !== false ? "btn-danger" : "btn btn-ghost"}
                      style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: s.active !== false ? t("deactivate") : t("activate"),
                          message: `${t("confirm_deactivate_staff")} (@${s.username})`,
                          isDanger: s.active !== false,
                          onConfirm: () => toggleStaffStatus(s.username),
                        });
                      }}
                    >
                      {s.active !== false ? `🚫 ${t("deactivate")}` : `✅ ${t("activate")}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: COUPONS & OFFERS */}
      {activeTab === "coupons" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3>Promotions & Coupons ({coupons.length})</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddCouponModal(true)}
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              + {t("add_coupon")}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {coupons.map((c) => (
              <div
                key={c.txt_Coupon_Code}
                style={{
                  background: "var(--bg-elevated)",
                  border: "2px dashed var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--accent)", letterSpacing: "0.05em" }}>
                      🎟️ {c.txt_Coupon_Code}
                    </div>
                    <span className="badge badge-2">{c.dbl_Discount_Percent}% OFF</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Max Discount: ₹{c.dbl_Max_Discount_Amount}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Valid until: {c.dte_Valid_To}
                  </div>
                </div>

                <div style={{ marginTop: "16px", textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                    onClick={() => {
                      setModalConfig({
                        isOpen: true,
                        title: t("delete_coupon"),
                        message: `Delete promotional coupon ${c.txt_Coupon_Code}?`,
                        isDanger: true,
                        onConfirm: () => deleteCoupon(c.txt_Coupon_Code),
                      });
                    }}
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ALL BOOKINGS */}
      {activeTab === "bookings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Search booking # or customer..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-inset)",
                  color: "var(--text)",
                  fontSize: "0.88rem",
                }}
              />
              <select
                className="lang-select"
                value={bookingBranchFilter}
                onChange={(e) => setBookingBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.int_Branch_Id} value={String(b.int_Branch_Id)}>
                    {b.txt_Branch_Name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {filteredBookings.length} booking records
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">{t("no_bookings")}</div>
          ) : (
            filteredBookings.map((b) => (
              <div className="booking-row" key={b.txt_Booking_Number} style={{ marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>
                      #{b.txt_Booking_Number}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      ({b.customerName || "Customer"})
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
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    🚗 {b.vehicleLabel} · 📍 {getBranchName(b.int_Pickup_Branch_Id)}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Dates: {b.dte_Pickup_Date} → {b.dte_Return_Date} ({b.int_Total_Days} days)
                  </div>
                  {b.paymentStatus === "Paid" && (
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px", background: "var(--bg-base, #0d1117)", padding: "3px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                      💳 Razorpay ID: <strong style={{ color: "var(--signal-green)" }}>{b.razorpayPaymentId || "-"}</strong>
                      {b.razorpayOrderId && <span> · Order: <code>{b.razorpayOrderId}</code></span>}
                      {b.paidAt && <span> · Paid At: {new Date(b.paidAt).toLocaleString()}</span>}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>
                      ₹{b.dbl_Net_Amount?.toFixed(0)}
                    </div>
                    <span className={`badge badge-${b.int_Booking_Status_Id}`}>
                      {t(bookingStatuses.find((s) => s.int_Booking_Status_Id === b.int_Booking_Status_Id)?.key || "status_pending")}
                    </span>
                  </div>

                  {/* Lifecycle Quick Status Select */}
                  <select
                    className="lang-select"
                    value={b.int_Booking_Status_Id}
                    onChange={(e) => updateBookingStatus(b.txt_Booking_Number, e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                  >
                    {bookingStatuses.map((s) => (
                      <option key={s.int_Booking_Status_Id} value={s.int_Booking_Status_Id}>
                        {t(s.key)}
                      </option>
                    ))}
                  </select>

                  {b.int_Booking_Status_Id === 3 && (
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.78rem",
                        background: "var(--accent-subtle)",
                        color: "var(--accent)",
                        borderColor: "var(--accent)",
                      }}
                      onClick={() => {
                        setTrackingBookingId(b.txt_Booking_Number);
                        setActiveTab("tracking");
                      }}
                    >
                      🛰️ Track GPS
                    </button>
                  )}

                  {b.int_Booking_Status_Id !== 5 && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: t("cancel_booking"),
                          message: t("confirm_cancel_booking"),
                          isDanger: true,
                          onConfirm: () => cancelBooking(b.txt_Booking_Number),
                        });
                      }}
                      style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                    >
                      {t("cancel")}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- MODAL: Add Vehicle --- */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
      />

      {/* --- MODAL: Add Staff --- */}
      {showAddStaffModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowAddStaffModal(false)}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "28px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Add New Staff Member</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "-6px", marginBottom: "18px" }}>
              Create an enterprise staff profile with personal information and branch assignment.
            </p>
            {staffError && <div className="alert alert-error">{staffError}</div>}

            <form onSubmit={handleSaveStaff}>
              <div className="form-row two">
                <div>
                  <label>Full Name *</label>
                  <input
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>
                <div>
                  <label>Employee ID</label>
                  <input
                    value={staffForm.employeeId}
                    onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>{t("username")} *</label>
                  <input
                    required
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    placeholder="e.g. staff_coimbatore"
                  />
                </div>
                <div>
                  <label>{t("password")} *</label>
                  <input
                    type="password"
                    required
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>{t("assign_branch")} *</label>
                  <select
                    value={staffForm.int_Branch_Id}
                    onChange={(e) => setStaffForm({ ...staffForm, int_Branch_Id: Number(e.target.value) })}
                  >
                    {branches.map((b) => (
                      <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                        {b.txt_Branch_Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Account Status / Approval</label>
                  <select
                    value={staffForm.accountStatus}
                    onChange={(e) => setStaffForm({ ...staffForm, accountStatus: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="ramesh@roadready.com"
                  />
                </div>
                <div>
                  <label>Phone Number (10 Digits)</label>
                  <input
                    value={staffForm.phone}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setStaffForm({ ...staffForm, phone: val });
                    }}
                    placeholder="9840112233"
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={staffForm.dateOfBirth}
                    onChange={(e) => setStaffForm({ ...staffForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <label>Address</label>
                  <input
                    value={staffForm.address}
                    onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
                    placeholder="Street, City, PIN"
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Emergency Contact Name</label>
                  <input
                    value={staffForm.emergencyContactName}
                    onChange={(e) => setStaffForm({ ...staffForm, emergencyContactName: e.target.value })}
                    placeholder="Contact Name"
                  />
                </div>
                <div>
                  <label>Emergency Contact Phone</label>
                  <input
                    value={staffForm.emergencyContactPhone}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setStaffForm({ ...staffForm, emergencyContactPhone: val });
                    }}
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddStaffModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t("add_staff")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Staff Member --- */}
      {showEditStaffModal && editStaffTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowEditStaffModal(false)}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "28px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              Edit Staff Profile: @{editStaffTarget.username}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "-6px", marginBottom: "18px" }}>
              Update staff personal information, employee ID, branch, or account approval status.
            </p>
            {editStaffError && <div className="alert alert-error">{editStaffError}</div>}

            <form onSubmit={handleSaveEditStaff}>
              <div className="form-row two">
                <div>
                  <label>Full Name *</label>
                  <input
                    required
                    value={editStaffForm.name}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label>Employee ID</label>
                  <input
                    value={editStaffForm.employeeId}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, employeeId: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Branch Assignment</label>
                  <select
                    value={editStaffForm.int_Branch_Id}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, int_Branch_Id: Number(e.target.value) })}
                  >
                    {branches.map((b) => (
                      <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                        {b.txt_Branch_Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Account Status / Approval</label>
                  <select
                    value={editStaffForm.accountStatus}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, accountStatus: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={editStaffForm.email}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label>Phone Number (10 Digits)</label>
                  <input
                    value={editStaffForm.phone}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setEditStaffForm({ ...editStaffForm, phone: val });
                    }}
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={editStaffForm.dateOfBirth}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <label>Address</label>
                  <input
                    value={editStaffForm.address}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row two">
                <div>
                  <label>Emergency Contact Name</label>
                  <input
                    value={editStaffForm.emergencyContactName}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, emergencyContactName: e.target.value })}
                  />
                </div>
                <div>
                  <label>Emergency Contact Phone</label>
                  <input
                    value={editStaffForm.emergencyContactPhone}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setEditStaffForm({ ...editStaffForm, emergencyContactPhone: val });
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditStaffModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Staff Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Coupon --- */}
      {showAddCouponModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowAddCouponModal(false)}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "28px",
              maxWidth: "440px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{t("add_coupon")}</h3>
            <form onSubmit={handleSaveCoupon}>
              <div className="form-row">
                <label>{t("coupon_code")}</label>
                <input
                  required
                  value={couponForm.txt_Coupon_Code}
                  onChange={(e) => setCouponForm({ ...couponForm, txt_Coupon_Code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER25"
                />
              </div>

              <div className="form-row">
                <label>{t("coupon_discount")}</label>
                <input
                  type="number"
                  required
                  value={couponForm.dbl_Discount_Percent}
                  onChange={(e) => setCouponForm({ ...couponForm, dbl_Discount_Percent: Number(e.target.value) })}
                />
              </div>

              <div className="form-row">
                <label>{t("coupon_max")}</label>
                <input
                  type="number"
                  required
                  value={couponForm.dbl_Max_Discount_Amount}
                  onChange={(e) => setCouponForm({ ...couponForm, dbl_Max_Discount_Amount: Number(e.target.value) })}
                />
              </div>

              <div className="form-row">
                <label>{t("coupon_valid_to")}</label>
                <input
                  type="date"
                  required
                  value={couponForm.dte_Valid_To}
                  onChange={(e) => setCouponForm({ ...couponForm, dte_Valid_To: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddCouponModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t("add_coupon")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: CUSTOMER KYC OVERVIEW */}
      {activeTab === "kyc" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: "999px",
                  background: "rgba(139,92,246,0.15)",
                  color: "#8b5cf6",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                👑 ADMIN ACCESS
              </span>
            </div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.4rem" }}>Customer KYC Oversight</h2>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.88rem" }}>
              Full administrative access to review, verify, and reject customer identity documents.
            </p>
          </div>
          <StaffKycReviewer />
        </div>
      )}

      {/* TAB: LIVE FLEET TRACKING */}
      {activeTab === "tracking" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.4rem" }}>Global Fleet Live GPS Tracking</h2>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.88rem" }}>
              Active rental vehicle tracking across all branch corridors with live phone GPS telemetry and trip stats.
            </p>
          </div>
          <FleetLiveTracking initialBookingId={trackingBookingId} />
        </div>
      )}

      {/* Reusable Confirmation Modal */}
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

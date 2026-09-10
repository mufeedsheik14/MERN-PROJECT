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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { user, users, createStaff, toggleStaffStatus } = useAuth();
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
    email: "",
    phone: "",
  });
  const [staffError, setStaffError] = useState("");

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
      const key = b.vehicleLabel || String(b.int_Vehicle_Id);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [bookings]);

  // Status Breakdown
  const statusCounts = useMemo(() => {
    return bookingStatuses.map((s) => {
      const count = bookings.filter((b) => b.int_Booking_Status_Id === s.int_Booking_Status_Id).length;
      return { ...s, count };
    });
  }, [bookings]);

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

  // Staff members list
  const staffList = useMemo(() => {
    return users.filter((u) => u.role === "staff");
  }, [users]);

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
  const handleSaveStaff = (e) => {
    e.preventDefault();
    setStaffError("");
    if (!staffForm.username.trim() || !staffForm.password || !staffForm.name.trim()) {
      setStaffError(t("field_required"));
      return;
    }
    const result = createStaff(staffForm);
    if (!result.success) {
      setStaffError(t(result.errorKey || "username_taken"));
      return;
    }
    setStaffForm({
      name: "",
      username: "",
      password: "",
      int_Branch_Id: 1,
      email: "",
      phone: "",
    });
    setShowAddStaffModal(false);
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
          <div className="stat-grid" style={{ margin: "0 0 32px 0" }}>
            <div className="stat-card" style={{ borderLeftColor: "#8b5cf6" }}>
              <div className="stat-label">{t("total_revenue")}</div>
              <div className="stat-value">₹{stats.totalRevenue.toLocaleString("en-IN")}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--signal-green)" }}>
              <div className="stat-label">{t("fleet_utilization")}</div>
              <div className="stat-value">{stats.utilization}%</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--accent)" }}>
              <div className="stat-label">{t("total_vehicles")}</div>
              <div className="stat-value">{stats.totalVehicles}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--signal-amber)" }}>
              <div className="stat-label">{t("active_bookings")}</div>
              <div className="stat-value">{stats.activeBookings}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", marginBottom: "36px" }}>
            {/* Branch Performance */}
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px" }}>{t("branch_performance")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {branchPerformance.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      background: "var(--bg-inset)",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {b.fleetCount} vehicles · {b.bookingCount} bookings
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                      ₹{b.revenue.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Vehicles & Status Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "14px" }}>{t("top_vehicles")}</h3>
                {topVehicles.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>No booking activity yet.</p>
                ) : (
                  topVehicles.map((v) => (
                    <div
                      key={v.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span>🚗 {v.name}</span>
                      <span style={{ fontWeight: 700 }}>{v.count} bookings</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "14px" }}>Booking Lifecycle Breakdown</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {statusCounts.map((s) => (
                    <div
                      key={s.key}
                      style={{
                        padding: "8px 14px",
                        background: "var(--bg-inset)",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <span className={`badge badge-${s.int_Booking_Status_Id}`}>{t(s.key)}</span>
                      <span style={{ fontWeight: 700 }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3>Branch Staff Accounts ({staffList.length})</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddStaffModal(true)}
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              + {t("add_staff")}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {staffList.map((s) => (
              <div
                key={s.username}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{s.name}</div>
                    <span
                      className="badge"
                      style={{
                        background: s.active !== false ? "rgba(46,125,79,0.16)" : "rgba(181,67,45,0.14)",
                        color: s.active !== false ? "var(--signal-green)" : "var(--signal-red)",
                      }}
                    >
                      {s.active !== false ? t("status_active") : t("status_deactivated")}
                    </span>
                  </div>

                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "4px" }}>
                    Username: <strong>@{s.username}</strong>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "4px" }}>
                    Branch: <strong>{getBranchName(s.int_Branch_Id)}</strong>
                  </div>
                  {s.email && (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Email: {s.email}</div>
                  )}
                </div>

                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    className={s.active !== false ? "btn-danger" : "btn btn-ghost"}
                    style={{ width: "100%", fontSize: "0.82rem", padding: "8px" }}
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
            ))}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>
                      #{b.txt_Booking_Number}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      ({b.customerName || "Customer"})
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    🚗 {b.vehicleLabel} · 📍 {getBranchName(b.int_Pickup_Branch_Id)}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Dates: {b.dte_Pickup_Date} → {b.dte_Return_Date} ({b.int_Total_Days} days)
                  </div>
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
              maxWidth: "460px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{t("add_staff")}</h3>
            {staffError && <div className="alert alert-error">{staffError}</div>}

            <form onSubmit={handleSaveStaff}>
              <div className="form-row">
                <label>{t("staff_name")}</label>
                <input
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="form-row">
                <label>{t("username")}</label>
                <input
                  required
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  placeholder="e.g. staff_coimbatore"
                />
              </div>

              <div className="form-row">
                <label>{t("password")}</label>
                <input
                  type="password"
                  required
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-row">
                <label>{t("assign_branch")}</label>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
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
              Active rental vehicle tracking across all branch corridors with simulated GPS coordinates and trip stats.
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

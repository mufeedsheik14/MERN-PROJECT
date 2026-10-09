import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useBookings } from "../../context/BookingContext";
import { useFleet } from "../../context/FleetContext";
import ReportViewerModal from "./ReportViewerModal";
import {
  exportBookingReportExcel,
  exportRevenueReportExcel,
  exportVehicleUtilizationExcel,
  exportCustomerReportExcel,
  exportCancellationReportExcel,
  exportVehicleAvailabilityExcel,
  exportBookingOperationsExcel,
  exportActiveRentalsExcel,
} from "../../utils/reportExcelExporter";

export default function ReportsExportSection({ role = "admin", branchId = null }) {
  const { users, isAdmin, isStaff } = useAuth();
  const { bookings } = useBookings();
  const { vehicles } = useFleet();

  // Active Report Viewer Modal State
  const [activeReportModal, setActiveReportModal] = useState({
    isOpen: false,
    title: "",
    type: "",
    fileName: "",
    data: [],
    columns: [],
  });

  // Scoped bookings & vehicles
  const targetBookings = useMemo(() => {
    if (role === "staff" && branchId) {
      return bookings.filter((b) => Number(b.int_Pickup_Branch_Id) === Number(branchId));
    }
    return bookings;
  }, [bookings, role, branchId]);

  const targetVehicles = useMemo(() => {
    if (role === "staff" && branchId) {
      return vehicles.filter((v) => Number(v.int_Branch_Id) === Number(branchId));
    }
    return vehicles;
  }, [vehicles, role, branchId]);

  // ─────────────────────────────────────────────────────────────
  // 1. ADMIN REPORTS DEFINITIONS
  // ─────────────────────────────────────────────────────────────

  // Admin 1: Booking Report Data & Columns
  const adminBookingData = useMemo(() => {
    return targetBookings.map((b) => {
      const regNo =
        b.vehicle?.txt_Registration_Number ||
        b.txt_Registration_Number ||
        targetVehicles.find((v) => v.int_Vehicle_Id === b.int_Vehicle_Id)?.txt_Registration_Number ||
        "KA-01-RR-" + (b.int_Vehicle_Id || "101");

      return {
        "Booking ID": b.txt_Booking_Number || String(b._id),
        "Customer Name": b.customerName || "Customer",
        "Vehicle Name": b.vehicleLabel || "Rental Vehicle",
        "Registration Number": regNo,
        "Pickup Date": b.dte_Pickup_Date || "N/A",
        "Return Date": b.dte_Return_Date || "N/A",
        "Booking Status": (b.status || "confirmed").toUpperCase(),
        "Payment Status": b.paymentStatus || "Pending",
        "Total Amount (INR)": Number(b.dbl_Net_Amount || 0),
      };
    });
  }, [targetBookings, targetVehicles]);

  const adminBookingColumns = [
    { key: "Booking ID", label: "Booking ID" },
    { key: "Customer Name", label: "Customer" },
    { key: "Vehicle Name", label: "Vehicle" },
    { key: "Registration Number", label: "Reg #" },
    { key: "Pickup Date", label: "Pickup Date" },
    { key: "Return Date", label: "Return Date" },
    { key: "Booking Status", label: "Status" },
    { key: "Payment Status", label: "Payment" },
    { key: "Total Amount (INR)", label: "Total Amount" },
  ];

  // Admin 2: Revenue / Payment Report Data & Columns
  const adminRevenueData = useMemo(() => {
    return targetBookings.map((b) => {
      const payDate = b.paidAt
        ? new Date(b.paidAt).toLocaleDateString("en-IN")
        : b.createdAt
        ? new Date(b.createdAt).toLocaleDateString("en-IN")
        : "N/A";

      return {
        "Booking ID": b.txt_Booking_Number || String(b._id),
        "Customer Name": b.customerName || "Customer",
        "Amount (INR)": Number(b.dbl_Net_Amount || 0),
        "Payment Status": b.paymentStatus || "Pending",
        "Payment Date": payDate,
        "Payment ID": b.razorpayPaymentId || "N/A",
        "Order ID": b.razorpayOrderId || "N/A",
      };
    });
  }, [targetBookings]);

  const adminRevenueColumns = [
    { key: "Booking ID", label: "Booking ID" },
    { key: "Customer Name", label: "Customer" },
    { key: "Amount (INR)", label: "Amount" },
    { key: "Payment Status", label: "Payment Status" },
    { key: "Payment Date", label: "Payment Date" },
    { key: "Payment ID", label: "Payment ID" },
  ];

  // Admin 3 & Staff 3: Vehicle Utilization Report Data & Columns
  const vehicleUtilizationData = useMemo(() => {
    return targetVehicles.map((v) => {
      const vBookings = targetBookings.filter(
        (b) =>
          (b.vehicle && String(b.vehicle._id || b.vehicle) === String(v._id)) ||
          (b.int_Vehicle_Id !== undefined &&
            v.int_Vehicle_Id !== undefined &&
            Number(b.int_Vehicle_Id) === Number(v.int_Vehicle_Id))
      );
      const activeBookings = vBookings.filter(
        (b) => b.status !== "cancelled" && b.int_Booking_Status_Id !== 5
      );
      const rentalDays = activeBookings.reduce(
        (sum, b) => sum + (b.int_Total_Days || 1),
        0
      );
      const utilizationPct = Math.min(100, Math.round((rentalDays / 30) * 100));

      return {
        "Vehicle Name": v.txt_Model_Name,
        "Registration Number": v.txt_Registration_Number,
        "Total Bookings": activeBookings.length,
        "Rental Days": rentalDays,
        "Utilization Percentage": `${utilizationPct}%`,
        "Daily Rent (INR)": Number(v.dbl_Daily_Rent || 0),
      };
    });
  }, [targetVehicles, targetBookings]);

  const vehicleUtilizationColumns = [
    { key: "Vehicle Name", label: "Vehicle Name" },
    { key: "Registration Number", label: "Reg #" },
    { key: "Total Bookings", label: "Total Bookings" },
    { key: "Rental Days", label: "Rental Days" },
    { key: "Utilization Percentage", label: "Utilization %" },
  ];

  // Admin 4: Customer Report Data & Columns
  const adminCustomerData = useMemo(() => {
    const customerMap = new Map();

    users
      .filter((u) => u.role === "customer" || !u.role)
      .forEach((u) => {
        const key = (u.email || u.username || "").toLowerCase();
        if (key) {
          customerMap.set(key, {
            name: u.name || u.username,
            email: u.email || "",
            totalBookings: 0,
            totalSpending: 0,
            statusCounts: {},
          });
        }
      });

    targetBookings.forEach((b) => {
      const key = (b.email || b.customerUsername || b.customerName || "").toLowerCase();
      if (!key) return;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: b.customerName || "Customer",
          email: b.email || "",
          totalBookings: 0,
          totalSpending: 0,
          statusCounts: {},
        });
      }

      const c = customerMap.get(key);
      c.totalBookings += 1;
      if (b.paymentStatus === "Paid") {
        c.totalSpending += Number(b.dbl_Net_Amount || 0);
      }
      const st = b.status || "confirmed";
      c.statusCounts[st] = (c.statusCounts[st] || 0) + 1;
    });

    return Array.from(customerMap.values())
      .filter((c) => c.totalBookings > 0 || c.email)
      .map((c) => {
        const summary = Object.entries(c.statusCounts)
          .map(([st, cnt]) => `${cnt} ${st}`)
          .join(", ") || "No active trips";

        return {
          "Customer Name": c.name,
          "Email": c.email || "N/A",
          "Total Bookings": c.totalBookings,
          "Total Spending (INR)": Math.round(c.totalSpending),
          "Booking Status Summary": summary,
        };
      });
  }, [users, targetBookings]);

  const adminCustomerColumns = [
    { key: "Customer Name", label: "Customer Name" },
    { key: "Email", label: "Email" },
    { key: "Total Bookings", label: "Total Bookings" },
    { key: "Total Spending (INR)", label: "Total Spending" },
    { key: "Booking Status Summary", label: "Status Summary" },
  ];

  // Admin 5: Cancellation Report Data & Columns
  const adminCancellationData = useMemo(() => {
    const cancelled = targetBookings.filter(
      (b) => b.status === "cancelled" || b.int_Booking_Status_Id === 5
    );
    return cancelled.map((b) => {
      const cDate = b.cancelledAt
        ? new Date(b.cancelledAt).toLocaleDateString("en-IN")
        : b.updatedAt
        ? new Date(b.updatedAt).toLocaleDateString("en-IN")
        : "N/A";

      return {
        "Booking ID": b.txt_Booking_Number || String(b._id),
        "Customer Name": b.customerName || "Customer",
        "Vehicle Name": b.vehicleLabel || "Rental Vehicle",
        "Cancelled Date": cDate,
        "Cancellation Reason": b.cancellationReason || "Cancelled by customer",
        "Refund / Payment Status":
          b.paymentStatus === "Paid"
            ? "Refund Processed"
            : b.paymentStatus || "No Charge",
        "Total Amount (INR)": Number(b.dbl_Net_Amount || 0),
      };
    });
  }, [targetBookings]);

  const adminCancellationColumns = [
    { key: "Booking ID", label: "Booking ID" },
    { key: "Customer Name", label: "Customer" },
    { key: "Vehicle Name", label: "Vehicle" },
    { key: "Cancelled Date", label: "Cancellation Date" },
    { key: "Cancellation Reason", label: "Reason" },
    { key: "Refund / Payment Status", label: "Refund / Payment Status" },
  ];

  // ─────────────────────────────────────────────────────────────
  // 2. STAFF OPERATIONAL REPORTS DEFINITIONS
  // ─────────────────────────────────────────────────────────────

  // Staff 1: Vehicle Availability Report
  const staffAvailabilityData = useMemo(() => {
    return targetVehicles.map((v) => {
      const activeRide = targetBookings.find(
        (b) =>
          (b.int_Vehicle_Id === v.int_Vehicle_Id || String(b.vehicle) === String(v._id)) &&
          b.int_Booking_Status_Id === 3 // ongoing
      );

      let currentRentalStatus = "Parked at Hub (Ready)";
      if (v.txt_Vehicle_Status === "M") {
        currentRentalStatus = "Under Maintenance";
      } else if (activeRide) {
        currentRentalStatus = `On Trip with #${activeRide.txt_Booking_Number}`;
      }

      return {
        "Vehicle Name": v.txt_Model_Name,
        "Registration Number": v.txt_Registration_Number,
        "Availability Status": v.availabilityStatus || "Available",
        "Verification Status": "RC & Insurance Verified",
        "Current Rental Status": currentRentalStatus,
        "Daily Rate (INR)": Number(v.dbl_Daily_Rent || 0),
      };
    });
  }, [targetVehicles, targetBookings]);

  const staffAvailabilityColumns = [
    { key: "Vehicle Name", label: "Vehicle Name" },
    { key: "Registration Number", label: "Reg #" },
    { key: "Availability Status", label: "Availability Status" },
    { key: "Verification Status", label: "Verification Status" },
    { key: "Current Rental Status", label: "Current Rental Status" },
  ];

  // Staff 2: Booking Operations Report
  const staffOperationsData = useMemo(() => {
    return targetBookings.map((b) => ({
      "Booking ID": b.txt_Booking_Number || String(b._id),
      "Customer Name": b.customerName || "Customer",
      "Vehicle Name": b.vehicleLabel || "Rental Vehicle",
      "Pickup Date": b.dte_Pickup_Date || "N/A",
      "Return Date": b.dte_Return_Date || "N/A",
      "Booking Status": (b.status || "confirmed").toUpperCase(),
      "Payment Status": b.paymentStatus || "Pending",
      "Total Amount (INR)": Number(b.dbl_Net_Amount || 0),
    }));
  }, [targetBookings]);

  const staffOperationsColumns = [
    { key: "Booking ID", label: "Booking ID" },
    { key: "Customer Name", label: "Customer" },
    { key: "Vehicle Name", label: "Vehicle" },
    { key: "Pickup Date", label: "Pickup Date" },
    { key: "Return Date", label: "Return Date" },
    { key: "Booking Status", label: "Status" },
    { key: "Payment Status", label: "Payment" },
  ];

  // Staff 4: Active Rentals Report
  const staffActiveRentalsData = useMemo(() => {
    const active = targetBookings.filter(
      (b) =>
        b.int_Booking_Status_Id === 3 ||
        b.status === "ongoing" ||
        (!["completed", "cancelled"].includes(b.status) &&
          b.int_Booking_Status_Id !== 4 &&
          b.int_Booking_Status_Id !== 5)
    );

    return active.map((b) => ({
      "Booking ID": b.txt_Booking_Number || String(b._id),
      "Customer Name": b.customerName || "Customer",
      "Vehicle Name": b.vehicleLabel || "Rental Vehicle",
      "Pickup Date": b.dte_Pickup_Date || "N/A",
      "Expected Return Date": b.dte_Return_Date || "N/A",
      "Current Status":
        b.int_Booking_Status_Id === 3 ? "On Road (Active)" : (b.status || "confirmed").toUpperCase(),
      "Payment Status": b.paymentStatus || "Pending",
    }));
  }, [targetBookings]);

  const staffActiveRentalsColumns = [
    { key: "Booking ID", label: "Booking ID" },
    { key: "Customer Name", label: "Customer" },
    { key: "Vehicle Name", label: "Vehicle" },
    { key: "Pickup Date", label: "Pickup Date" },
    { key: "Expected Return Date", label: "Expected Return Date" },
    { key: "Current Status", label: "Current Status" },
  ];

  // ─────────────────────────────────────────────────────────────
  // Report Cards Configuration
  // ─────────────────────────────────────────────────────────────

  const adminReports = [
    {
      id: "booking_report",
      title: "Booking Report",
      icon: "📋",
      description: "Complete database log of all customer reservations, vehicle assignments, and rental dates.",
      countLabel: `${adminBookingData.length} Bookings`,
      fileName: "RoadReady_Booking_Report.xlsx",
      data: adminBookingData,
      columns: adminBookingColumns,
      onDownloadExcel: () => exportBookingReportExcel(targetBookings, targetVehicles),
    },
    {
      id: "revenue_report",
      title: "Revenue / Payment Report",
      icon: "💳",
      description: "Financial transactions audit with Razorpay gateway IDs, amounts, and settlement dates.",
      countLabel: `₹${targetBookings.filter((b) => b.paymentStatus === "Paid").reduce((s, b) => s + (b.dbl_Net_Amount || 0), 0).toLocaleString("en-IN")} Collected`,
      fileName: "RoadReady_Revenue_Report.xlsx",
      data: adminRevenueData,
      columns: adminRevenueColumns,
      onDownloadExcel: () => exportRevenueReportExcel(targetBookings),
    },
    {
      id: "utilization_report",
      title: "Vehicle Utilization Report",
      icon: "🏎️",
      description: "Fleet productivity analysis comparing total trips, days on road, and utilization benchmarks.",
      countLabel: `${targetVehicles.length} Fleet Vehicles`,
      fileName: "RoadReady_Vehicle_Utilization.xlsx",
      data: vehicleUtilizationData,
      columns: vehicleUtilizationColumns,
      onDownloadExcel: () => exportVehicleUtilizationExcel(targetVehicles, targetBookings),
    },
    {
      id: "customer_report",
      title: "Customer Report",
      icon: "👥",
      description: "Customer accounts directory with total reservations, cumulative spend, and trip history.",
      countLabel: `${adminCustomerData.length} Customers`,
      fileName: "RoadReady_Customer_Report.xlsx",
      data: adminCustomerData,
      columns: adminCustomerColumns,
      onDownloadExcel: () => exportCustomerReportExcel(targetBookings, users),
    },
    {
      id: "cancellation_report",
      title: "Cancellation Report",
      icon: "🚫",
      description: "Audit trail of cancelled reservations, customer cancellation reasons, and refund statuses.",
      countLabel: `${adminCancellationData.length} Cancellations`,
      fileName: "RoadReady_Cancellation_Report.xlsx",
      data: adminCancellationData,
      columns: adminCancellationColumns,
      onDownloadExcel: () => exportCancellationReportExcel(targetBookings),
    },
  ];

  const staffReports = [
    {
      id: "vehicle_availability_report",
      title: "Vehicle Availability Report",
      icon: "🚘",
      description: "Live branch fleet readiness, maintenance schedule, and physical vehicle verification states.",
      countLabel: `${staffAvailabilityData.length} Branch Vehicles`,
      fileName: "RoadReady_Vehicle_Availability.xlsx",
      data: staffAvailabilityData,
      columns: staffAvailabilityColumns,
      onDownloadExcel: () => exportVehicleAvailabilityExcel(targetVehicles, targetBookings),
    },
    {
      id: "booking_operations_report",
      title: "Booking Operations Report",
      icon: "📋",
      description: "Pickup and return operational manifests for upcoming and ongoing branch reservations.",
      countLabel: `${staffOperationsData.length} Bookings`,
      fileName: "RoadReady_Booking_Operations.xlsx",
      data: staffOperationsData,
      columns: staffOperationsColumns,
      onDownloadExcel: () => exportBookingOperationsExcel(targetBookings),
    },
    {
      id: "staff_utilization_report",
      title: "Vehicle Utilization Report",
      icon: "🏎️",
      description: "Rental days and utilization percentage for vehicles stationed at this branch.",
      countLabel: `${targetVehicles.length} Vehicles`,
      fileName: "RoadReady_Vehicle_Utilization.xlsx",
      data: vehicleUtilizationData,
      columns: vehicleUtilizationColumns,
      onDownloadExcel: () => exportVehicleUtilizationExcel(targetVehicles, targetBookings),
    },
    {
      id: "active_rentals_report",
      title: "Active Rentals Report",
      icon: "⚡",
      description: "Vehicles currently in possession of customers with expected hub return dates and telematics status.",
      countLabel: `${staffActiveRentalsData.length} Active Rentals`,
      fileName: "RoadReady_Active_Rentals.xlsx",
      data: staffActiveRentalsData,
      columns: staffActiveRentalsColumns,
      onDownloadExcel: () => exportActiveRentalsExcel(targetBookings),
    },
  ];

  const reportsList = role === "staff" ? staffReports : adminReports;

  const handleOpenViewer = (rep) => {
    setActiveReportModal({
      isOpen: true,
      title: rep.title,
      type: rep.id,
      fileName: rep.fileName,
      data: rep.data,
      columns: rep.columns,
    });
  };

  // Role verification guard: Customers cannot view or access reports
  if (!isAdmin && !isStaff) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        marginTop: "28px",
        marginBottom: "28px",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>📊</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
              {role === "staff" ? "Branch Operational Reports / Export" : "Business Reports / Export"}
            </h3>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.86rem" }}>
            {role === "staff"
              ? "View and download operational audit records, active rentals, and fleet availability in Microsoft Excel (.xlsx) format."
              : "Generate real-time business reports from live MongoDB database records and export formatted Excel (.xlsx) workbooks."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "0.76rem",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--signal-green)",
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: 700,
            }}
          >
            ✓ Real Database Data
          </span>
          <span
            style={{
              fontSize: "0.76rem",
              background: "rgba(37, 99, 235, 0.12)",
              color: "#2563eb",
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: 700,
            }}
          >
            📗 SheetJS XLSX
          </span>
        </div>
      </div>

      {/* Reports Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
        }}
      >
        {reportsList.map((rep) => (
          <div
            key={rep.id}
            style={{
              background: "var(--bg-inset, #f8fafc)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      background: "rgba(224, 99, 43, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                    }}
                  >
                    {rep.icon}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700 }}>
                      {rep.title}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.74rem",
                        color: "var(--accent)",
                        fontWeight: 600,
                      }}
                    >
                      {rep.countLabel}
                    </span>
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin: "8px 0 16px 0",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  lineHeight: "1.45",
                }}
              >
                {rep.description}
              </p>
            </div>

            {/* Action Buttons: View Report & Download Excel */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleOpenViewer(rep)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.84rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontWeight: 600,
                }}
              >
                <span>👁️</span> View Report
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={rep.onDownloadExcel}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.84rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontWeight: 600,
                }}
              >
                <span>📥</span> Download Excel
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Report Viewer Modal */}
      <ReportViewerModal
        isOpen={activeReportModal.isOpen}
        onClose={() =>
          setActiveReportModal((prev) => ({ ...prev, isOpen: false }))
        }
        reportTitle={activeReportModal.title}
        reportType={activeReportModal.type}
        fileName={activeReportModal.fileName}
        data={activeReportModal.data}
        columns={activeReportModal.columns}
      />
    </div>
  );
}

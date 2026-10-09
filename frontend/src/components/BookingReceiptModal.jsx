import { useMemo } from "react";
import { downloadReceiptPdf, viewReceiptPdfInNewTab, getBookingRegNumber } from "../utils/receiptPdfGenerator";
import { useFleet } from "../context/FleetContext";

export default function BookingReceiptModal({ isOpen, onClose, booking }) {
  const { vehicles } = useFleet();

  const regNo = useMemo(() => {
    return getBookingRegNumber(booking, vehicles);
  }, [booking, vehicles]);

  if (!isOpen || !booking) return null;

  const bookingNumber = booking.txt_Booking_Number || `BK-${booking._id || "NEW"}`;
  const isPaid = booking.paymentStatus === "Paid";
  const isFailed = booking.paymentStatus === "Failed";
  const isCancelled = booking.status === "cancelled" || booking.int_Booking_Status_Id === 5;

  let statusBadgeColor = "var(--signal-green)";
  let statusBadgeBg = "rgba(16, 185, 129, 0.12)";
  let statusBadgeText = "✓ Booking Confirmed · Payment Successful";

  if (isFailed) {
    statusBadgeColor = "var(--signal-red)";
    statusBadgeBg = "rgba(239, 68, 68, 0.12)";
    statusBadgeText = "✕ Payment Failed";
  } else if (isCancelled) {
    statusBadgeColor = "var(--text-muted)";
    statusBadgeBg = "rgba(100, 116, 139, 0.14)";
    statusBadgeText = "🚫 Booking Cancelled";
  } else if (!isPaid) {
    statusBadgeColor = "var(--signal-amber, #f59e0b)";
    statusBadgeBg = "rgba(245, 158, 11, 0.14)";
    statusBadgeText = "⏳ Payment Pending";
  }

  const totalDays = booking.int_Total_Days || 1;
  const ratePerDay = booking.dbl_Rate_Per_Day || 0;
  const baseRentTotal = ratePerDay * totalDays;
  const subtotal = booking.dbl_Total_Amount || baseRentTotal;
  const discount = booking.dbl_Discount_Amount || 0;
  const tax = booking.dbl_Tax_Amount || 0;
  const deposit = booking.dbl_Security_Deposit || 0;
  const netTotal = booking.dbl_Net_Amount || subtotal + tax + deposit;
  const addons = booking.addons || {};

  const handleDownload = () => {
    downloadReceiptPdf(booking, { vehicles });
  };

  const handleViewPdf = () => {
    viewReceiptPdfInNewTab(booking, { vehicles });
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(6px)",
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: "var(--bg-elevated)",
          color: "var(--text)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid var(--accent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.1rem",
              }}
            >
              RR
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.3px" }}>
                RoadReady Receipt
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                Official Rental &amp; Booking Document
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "none",
              color: "#ffffff",
              fontSize: "1.2rem",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
          {/* Status Alert Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: statusBadgeBg,
              color: statusBadgeColor,
              padding: "10px 16px",
              borderRadius: "8px",
              border: `1px solid ${statusBadgeColor}`,
              marginBottom: "18px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>
              {statusBadgeText}
            </span>
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              Ref: <strong>#{bookingNumber}</strong>
            </span>
          </div>

          {/* Customer & Vehicle Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            {/* Customer Box */}
            <div
              style={{
                background: "var(--bg-inset, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                Customer Details
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: "4px" }}>
                {booking.customerName || "Customer"}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                📧 {booking.email || "N/A"}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                📞 {booking.phone || "N/A"}
              </div>
            </div>

            {/* Vehicle Box */}
            <div
              style={{
                background: "var(--bg-inset, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                Vehicle &amp; Duration
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: "4px" }}>
                🚗 {booking.vehicleLabel || "Rental Vehicle"}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Reg #: <strong style={{ fontFamily: "monospace", color: "var(--text)" }}>{regNo}</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                📅 {booking.dte_Pickup_Date} → {booking.dte_Return_Date} ({totalDays} {totalDays === 1 ? "day" : "days"})
              </div>
            </div>
          </div>

          {/* Pricing & Breakdown Table */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                background: "var(--bg-inset, #f8fafc)",
                padding: "10px 16px",
                fontWeight: 700,
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              Itemized Rental Breakdown
            </div>

            <div style={{ padding: "12px 16px", fontSize: "0.88rem" }}>
              {/* Base rental */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div>
                  <strong>Base Vehicle Rental</strong>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    {totalDays} days × ₹{ratePerDay.toLocaleString("en-IN")}/day
                  </div>
                </div>
                <strong>₹{baseRentTotal.toLocaleString("en-IN")}</strong>
              </div>

              {/* Addons */}
              {addons.insurance && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.84rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>+ Comprehensive Insurance ({totalDays}d)</span>
                  <span>₹{(299 * totalDays).toLocaleString("en-IN")}</span>
                </div>
              )}
              {addons.gps && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.84rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>+ GPS Navigation ({totalDays}d)</span>
                  <span>₹{(149 * totalDays).toLocaleString("en-IN")}</span>
                </div>
              )}
              {addons.roadside && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.84rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>+ 24/7 Roadside Assistance ({totalDays}d)</span>
                  <span>₹{(99 * totalDays).toLocaleString("en-IN")}</span>
                </div>
              )}
              {addons.childSeat && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.84rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>+ Child Safety Seat ({totalDays}d)</span>
                  <span>₹{(120 * totalDays).toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* Discount */}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--signal-green)" }}>
                  <span>Coupon Discount {booking.couponCode ? `(${booking.couponCode})` : ""}</span>
                  <span>-₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* GST */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.84rem" }}>
                <span style={{ color: "var(--text-muted)" }}>GST Taxes (18%)</span>
                <span>₹{tax.toLocaleString("en-IN")}</span>
              </div>

              {/* Deposit */}
              {deposit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.84rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Refundable Security Deposit</span>
                  <span>₹{deposit.toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* Total Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "2px solid var(--border)",
                  marginTop: "10px",
                  paddingTop: "10px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Total Amount</div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    {isPaid ? "Paid in Full via Razorpay Gateway" : isFailed ? "Payment Failed · Amount Not Charged" : "Pending Payment"}
                  </div>
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--accent)" }}>
                  ₹{Math.round(netTotal).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Gateway Audit Box */}
          <div
            style={{
              background: "var(--bg-inset, #f8fafc)",
              border: "1px dashed var(--border)",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "0.82rem",
              lineHeight: "1.5",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>💳 Payment Details:</div>
            <div>
              Status: <strong>{booking.paymentStatus || "Pending"}</strong>
            </div>
            {booking.razorpayPaymentId && (
              <div>
                Payment ID: <code style={{ color: "var(--signal-green)" }}>{booking.razorpayPaymentId}</code>
              </div>
            )}
            {booking.razorpayOrderId && (
              <div>
                Order ID: <code style={{ color: "var(--text-muted)" }}>{booking.razorpayOrderId}</code>
              </div>
            )}
            {booking.paidAt && (
              <div>
                Transaction Time: {new Date(booking.paidAt).toLocaleString()}
              </div>
            )}
            {booking.paymentError && (
              <div style={{ color: "var(--signal-red)", marginTop: "4px" }}>
                Error Description: {booking.paymentError}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            background: "var(--bg-inset, #f8fafc)",
            borderTop: "1px solid var(--border)",
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: "8px 16px", fontSize: "0.88rem" }}
          >
            Close
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleViewPdf}
              style={{
                padding: "8px 16px",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>👁️</span> View PDF
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownload}
              style={{
                padding: "8px 18px",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📥</span> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPaymentOrderApi,
  verifyPaymentApi,
  recordPaymentFailureApi,
  openRazorpayCheckout,
  isMobileDevice,
} from "../services/paymentService";
import { useBookings } from "../context/BookingContext";
import { useFleet } from "../context/FleetContext";
import { useInteraction } from "../context/InteractionContext";
import ConfettiBurst from "./ConfettiBurst";
import BookingReceiptModal from "./BookingReceiptModal";
import { downloadReceiptPdf } from "../utils/receiptPdfGenerator";

/**
 * Scannable Razorpay UPI QR Code Generator.
 * Encodes the active Razorpay order UPI payment link into a real, ISO-standard scannable QR code.
 * Mobile phones scanning this QR will instantly recognize the RoadReady transaction on any UPI app.
 */
function ScannableRazorpayQrCode({ data, size = 180, alt = "Scan to Pay via UPI" }) {
  const qrUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      data
    )}&margin=2&qzone=1`;
  }, [data, size]);

  const [hasError, setHasError] = useState(false);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {!hasError ? (
        <img
          src={qrUrl}
          alt={alt}
          width={size}
          height={size}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          onError={() => setHasError(true)}
        />
      ) : (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "10px", textAlign: "center" }}>
          Scan via UPI App
        </div>
      )}
    </div>
  );
}

/**
 * High-fidelity Razorpay Security Handshake Simulation Screen.
 * Displays the official Razorpay blue shield with emblem and "Secured By Razorpay"
 * verification footer before the active payment session countdown begins.
 */
function RazorpaySimulationView({ message = "Establishing secure connection...", onClose }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "440px",
        height: "100%",
        width: "100%",
        backgroundColor: "#F5F6F8",
        padding: "36px 24px 28px",
        boxSizing: "border-box",
        position: "relative",
        userSelect: "none",
        borderRadius: "14px",
      }}
    >
      <style>{`
        @keyframes rzpShieldFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3px) scale(1.015); }
        }
        @keyframes rzpPulseRing {
          0% { transform: scale(0.85); opacity: 0.75; }
          50% { transform: scale(1.18); opacity: 0.25; }
          100% { transform: scale(1.42); opacity: 0; }
        }
        @keyframes rzpFadeInOut {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Subtle top-right close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "14px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "1.2rem",
            color: "#94A3B8",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "6px",
            lineHeight: 1,
            zIndex: 10,
          }}
        >
          ✕
        </button>
      )}

      {/* Center Security Shield Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          marginTop: "auto",
          marginBottom: "auto",
        }}
      >
        {/* Radar Ring Glow Effect */}
        <div
          style={{
            position: "absolute",
            width: "180px",
            height: "210px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(29, 78, 216, 0.18) 0%, rgba(29, 78, 216, 0) 72%)",
            animation: "rzpPulseRing 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite",
            pointerEvents: "none",
          }}
        />

        {/* Razorpay Blue Shield */}
        <div
          style={{
            position: "relative",
            width: "140px",
            height: "172px",
            animation: "rzpShieldFloat 2.4s ease-in-out infinite",
            filter: "drop-shadow(0 18px 32px rgba(13, 71, 201, 0.32))",
          }}
        >
          <svg
            viewBox="0 0 136 168"
            width="140"
            height="172"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="rzpShieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="42%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#0B3AA4" />
              </linearGradient>
              <linearGradient id="rzpSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Base Shield Contour */}
            <path
              d="M68 0C87 7 112 9 133 19C135.5 20.2 136 23.5 136 26.5C136 82 111.5 136 68.8 167.3C68.3 167.7 67.7 167.7 67.2 167.3C24.5 136 0 82 0 26.5C0 23.5 0.5 20.2 3 19C24 9 49 7 68 0Z"
              fill="url(#rzpShieldGrad)"
            />

            {/* Shield Gloss Sheen */}
            <path
              d="M68 2C86.5 8.8 110.8 10.7 131.2 20.5C133.5 21.6 134 24.5 134 27.2C134 78 112 126 73 158C96 122 110 82 110 38C110 26 102 14 68 2Z"
              fill="url(#rzpSheenGrad)"
            />

            {/* Razorpay Emblem Inside Shield (White) */}
            {/* Left Trapezoid / Base Polygon */}
            <polygon
              points="40,94 55,94 55,68 40,76"
              fill="#FFFFFF"
            />
            {/* Right Slanted Blade / Chevron */}
            <polygon
              points="59,94 69,94 89,41 74,48"
              fill="#FFFFFF"
            />
          </svg>
        </div>

        {message && (
          <div
            style={{
              marginTop: "20px",
              fontSize: "0.84rem",
              fontWeight: 600,
              color: "#64748B",
              letterSpacing: "0.2px",
              animation: "rzpFadeInOut 1.8s ease-in-out infinite",
              textAlign: "center",
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* Bottom Footer: "Secured By Razorpay" */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "auto",
          paddingBottom: "4px",
        }}
      >
        <span
          style={{
            color: "#71717A",
            fontSize: "0.88rem",
            fontWeight: 500,
            letterSpacing: "0.2px",
          }}
        >
          Secured By
        </span>

        {/* Razorpay Brand Lockup */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
            <polygon points="1,18 6.5,18 6.5,10.5 1,13" fill="#0C46BF" />
            <polygon points="8,18 11.5,18 18,2 13,4" fill="#0C46BF" />
          </svg>

          <span
            style={{
              color: "#072654",
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "1.08rem",
              fontWeight: 800,
              fontStyle: "italic",
              letterSpacing: "-0.4px",
            }}
          >
            Razorpay
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Realistic Indian Online Rental Payment Checkout Modal.
 * Supports UPI QR, Mobile UPI Intent, Cards, Net Banking, and full receipt printing.
 */
export default function RazorpayPaymentModal({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
  isViewOnly = false,
}) {
  const navigate = useNavigate();
  const { updateBooking } = useBookings();
  const { vehicles } = useFleet();
  const { showToast } = useInteraction();

  // Payment Method Selection: 'upi' | 'card' | 'netbanking'
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");

  // Lifecycle States: 'idle' | 'initiating' | 'pending' | 'success' | 'failed' | 'cancelled'
  const [paymentState, setPaymentState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [activeOrderData, setActiveOrderData] = useState(null);
  const [confettiKey, setConfettiKey] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Responsive mobile view detection & collapsible accordion
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [showMobileQrFallback, setShowMobileQrFallback] = useState(false);

  // Live countdown timer for UPI QR session (10 mins)
  const [sessionSeconds, setSessionSeconds] = useState(600);
  // Razorpay security handshake simulation state (runs before countdown starts)
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Trigger initial Razorpay security handshake simulation when opening modal for unpaid booking
  useEffect(() => {
    if (isOpen && booking?.paymentStatus !== "Paid" && !isViewOnly) {
      setIsSimulating(true);
      setSessionSeconds(600); // Hold countdown at 10:00 until simulation completes
      const timer = setTimeout(() => {
        setIsSimulating(false);
      }, 2200);
      return () => clearTimeout(timer);
    } else {
      setIsSimulating(false);
    }
  }, [isOpen, booking?.paymentStatus, isViewOnly]);

  // Payment countdown timer only ticks after simulation completes
  useEffect(() => {
    if (!isOpen || isSimulating || paymentState === "initiating") return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSimulating, paymentState]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(sessionSeconds / 60);
    const secs = sessionSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [sessionSeconds]);

  useEffect(() => {
    setCurrentBooking(booking);
    setErrorMessage(null);
    setActiveOrderData(null);
    setShowMobileQrFallback(false);

    if (booking?.paymentStatus === "Paid") {
      setPaymentState("success");
    } else if (booking?.paymentStatus === "Failed") {
      setPaymentState("failed");
      setErrorMessage(booking?.paymentError || "Previous payment attempt failed");
    } else {
      setPaymentState("idle");
    }
  }, [booking, isOpen]);

  const isPaid = currentBooking?.paymentStatus === "Paid" || paymentState === "success";
  const isCancelled =
    currentBooking?.status === "cancelled" || currentBooking?.int_Booking_Status_Id === 5;

  const handleModalClose = useCallback(() => {
    if (paymentState === "pending") {
      if (!window.confirm("A payment is currently in progress. Are you sure you want to exit?")) {
        return;
      }
    }
    setErrorMessage(null);
    onClose();
  }, [onClose, paymentState]);

  /**
   * Cryptographically verify payment on backend.
   */
  const handleVerify = async (paymentResponse = {}) => {
    setPaymentState("pending");
    setErrorMessage(null);

    const orderIdToVerify =
      paymentResponse?.razorpay_order_id ||
      activeOrderData?.orderId ||
      currentBooking?.razorpayOrderId;
    const paymentIdToVerify =
      paymentResponse?.razorpay_payment_id ||
      `pay_test_${selectedMethod}_${Date.now()}`;
    const signatureToVerify =
      paymentResponse?.razorpay_signature || "mock_valid_signature";

    try {
      const result = await verifyPaymentApi({
        bookingId: currentBooking._id || currentBooking.txt_Booking_Number,
        razorpay_order_id: orderIdToVerify,
        razorpay_payment_id: paymentIdToVerify,
        razorpay_signature: signatureToVerify,
      });

      if (result.success && result.booking) {
        setCurrentBooking(result.booking);
        updateBooking(result.booking);
        setPaymentState("success");
        setConfettiKey(`pay-success-${Date.now()}`);
        showToast("Payment verified successfully! Reservation confirmed 🎉", "success", "💳");
        if (onPaymentSuccess) {
          onPaymentSuccess(result.booking);
        }
      }
    } catch (err) {
      const msg = err.data?.message || err.message || "Payment signature verification failed";
      setErrorMessage(msg);
      setPaymentState("failed");
      showToast(msg, "error", "⚠️");
    }
  };

  /**
   * Record failure or cancellation on backend without marking booking paid.
   */
  const handleFailure = async (reason, errorObj = null) => {
    try {
      const res = await recordPaymentFailureApi({
        bookingId: currentBooking._id || currentBooking.txt_Booking_Number,
        razorpay_order_id: activeOrderData?.orderId || currentBooking.razorpayOrderId,
        reason: reason || "Payment cancelled by customer",
        error: errorObj,
      });
      if (res?.booking) {
        setCurrentBooking(res.booking);
        updateBooking(res.booking);
      }
    } catch {
      // ignore
    } finally {
      if (reason && reason.toLowerCase().includes("cancel")) {
        setPaymentState("cancelled");
        setErrorMessage("Payment cancelled. You can resume anytime to confirm your rental.");
      } else {
        setPaymentState("failed");
        setErrorMessage(reason || "Payment declined by bank gateway. Please try again.");
      }
    }
  };

  /**
   * Launch Razorpay payment flow (UPI, Card, or NetBanking).
   */
  const handleInitiatePayment = async (overrideMethod) => {
    if (isPaid) {
      showToast("This booking has already been paid.", "info", "✓");
      return;
    }
    if (isCancelled) {
      showToast("Cannot pay for a cancelled booking.", "warning", "⚠️");
      return;
    }

    const methodToUse = overrideMethod || selectedMethod;
    setPaymentState("initiating");
    setErrorMessage(null);

    let orderData = null;
    try {
      // 1. Create order on backend (Amount strictly derived from backend booking)
      orderData = await createPaymentOrderApi(
        currentBooking._id || currentBooking.txt_Booking_Number
      );

      setActiveOrderData(orderData);
      if (orderData?.booking) {
        setCurrentBooking((prev) => ({
          ...prev,
          ...orderData.booking,
          razorpayOrderId: orderData.orderId,
        }));
      }

      // Security simulation pause before pending countdown starts
      await new Promise((res) => setTimeout(res, 2200));

      setSessionSeconds(600);
      // Launch official Razorpay Checkout SDK
      setPaymentState("pending");
      await openRazorpayCheckout({
        orderData,
        method: methodToUse,
        onSuccess: (response) => {
          handleVerify(response);
        },
        onFailure: (error) => {
          const desc = error?.description || error?.reason || "Payment processing failed";
          if (orderData?.isMockMode) {
            setPaymentState("pending");
          } else {
            handleFailure(desc, error);
          }
        },
        onDismiss: () => {
          if (!orderData?.isMockMode) {
            handleFailure("Payment checkout cancelled by user");
          }
        },
      });
    } catch (err) {
      if (err.message?.includes("Razorpay") && orderData?.isMockMode) {
        setPaymentState("pending");
      } else {
        const msg = err.data?.message || err.message || "Failed to initiate payment";
        setErrorMessage(msg);
        setPaymentState("failed");
      }
    }
  };

  // Print receipt handler
  const handlePrintReceipt = () => {
    window.print();
  };

  if (!isOpen || !currentBooking) return null;

  const netAmount = Math.round(currentBooking.dbl_Net_Amount || 0);
  const upiDeepLink = `upi://pay?pa=roadready.rentals@razorpay&pn=RoadReady%20Rentals&tr=${
    activeOrderData?.orderId || currentBooking.razorpayOrderId || currentBooking.txt_Booking_Number
  }&am=${netAmount}&cu=INR&tn=Booking%20${currentBooking.txt_Booking_Number}`;

  return (
    <div
      className="modal-overlay payment-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && paymentState !== "pending") handleModalClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 14, 20, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <ConfettiBurst triggerKey={confettiKey} />

      <div
        className="modal-content payment-checkout-container"
        style={{
          background: (isSimulating || paymentState === "initiating") && !isPaid ? "#F5F6F8" : "var(--bg-elevated, #FFFFFF)",
          border: "1px solid var(--border, #DAD5C8)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: (isSimulating || paymentState === "initiating") && !isPaid ? "460px" : isPaid ? "600px" : "960px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          color: "var(--text, #1C1B18)",
          overflow: "hidden",
          position: "relative",
          animation: "scaleIn 0.2s ease-out",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          transition: "max-width 0.25s ease, background 0.25s ease",
        }}
      >
        {(isSimulating || paymentState === "initiating") && !isPaid ? (
          <RazorpaySimulationView
            message={
              paymentState === "initiating"
                ? `Connecting to Razorpay Secure Gateway (₹${netAmount.toLocaleString("en-IN")})...`
                : "Establishing secure connection to Razorpay Gateway..."
            }
            onClose={handleModalClose}
          />
        ) : (
          <>
            {/* Header Bar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-inset, #F1EFE9)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🚗</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", letterSpacing: "0.5px" }}>
                  RoadReady
                </strong>
                <span
                  style={{
                    background: "rgba(46, 125, 79, 0.12)",
                    color: "var(--signal-green)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  🔒 100% Secure Payment
                </span>
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Razorpay TEST MODE Gateway · No real bank account will be charged
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 10px", fontSize: "1.2rem", color: "var(--text-muted)" }}
            onClick={handleModalClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Main Area */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {/* SUCCESS SCREEN */}
          {isPaid ? (
            <div style={{ textAlign: "center", padding: "16px 8px" }}>
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  background: "rgba(46, 125, 79, 0.12)",
                  color: "var(--signal-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.4rem",
                  margin: "0 auto 16px",
                  border: "2px solid var(--signal-green)",
                }}
              >
                ✓
              </div>

              <h2 style={{ margin: "0 0 6px", color: "var(--signal-green)", fontSize: "1.5rem" }}>
                Booking Confirmed / Payment Successful
              </h2>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "18px", color: "var(--text)" }}>
                Official Reservation Verified
              </div>

              {/* Receipt Card */}
              <div
                id="printable-receipt"
                style={{
                  background: "var(--bg-inset, #F8F9FA)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                  textAlign: "left",
                  fontSize: "0.88rem",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px dashed var(--border)", paddingBottom: "10px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Booking ID:</span>
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
                    #{currentBooking.txt_Booking_Number}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Vehicle:</span>
                  <strong>{currentBooking.vehicleLabel}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Pickup:</span>
                  <span>{currentBooking.dte_Pickup_Date}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Return:</span>
                  <span>{currentBooking.dte_Return_Date} ({currentBooking.int_Total_Days} Days)</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Amount Paid:</span>
                  <strong style={{ color: "var(--signal-green)", fontSize: "1.1rem" }}>
                    ₹{netAmount.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Payment ID:</span>
                  <code style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {currentBooking.razorpayPaymentId || "pay_test_verified"}
                  </code>
                </div>

                {currentBooking.paidAt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Paid At:</span>
                    <span>{new Date(currentBooking.paidAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Success Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "12px 18px", minWidth: "140px" }}
                  onClick={() => setShowReceiptModal(true)}
                >
                  🧾 View Receipt
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, padding: "12px 18px", minWidth: "140px" }}
                  onClick={() => downloadReceiptPdf(currentBooking, { vehicles })}
                >
                  📥 Download PDF
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, padding: "12px 18px", minWidth: "140px" }}
                  onClick={() => {
                    handleModalClose();
                    navigate("/my-bookings");
                  }}
                >
                  View My Bookings →
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT SPLIT VIEW (Summary on Left, Payment Options on Right) */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "360px 1fr",
                gap: "24px",
                alignItems: "start",
              }}
            >
              {/* LEFT COLUMN: Booking Summary Card */}
              <div
                style={{
                  background: "var(--bg-inset, #F8F9FA)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}
              >
                {/* Mobile Collapsible Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: isMobile ? "pointer" : "default",
                  }}
                  onClick={() => isMobile && setShowMobileSummary((prev) => !prev)}
                >
                  <div>
                    <h4 style={{ margin: "0 0 2px", fontSize: "1.05rem" }}>Booking Summary</h4>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Ref #{currentBooking.txt_Booking_Number}
                    </span>
                  </div>
                  {isMobile && (
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "0.85rem",
                        color: "var(--accent)",
                        fontWeight: 600,
                      }}
                    >
                      {showMobileSummary ? "Hide ▴" : "View Breakdown ▾"}
                    </button>
                  )}
                </div>

                {/* Summary Body (Always visible on desktop, toggleable on mobile) */}
                {(!isMobile || showMobileSummary) && (
                  <div style={{ marginTop: "14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px",
                        background: "var(--bg-elevated)",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        marginBottom: "14px",
                      }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>🚘</span>
                      <div>
                        <strong style={{ fontSize: "0.95rem" }}>{currentBooking.vehicleLabel}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {currentBooking.int_Total_Days} {currentBooking.int_Total_Days === 1 ? "Day" : "Days"} Rental
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
                      <div>📅 <strong>Pickup:</strong> {currentBooking.dte_Pickup_Date}</div>
                      <div>📅 <strong>Return:</strong> {currentBooking.dte_Return_Date}</div>
                      <div>👤 <strong>Driver:</strong> {currentBooking.customerName} ({currentBooking.phone})</div>
                    </div>

                    {/* Financial Breakdown */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", fontSize: "0.84rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                          Base Rent ({currentBooking.int_Total_Days}d × ₹{currentBooking.dbl_Rate_Per_Day})
                        </span>
                        <span>₹{((currentBooking.dbl_Rate_Per_Day || 0) * (currentBooking.int_Total_Days || 1)).toLocaleString("en-IN")}</span>
                      </div>

                      {currentBooking.dbl_Total_Amount > (currentBooking.dbl_Rate_Per_Day * currentBooking.int_Total_Days) && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Protection &amp; Add-ons</span>
                          <span>
                            +₹{(currentBooking.dbl_Total_Amount - currentBooking.dbl_Rate_Per_Day * currentBooking.int_Total_Days).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                      {currentBooking.dbl_Discount_Amount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--signal-green)" }}>
                          <span>Coupon Discount</span>
                          <span>-₹{currentBooking.dbl_Discount_Amount.toLocaleString("en-IN")}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "var(--text-muted)" }}>GST (18%)</span>
                        <span>₹{currentBooking.dbl_Tax_Amount?.toFixed(0)}</span>
                      </div>

                      {currentBooking.dbl_Security_Deposit > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Refundable Deposit</span>
                          <span>₹{currentBooking.dbl_Security_Deposit.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Total Net Amount Banner */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginTop: "14px",
                    borderTop: "2px solid var(--border)",
                    paddingTop: "12px",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Total Payable</span>
                  <strong style={{ fontSize: "1.35rem", color: "var(--accent)" }}>
                    ₹{netAmount.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* RIGHT COLUMN: Choose Payment Method & Interactive UPI QR */}
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: "1.15rem" }}>Choose Payment Method</h3>

                {/* Payment Tabs: UPI (Default) | Cards | Net Banking */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "18px",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod("upi");
                      if (paymentState === "pending") setPaymentState("idle");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: selectedMethod === "upi" ? "var(--accent)" : "var(--border)",
                      background: selectedMethod === "upi" ? "rgba(224, 99, 43, 0.08)" : "var(--bg-elevated)",
                      color: selectedMethod === "upi" ? "var(--accent)" : "var(--text)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>⚡</span> UPI (QR / Apps)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod("card");
                      if (paymentState === "pending") setPaymentState("idle");
                      handleInitiatePayment("card");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: selectedMethod === "card" ? "var(--accent)" : "var(--border)",
                      background: selectedMethod === "card" ? "rgba(224, 99, 43, 0.08)" : "var(--bg-elevated)",
                      color: selectedMethod === "card" ? "var(--accent)" : "var(--text)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>💳</span> Cards
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod("netbanking");
                      if (paymentState === "pending") setPaymentState("idle");
                      handleInitiatePayment("netbanking");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: selectedMethod === "netbanking" ? "var(--accent)" : "var(--border)",
                      background: selectedMethod === "netbanking" ? "rgba(224, 99, 43, 0.08)" : "var(--bg-elevated)",
                      color: selectedMethod === "netbanking" ? "var(--accent)" : "var(--text)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>🏛️</span> Net Banking
                  </button>
                </div>

                {/* ERROR / FAILURE NOTIFICATION */}
                {paymentState === "failed" && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid var(--signal-red)",
                      borderRadius: "10px",
                      padding: "16px 18px",
                      marginBottom: "16px",
                      color: "var(--signal-red)",
                      fontSize: "0.86rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "1.05rem" }}>
                      <span>✕</span> Payment Failed
                    </div>
                    <div style={{ fontSize: "0.82rem", marginTop: "4px", color: "var(--text)" }}>
                      {errorMessage || "Transaction was rejected by bank gateway. Your booking is NOT marked as paid."}
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                        onClick={() => handleInitiatePayment(selectedMethod)}
                      >
                        🔄 Try Again
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                        onClick={() => setShowReceiptModal(true)}
                      >
                        🧾 View Receipt
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                        onClick={() => downloadReceiptPdf(currentBooking, { vehicles })}
                      >
                        📥 Download PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* CANCELLED NOTIFICATION */}
                {paymentState === "cancelled" && (
                  <div
                    style={{
                      background: "rgba(242, 137, 74, 0.1)",
                      border: "1px solid var(--accent)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      marginBottom: "16px",
                      color: "var(--accent)",
                      fontSize: "0.86rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                      <span>⏸️</span> Payment cancelled
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                      Checkout was closed. Your rental booking #{currentBooking.txt_Booking_Number} is saved as Pending.
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: "10px", padding: "6px 14px", fontSize: "0.8rem" }}
                      onClick={() => handleInitiatePayment(selectedMethod)}
                    >
                      ⚡ Resume Payment
                    </button>
                  </div>
                )}

                {/* PENDING / WAITING FOR PAYMENT STATE */}
                {paymentState === "pending" && (
                  <div
                    style={{
                      background: "var(--bg-inset, #F8F9FA)",
                      border: "1px solid var(--accent)",
                      borderRadius: "10px",
                      padding: "20px",
                      textAlign: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        border: "3px solid var(--accent)",
                        borderTopColor: "transparent",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 12px",
                      }}
                    />
                    <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: "4px" }}>
                      {selectedMethod === "card"
                        ? "Authorizing Card Payment..."
                        : selectedMethod === "netbanking"
                        ? "Authorizing Net Banking..."
                        : "Waiting for UPI Payment..."}
                    </strong>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
                      {selectedMethod === "card"
                        ? `Please complete your card verification for ₹${netAmount.toLocaleString("en-IN")} via Razorpay Checkout.`
                        : selectedMethod === "netbanking"
                        ? `Please authorize the payment of ₹${netAmount.toLocaleString("en-IN")} via your bank portal.`
                        : `Please approve the request of ₹${netAmount.toLocaleString("en-IN")} on your UPI app.`}
                    </p>

                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                      Session valid for: <strong>{formattedTimer}</strong>
                    </div>

                    {/* Simulated Test Mode Helper (Allows reviewer to simulate gateway approval or rejection) */}
                    {activeOrderData?.isMockMode && (
                      <div
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px dashed #3399cc",
                          padding: "14px",
                          borderRadius: "8px",
                          marginBottom: "14px",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.78rem", color: "#3399cc", fontWeight: 700 }}>
                            🛠️ Razorpay TEST Gateway Simulator (Order #{activeOrderData.orderId})
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "rgba(51, 153, 204, 0.15)", color: "#3399cc", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                            {selectedMethod.toUpperCase()} MODE
                          </span>
                        </div>

                        {selectedMethod === "card" && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px", background: "var(--bg-inset)", padding: "10px", borderRadius: "6px" }}>
                            <div>💳 <strong>Test Card:</strong> 4111 1111 1111 1111 (Visa / RuPay / MC)</div>
                            <div>📅 <strong>Expiry:</strong> Any future date (e.g. 12/28) · <strong>CVV:</strong> 123</div>
                            <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              🔒 Card information is securely handled by Razorpay. RoadReady does not store card data.
                            </div>
                          </div>
                        )}

                        {selectedMethod === "netbanking" && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px", background: "var(--bg-inset)", padding: "10px", borderRadius: "6px" }}>
                            <div style={{ marginBottom: "6px" }}>🏛️ <strong>Select Simulated Bank:</strong></div>
                            <select
                              value={selectedBank}
                              onChange={(e) => setSelectedBank(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 10px",
                                borderRadius: "4px",
                                border: "1px solid var(--border)",
                                background: "var(--bg-elevated)",
                                color: "var(--text)",
                                fontSize: "0.8rem",
                                marginBottom: "4px",
                              }}
                            >
                              <option value="HDFC Bank">HDFC Bank</option>
                              <option value="State Bank of India">State Bank of India (SBI)</option>
                              <option value="ICICI Bank">ICICI Bank</option>
                              <option value="Axis Bank">Axis Bank</option>
                              <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                              <option value="Punjab National Bank">Punjab National Bank</option>
                            </select>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              🔒 Net Banking authentication occurs at the bank portal. No banking credentials are stored.
                            </div>
                          </div>
                        )}

                        {selectedMethod === "upi" && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "12px", background: "var(--bg-inset)", padding: "10px", borderRadius: "6px" }}>
                            <div>⚡ <strong>VPA:</strong> customer@upi / Google Pay / PhonePe</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              Simulate instant UPI intent / QR authorization callback.
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 700 }}
                            onClick={() => {
                              const ordId =
                                activeOrderData?.orderId ||
                                currentBooking?.razorpayOrderId ||
                                `order_test_${Date.now()}`;
                              handleVerify({
                                razorpay_order_id: ordId,
                                razorpay_payment_id: `pay_test_${selectedMethod}_${Date.now()}`,
                                razorpay_signature: "mock_valid_signature",
                              });
                            }}
                          >
                            ✓ Simulate Success
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: "6px 14px", fontSize: "0.82rem", color: "var(--signal-red)", fontWeight: 700 }}
                            onClick={() =>
                              handleFailure(
                                selectedMethod === "card"
                                  ? "Card declined by issuing bank (Insufficient funds)"
                                  : selectedMethod === "netbanking"
                                  ? `User cancelled or session timed out at ${selectedBank} net banking portal`
                                  : "UPI request rejected by customer"
                              )
                            }
                          >
                            ✕ Simulate Failure
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                      onClick={() => handleFailure("Customer cancelled waiting session")}
                    >
                      Cancel Payment
                    </button>
                  </div>
                )}

                {/* 1. UPI METHOD CONTENT */}
                {selectedMethod === "upi" && paymentState !== "pending" && (
                  <div>
                    {/* Header Amount */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--bg-inset)",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>
                          UPI Payment
                        </span>
                        <strong style={{ fontSize: "1.2rem", color: "var(--text)" }}>
                          Pay ₹{netAmount.toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--signal-green)", fontWeight: 700 }}>
                        ⚡ Instant Confirmation
                      </span>
                    </div>

                    {/* MOBILE UPI APP INTENT FLOW (Prioritized on mobile viewports) */}
                    {isMobile && !showMobileQrFallback ? (
                      <div
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "4px" }}>
                          Pay using UPI Apps
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                          Select your installed UPI app to authorize this rental payment securely.
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                          {["Google Pay", "PhonePe", "Paytm", "Other UPI"].map((app) => (
                            <button
                              key={app}
                              type="button"
                              onClick={() => handleInitiatePayment("upi")}
                              style={{
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "var(--bg-inset)",
                                color: "var(--text)",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                              }}
                            >
                              📱 {app}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: "100%", padding: "14px", fontSize: "1rem", fontWeight: 700 }}
                          onClick={() => handleInitiatePayment("upi")}
                        >
                          ⚡ Pay ₹{netAmount.toLocaleString("en-IN")} via UPI App
                        </button>

                        <div style={{ marginTop: "12px" }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: "0.78rem", padding: "4px 8px", color: "var(--text-muted)" }}
                            onClick={() => setShowMobileQrFallback(true)}
                          >
                            Or scan QR using another device →
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* DESKTOP (or mobile fallback): UPI QR CODE FLOW */
                      <div
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "20px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "2px" }}>
                          Option A: Scan QR Code
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
                          Open any UPI app on your mobile phone and scan this QR code
                        </p>

                        {/* Centered QR Display Area */}
                        <div
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "14px",
                            background: "#FFFFFF",
                            borderRadius: "12px",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            border: "1px solid #E5E7EB",
                            marginBottom: "14px",
                          }}
                        >
                          <ScannableRazorpayQrCode data={upiDeepLink} size={180} />

                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#1F2937",
                              letterSpacing: "0.5px",
                            }}
                          >
                            PAY ₹{netAmount.toLocaleString("en-IN")}
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "#6B7280" }}>
                            Ref: {currentBooking.txt_Booking_Number}
                          </span>
                        </div>

                        {/* Supported UPI Apps Badges */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginBottom: "16px",
                          }}
                        >
                          {["Google Pay", "PhonePe", "Paytm", "BHIM", "CRED"].map((app) => (
                            <span
                              key={app}
                              style={{
                                background: "var(--bg-inset)",
                                border: "1px solid var(--border)",
                                borderRadius: "4px",
                                padding: "3px 8px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                              }}
                            >
                              ✓ {app}
                            </span>
                          ))}
                        </div>

                        {/* Action Trigger Button */}
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            width: "100%",
                            padding: "14px",
                            fontSize: "1rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                          onClick={() => handleInitiatePayment("upi")}
                        >
                          ⚡ Open Razorpay UPI Checkout (₹{netAmount.toLocaleString("en-IN")})
                        </button>

                        {isMobile && showMobileQrFallback && (
                          <div style={{ marginTop: "10px" }}>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ fontSize: "0.78rem" }}
                              onClick={() => setShowMobileQrFallback(false)}
                            >
                              ← Back to Mobile UPI App Intent
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CARD METHOD CONTENT */}
                {selectedMethod === "card" && paymentState !== "pending" && (
                  <div
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                        Credit or Debit Card
                      </div>
                      <span style={{ fontSize: "0.75rem", background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", padding: "3px 8px", borderRadius: "4px", fontWeight: 600 }}>
                        Razorpay TEST Mode
                      </span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                      Razorpay Checkout opens securely to accept your card details. RoadReady does not collect or store card numbers, CVVs, or expiry dates.
                    </p>

                    {/* Supported Card Networks */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                      {[
                        { name: "Visa", icon: "💳" },
                        { name: "MasterCard", icon: "💳" },
                        { name: "RuPay", icon: "🇮🇳" },
                        { name: "Maestro", icon: "💳" },
                        { name: "American Express", icon: "💳" },
                      ].map((card) => (
                        <span
                          key={card.name}
                          style={{
                            background: "var(--bg-inset)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          {card.icon} {card.name}
                        </span>
                      ))}
                    </div>

                    {/* Razorpay Test Mode Card Guide */}
                    <div
                      style={{
                        background: "var(--bg-inset)",
                        border: "1px dashed var(--border)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        marginBottom: "18px",
                        lineHeight: "1.5",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                        ℹ️ Razorpay Test Card Details:
                      </div>
                      <div>• <strong>Card Number:</strong> <code style={{ color: "var(--accent)" }}>4111 1111 1111 1111</code></div>
                      <div>• <strong>Expiry Date:</strong> Any future MM / YY (e.g. <code>12/28</code>)</div>
                      <div>• <strong>CVV:</strong> Any 3 digits (e.g. <code>123</code>)</div>
                      <div>• <strong>Cardholder Name:</strong> Any name (e.g. {currentBooking.customerName || "Customer Name"})</div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "1rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                      onClick={() => handleInitiatePayment("card")}
                    >
                      💳 Open Razorpay Card Checkout (₹{netAmount.toLocaleString("en-IN")})
                    </button>
                  </div>
                )}

                {/* 3. NET BANKING METHOD CONTENT */}
                {selectedMethod === "netbanking" && paymentState !== "pending" && (
                  <div
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                        Net Banking
                      </div>
                      <span style={{ fontSize: "0.75rem", background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", padding: "3px 8px", borderRadius: "4px", fontWeight: 600 }}>
                        Razorpay TEST Mode
                      </span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                      Transfer directly from your authorized bank account via Razorpay's secure bank portal. RoadReady does not store bank login credentials.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
                      {[
                        { name: "HDFC Bank", code: "HDFC" },
                        { name: "State Bank of India", code: "SBI" },
                        { name: "ICICI Bank", code: "ICICI" },
                        { name: "Axis Bank", code: "AXIS" },
                        { name: "Kotak Mahindra", code: "KOTAK" },
                        { name: "Punjab National Bank", code: "PNB" },
                      ].map((bank) => (
                        <div
                          key={bank.code}
                          style={{
                            background: "var(--bg-inset)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "8px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          🏛️ {bank.name}
                        </div>
                      ))}
                    </div>

                    {/* Razorpay Test Mode Net Banking Guide */}
                    <div
                      style={{
                        background: "var(--bg-inset)",
                        border: "1px dashed var(--border)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        marginBottom: "18px",
                        lineHeight: "1.5",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                        ℹ️ Razorpay Test Net Banking Guide:
                      </div>
                      <div>• Select any bank in Razorpay Checkout to test bank authentication.</div>
                      <div>• In Razorpay Test Mode, select "Success" or "Failure" on the mock bank redirect page to test the complete transaction lifecycle.</div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "1rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                      onClick={() => handleInitiatePayment("netbanking")}
                    >
                      🏛️ Open Razorpay Net Banking Checkout (₹{netAmount.toLocaleString("en-IN")})
                    </button>
                  </div>
                )}

                {/* Security Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border)",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>🛡️ Razorpay Verified Merchant</span>
                  <span>🔒 256-Bit SSL Encrypted</span>
                </div>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* Customer Booking Receipt Modal */}
      <BookingReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        booking={currentBooking}
      />
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useBookings } from "../context/BookingContext";
import { useFleet } from "../context/FleetContext";
import { useInteraction } from "../context/InteractionContext";
import ConfirmModal from "../components/ConfirmModal";
import RazorpayPaymentModal from "../components/RazorpayPaymentModal";
import BookingReceiptModal from "../components/BookingReceiptModal";
import CustomerAnalytics from "../components/charts/CustomerAnalytics";
import { getBranchName, bookingStatuses } from "../data/mockData";
import { downloadReceiptPdf } from "../utils/receiptPdfGenerator";


export default function MyBookings() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { bookings, cancelBooking, loading } = useBookings();
  const { vehicles } = useFleet();
  const { showToast } = useInteraction();
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const [cancellingId, setCancellingId] = useState(null);
  const [receiptModalBooking, setReceiptModalBooking] = useState(null);
  const [paymentModalState, setPaymentModalState] = useState({
    isOpen: false,
    booking: null,
    isViewOnly: false,
  });

  useEffect(() => {
    document.title = `${t("my_bookings_title")} · ${t("appName")}`;
  }, [t]);

  // Customer sees only their own bookings; Admin sees all
  const customerBookings = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return bookings;
    return bookings.filter(
      (b) =>
        b.customerUsername === user.username ||
        (b.email && b.email.toLowerCase() === user.email?.toLowerCase())
    );
  }, [bookings, user, isAdmin]);

  const statusKey = (id) =>
    bookingStatuses.find((s) => s.int_Booking_Status_Id === id)?.key || "status_pending";

  return (
    <div className="container" style={{ padding: "32px 16px", maxWidth: "920px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ marginBottom: "4px" }}>{t("my_bookings_title")}</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>
            {user ? `Trips and reservations for ${user.name}` : "Your rental history"}
          </p>
        </div>
        <Link to="/vehicles" className="btn btn-primary" style={{ fontSize: "0.85rem", padding: "10px 18px" }}>
          + {t("hero_cta")}
        </Link>
      </div>

      {loading && customerBookings.length === 0 ? (
        <div
          className="empty-state"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          <h3>Loading reservations from MongoDB...</h3>
        </div>
      ) : customerBookings.length === 0 ? (
        <div
          className="empty-state"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
            padding: "60px 20px",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🚘</div>
          <h3 style={{ marginBottom: "8px" }}>{t("no_bookings")}</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px", maxWidth: "420px", margin: "0 auto 20px" }}>
            Ready to explore? Book a car, bike, or scooter across our branches in seconds.
          </p>
          <Link to="/vehicles" className="btn btn-primary">
            {t("hero_cta")}
          </Link>
        </div>
      ) : (

        <div style={{ marginTop: "16px", marginBottom: "48px" }}>
          {/* Customer Personal Travel & Spending Insights */}
          {!isAdmin && (
            <CustomerAnalytics customerBookings={customerBookings} userName={user?.name} />
          )}

          {customerBookings.map((b) => {

            const payStatus = b.paymentStatus || "Pending";
            const isPaid = payStatus === "Paid";
            const isCancelled = b.int_Booking_Status_Id === 5 || b.status === "cancelled";

            let payBadgeStyle = { color: "var(--accent)", background: "var(--accent-subtle)" };
            let payBadgeLabel = "⏳ Pending";
            if (isPaid) {
              payBadgeStyle = { color: "var(--signal-green)", background: "rgba(16, 185, 129, 0.12)" };
              payBadgeLabel = "✓ Paid";
            } else if (payStatus === "Failed") {
              payBadgeStyle = { color: "var(--signal-red)", background: "rgba(239, 68, 68, 0.12)" };
              payBadgeLabel = "✕ Failed";
            } else if (payStatus === "Cancelled" || isCancelled) {
              payBadgeStyle = { color: "var(--text-muted)", background: "rgba(148, 163, 184, 0.12)" };
              payBadgeLabel = "Cancelled";
            }

            return (
              <div className="booking-row" key={b.txt_Booking_Number} style={{ marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                      {t("booking_id")} #{b.txt_Booking_Number}
                    </span>
                    <span className={`badge badge-${b.int_Booking_Status_Id}`}>
                      {t(statusKey(b.int_Booking_Status_Id))}
                    </span>
                    <span
                      style={{
                        ...payBadgeStyle,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      Payment: {payBadgeLabel}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: 4 }}>
                    🚗 <strong>{b.vehicleLabel}</strong> · {getBranchName(b.int_Pickup_Branch_Id)} → {getBranchName(b.int_Drop_Branch_Id)}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 2 }}>
                    📅 {b.dte_Pickup_Date} → {b.dte_Return_Date} ({b.int_Total_Days} days)
                  </div>
                  {isPaid && b.razorpayPaymentId && (
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                      💳 Pay ID: <code style={{ color: "var(--signal-green)" }}>{b.razorpayPaymentId}</code>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem" }}>
                      ₹{b.dbl_Net_Amount?.toFixed(0)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {/* Pay Now when payment is pending or failed */}
                    {!isPaid && !isCancelled && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                        onClick={() =>
                          setPaymentModalState({
                            isOpen: true,
                            booking: b,
                            isViewOnly: false,
                          })
                        }
                      >
                        💳 Pay Now
                      </button>
                    )}

                    {/* View Receipt and Download PDF */}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                      onClick={() => setReceiptModalBooking(b)}
                    >
                      🧾 View Receipt
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                      onClick={() => downloadReceiptPdf(b, { vehicles })}
                    >
                      📥 Download PDF
                    </button>

                    <Link
                      to={`/vehicles/${b.int_Vehicle_Id}?book=true`}
                      className="btn btn-ghost"
                      style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                    >
                      🔁 {t("rebook")}
                    </Link>

                    {!isCancelled && b.int_Booking_Status_Id !== 4 && (
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={cancellingId === b.txt_Booking_Number}
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: t("cancel_booking"),
                            message: `${t("confirm_cancel_booking")} (Booking #${b.txt_Booking_Number})`,
                            isDanger: true,
                            onConfirm: async () => {
                              setCancellingId(b.txt_Booking_Number);
                              try {
                                await cancelBooking(b.txt_Booking_Number);
                                showToast(`Booking #${b.txt_Booking_Number} cancelled successfully in MongoDB`, "info", "🚫");
                              } catch (err) {
                                showToast(err.message || "Failed to cancel booking", "error", "⚠️");
                              } finally {
                                setCancellingId(null);
                              }
                            },
                          });
                        }}
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                      >
                        {cancellingId === b.txt_Booking_Number ? "Cancelling..." : t("cancel_booking")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isDanger={modalConfig.isDanger}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig({ isOpen: false })}
      />

      {/* Razorpay TEST Payment & Details Modal */}
      <RazorpayPaymentModal
        isOpen={paymentModalState.isOpen}
        booking={paymentModalState.booking}
        isViewOnly={paymentModalState.isViewOnly}
        onClose={() => setPaymentModalState({ isOpen: false, booking: null, isViewOnly: false })}
      />

      {/* Booking Receipt Modal */}
      <BookingReceiptModal
        isOpen={Boolean(receiptModalBooking)}
        booking={receiptModalBooking}
        onClose={() => setReceiptModalBooking(null)}
      />
    </div>
  );
}

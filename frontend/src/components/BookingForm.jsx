import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useBookings } from "../context/BookingContext";
import { useInteraction } from "../context/InteractionContext";
import { branches } from "../data/mockData";
import ConfettiBurst from "./ConfettiBurst";
import RazorpayPaymentModal from "./RazorpayPaymentModal";
import BookingReceiptModal from "./BookingReceiptModal";
import { downloadReceiptPdf } from "../utils/receiptPdfGenerator";

const TAX_RATE = 0.18;

const ADDON_RATES = {
  insurance: 299,
  gps: 149,
  roadside: 99,
  childSeat: 120,
};

function daysBetween(pickup, ret) {
  if (!pickup || !ret) return 0;
  const ms = new Date(ret) - new Date(pickup);
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
}

function addDaysToDate(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function BookingForm({ vehicle }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { coupons } = useFleet();
  const { addBooking } = useBookings();
  const { showToast } = useInteraction();
  const navigate = useNavigate();
  const location = useLocation();

  // Wizard Step State (1: Dates, 2: Add-ons, 3: Driver & Confirm)
  const [activeStep, setActiveStep] = useState(1);

  // Confetti trigger key
  const [confettiKey, setConfettiKey] = useState(null);

  const [form, setForm] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const start = today.toISOString().split("T")[0];
    const end = addDaysToDate(start, 3);
    return {
      customerName: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
      pickupBranch: String(vehicle.int_Branch_Id),
      dropBranch: String(vehicle.int_Branch_Id),
      pickupDate: start,
      returnDate: end,
      couponCode: "",
    };
  });

  const [addons, setAddons] = useState({
    insurance: true, // Recommended default
    gps: false,
    roadside: true,
    childSeat: false,
  });

  const [errors, setErrors] = useState({});
  const [couponStatus, setCouponStatus] = useState(null);
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
  const [appliedMaxDiscount, setAppliedMaxDiscount] = useState(0);
  const [successRef, setSuccessRef] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (user && activeStep === 3) {
      nameInputRef.current?.focus();
    }
  }, [user, activeStep]);

  const isMaintenance = vehicle.txt_Vehicle_Status === "M";

  const totalDays = useMemo(
    () => daysBetween(form.pickupDate, form.returnDate),
    [form.pickupDate, form.returnDate]
  );

  // Quick Day Adjustment Stepper
  const handleAdjustDays = (delta) => {
    const currentDays = totalDays > 0 ? totalDays : 1;
    const newDays = Math.max(1, currentDays + delta);
    const newReturn = addDaysToDate(form.pickupDate, newDays);
    setForm((prev) => ({ ...prev, returnDate: newReturn }));
  };

  const handleSetQuickDuration = (days) => {
    const newReturn = addDaysToDate(form.pickupDate, days);
    setForm((prev) => ({ ...prev, returnDate: newReturn }));
    showToast(`Rental set to ${days} days`, "info", "📅");
  };

  const dailyAddonsTotal = useMemo(() => {
    let sum = 0;
    if (addons.insurance) sum += ADDON_RATES.insurance;
    if (addons.gps) sum += ADDON_RATES.gps;
    if (addons.roadside) sum += ADDON_RATES.roadside;
    if (addons.childSeat) sum += ADDON_RATES.childSeat;
    return sum;
  }, [addons]);

  const pricing = useMemo(() => {
    const baseDaily = vehicle.dbl_Daily_Rent + dailyAddonsTotal;
    const subtotal = totalDays * baseDaily;
    let discount = 0;
    if (couponStatus === "valid") {
      discount = Math.min((subtotal * appliedDiscountPercent) / 100, appliedMaxDiscount || Infinity);
    }
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * TAX_RATE;
    const net = taxable + tax + vehicle.dbl_Security_Deposit;
    return { subtotal, discount, tax, net, baseDaily };
  }, [totalDays, vehicle, dailyAddonsTotal, couponStatus, appliedDiscountPercent, appliedMaxDiscount]);

  const updateField = useCallback((key) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleAddon = useCallback((key) => {
    setAddons((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const applyCouponCode = useCallback(
    (code) => {
      const codeToTest = (code || form.couponCode).trim();
      if (!codeToTest) return;

      const found = coupons.find(
        (c) => c.txt_Coupon_Code.toLowerCase() === codeToTest.toLowerCase()
      );

      if (found && new Date(found.dte_Valid_To) >= new Date()) {
        setForm((prev) => ({ ...prev, couponCode: found.txt_Coupon_Code }));
        setCouponStatus("valid");
        setAppliedDiscountPercent(found.dbl_Discount_Percent);
        setAppliedMaxDiscount(found.dbl_Max_Discount_Amount);
        setConfettiKey(`coupon-${Date.now()}`);
        showToast(`Promo ${found.txt_Coupon_Code} applied: ${found.dbl_Discount_Percent}% discount! 🎉`, "success", "🏷️");
      } else {
        setCouponStatus("invalid");
        setAppliedDiscountPercent(0);
        setAppliedMaxDiscount(0);
        showToast("Invalid or expired coupon code", "warning", "⚠️");
      }
    },
    [form.couponCode, coupons, showToast]
  );

  const validateStep1 = useCallback(() => {
    const next = {};
    if (!form.pickupDate) next.pickupDate = t("field_required");
    if (!form.returnDate) next.returnDate = t("field_required");
    if (form.pickupDate && form.returnDate && new Date(form.returnDate) <= new Date(form.pickupDate)) {
      next.returnDate = t("dates_invalid");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form.pickupDate, form.returnDate, t]);

  const validateStep3 = useCallback(() => {
    const next = {};
    if (!form.customerName.trim()) next.customerName = t("field_required");
    if (!/^\d{10}$/.test(form.phone.trim())) next.phone = t("invalid_phone");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = t("invalid_email");
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form.customerName, form.phone, form.email, t]);

  const handleNextStep = () => {
    if (activeStep === 1 && !validateStep1()) return;
    setActiveStep((prev) => Math.min(3, prev + 1));
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateStep1() || !validateStep3()) return;

      // If booking already created and pending, re-open checkout (prevents duplicate bookings)
      if (activeBooking && activeBooking.paymentStatus !== "Paid") {
        setShowPaymentModal(true);
        return;
      }

      setSubmitting(true);
      try {
        const created = await addBooking({
          int_Vehicle_Id: vehicle.int_Vehicle_Id,
          vehicleId: vehicle._id || vehicle.int_Vehicle_Id,
          vehicleLabel: vehicle.txt_Model_Name,
          customerName: form.customerName,
          customerUsername: user?.username || "guest",
          phone: form.phone,
          email: form.email,
          int_Pickup_Branch_Id: Number(form.pickupBranch),
          int_Drop_Branch_Id: Number(form.dropBranch),
          dte_Pickup_Date: form.pickupDate,
          dte_Return_Date: form.returnDate,
          pickupDate: form.pickupDate,
          returnDate: form.returnDate,
          addons,
          couponCode: form.couponCode,
        });

        setActiveBooking(created);
        setShowPaymentModal(true);
        showToast(`Reservation #${created.txt_Booking_Number} created! Opening Razorpay test checkout...`, "info", "💳");
      } catch (err) {
        showToast(err.message || "Failed to confirm reservation", "error", "⚠️");
      } finally {
        setSubmitting(false);
      }
    },
    [validateStep1, validateStep3, addBooking, vehicle, form, addons, user, showToast, activeBooking]
  );

  // If vehicle is in maintenance
  if (isMaintenance) {
    return (
      <div className="booking-card" style={{ textAlign: "center", padding: "36px 20px" }}>
        <div style={{ fontSize: "2.2rem", marginBottom: "10px" }}>🔧</div>
        <h3>Vehicle Under Maintenance</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
          This vehicle is currently undergoing routine maintenance and is temporarily unavailable for reservations.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate("/vehicles")}
          style={{ width: "100%" }}
        >
          Browse Alternative Vehicles →
        </button>
      </div>
    );
  }

  // Gate booking behind login
  if (!user) {
    return (
      <div className="booking-card" style={{ textAlign: "center", padding: "36px 24px" }}>
        <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🔒</div>
        <h3>{t("login_required_to_book")}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "24px" }}>
          Sign in or create a customer account in seconds to reserve this ride, apply discount promo coupons, and inspect verified RC/Insurance records.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={() => navigate("/login", { state: { from: location } })}
        >
          {t("login_btn")} / {t("signup_tab")} →
        </button>
      </div>
    );
  }

  if (successRef) {
    const isPaid = activeBooking?.paymentStatus === "Paid";
    return (
      <div className="booking-card" style={{ textAlign: "center", padding: "36px 20px" }}>
        <ConfettiBurst triggerKey={confettiKey} />
        <div style={{ fontSize: "2.8rem", marginBottom: "8px" }}>🎉</div>
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            background: "rgba(16, 185, 129, 0.15)",
            color: "var(--signal-green)",
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          ✓ {isPaid ? "Payment Verified · Booking Confirmed" : "Booking Confirmed"}
        </div>
        <h3 style={{ margin: "4px 0", fontSize: "1.3rem" }}>{t("booking_success")}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "8px 0 14px" }}>
          {t("booking_reference")}: <strong style={{ color: "var(--accent)" }}>{successRef}</strong>
        </p>

        {activeBooking?.razorpayPaymentId && (
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            Razorpay Payment ID: <code style={{ color: "var(--signal-green)" }}>{activeBooking.razorpayPaymentId}</code>
          </div>
        )}

        <div className="booking-summary-pill">
          <span>{totalDays} Days</span> · <span>📍 {branches.find((b) => b.int_Branch_Id === Number(form.pickupBranch))?.txt_Branch_Name}</span> · <span>₹{Math.round(pricing.net).toLocaleString("en-IN")}</span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", margin: "16px 0 24px" }}>
          Your reservation has been confirmed and secured in MongoDB. We have sent the trip receipt to {form.email}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Action buttons: View Receipt & Download PDF */}
          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              onClick={() => setShowReceiptModal(true)}
            >
              🧾 View Receipt
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              onClick={() => downloadReceiptPdf(activeBooking, { vehicles: [vehicle] })}
            >
              📥 Download PDF
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/my-bookings")}
          >
            {t("nav_bookings")} →
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSuccessRef(null);
              setActiveBooking(null);
              setActiveStep(1);
            }}
          >
            Book Another Ride
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-card">
      <ConfettiBurst triggerKey={confettiKey} />

      {/* Interactive Wizard Step Progress */}
      <div className="wizard-progress-bar">
        <div
          className={`wizard-step-node ${activeStep >= 1 ? "active" : ""}`}
          onClick={() => setActiveStep(1)}
        >
          <span className="step-num">1</span>
          <span className="step-text">Dates &amp; Hub</span>
        </div>
        <div className={`wizard-line ${activeStep >= 2 ? "active" : ""}`} />
        <div
          className={`wizard-step-node ${activeStep >= 2 ? "active" : ""}`}
          onClick={() => {
            if (validateStep1()) setActiveStep(2);
          }}
        >
          <span className="step-num">2</span>
          <span className="step-text">Add-ons</span>
        </div>
        <div className={`wizard-line ${activeStep >= 3 ? "active" : ""}`} />
        <div
          className={`wizard-step-node ${activeStep >= 3 ? "active" : ""}`}
          onClick={() => {
            if (validateStep1()) setActiveStep(3);
          }}
        >
          <span className="step-num">3</span>
          <span className="step-text">Confirm</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* STEP 1: Dates & Hubs */}
        {activeStep === 1 && (
          <div className="wizard-step-body">
            <h4 style={{ margin: "0 0 14px", fontSize: "1.05rem" }}>📅 Trip Schedule &amp; Hubs</h4>

            {/* Quick Duration Stepper */}
            <div className="duration-stepper-box">
              <div className="duration-stepper-label">
                <span>Rental Duration:</span>
                <strong>{totalDays} {totalDays === 1 ? "Day" : "Days"}</strong>
                {form.pickupDate && form.returnDate && (
                  <span className="duration-dates-tag">
                    {form.pickupDate} → {form.returnDate}
                  </span>
                )}
              </div>
              <div className="duration-stepper-controls">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => handleAdjustDays(-1)}
                  disabled={totalDays <= 1}
                  title="Subtract 1 day"
                >
                  −
                </button>
                <span className="stepper-display">{totalDays}d</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => handleAdjustDays(1)}
                  title="Add 1 day"
                >
                  +
                </button>
              </div>
            </div>

            {/* Duration Shortcut Chips */}
            <div className="quick-duration-chips">
              {[
                { days: 2, label: "Weekend (2d)" },
                { days: 5, label: "5 Days" },
                { days: 7, label: "1 Week (7d)" },
                { days: 14, label: "2 Weeks" },
              ].map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  className={totalDays === preset.days ? "active" : ""}
                  onClick={() => handleSetQuickDuration(preset.days)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="form-row" style={{ marginTop: "14px" }}>
              <label htmlFor="pickupDate">{t("pickup_date")}</label>
              <input
                id="pickupDate"
                type="date"
                value={form.pickupDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={updateField("pickupDate")}
              />
              {errors.pickupDate && <span className="error-text">{errors.pickupDate}</span>}
            </div>

            <div className="form-row">
              <label htmlFor="returnDate">{t("return_date")}</label>
              <input
                id="returnDate"
                type="date"
                value={form.returnDate}
                min={form.pickupDate || new Date().toISOString().split("T")[0]}
                onChange={updateField("returnDate")}
              />
              {errors.returnDate && <span className="error-text">{errors.returnDate}</span>}
            </div>

            <div className="form-row">
              <label htmlFor="pickupBranch">{t("pickup_branch")}</label>
              <select id="pickupBranch" value={form.pickupBranch} onChange={updateField("pickupBranch")}>
                {branches.map((b) => (
                  <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                    {b.txt_Branch_Name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="dropBranch">{t("drop_branch")}</label>
              <select id="dropBranch" value={form.dropBranch} onChange={updateField("dropBranch")}>
                {branches.map((b) => (
                  <option key={b.int_Branch_Id} value={b.int_Branch_Id}>
                    {b.txt_Branch_Name}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Pricing Estimation Bar */}
            <div className="live-pricing-bar">
              <div className="live-pricing-col">
                <span className="live-pricing-label">Trip Duration</span>
                <span className="live-pricing-val">{totalDays} Days</span>
              </div>
              <div className="live-pricing-col">
                <span className="live-pricing-label">Base Rate</span>
                <span className="live-pricing-val">₹{vehicle.dbl_Daily_Rent.toLocaleString("en-IN")}/d</span>
              </div>
              <div className="live-pricing-total-col">
                <span className="live-pricing-label">Live Estimate</span>
                <span className="live-pricing-total-val">₹{Math.round(pricing.net).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "16px", padding: "12px" }}
              onClick={handleNextStep}
            >
              Continue to Add-ons (Step 2) ➔
            </button>
          </div>
        )}

        {/* STEP 2: Add-ons & Protection */}
        {activeStep === 2 && (
          <div className="wizard-step-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem" }}>🛡️ Customize Protection &amp; Extras</h4>
              <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>
                {Object.values(addons).filter(Boolean).length} Selected
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "14px" }}>
              Select optional perks for maximum peace of mind on highways.
            </p>

            <div className="addon-options-list">
              <label className={`addon-option ${addons.insurance ? "checked" : ""}`}>
                <div className="addon-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={addons.insurance}
                    onChange={() => toggleAddon("insurance")}
                  />
                  <span className="addon-custom-check">✓</span>
                </div>
                <div className="addon-icon">🛡️</div>
                <div className="addon-info">
                  <span className="addon-name">Zero-Depreciation Damage Waiver</span>
                  <span className="addon-desc">Covers bumper damage, scratches &amp; dent repairs</span>
                </div>
                <div className="addon-price-badge">
                  <strong>+₹299</strong>
                  <small>/day</small>
                </div>
              </label>

              <label className={`addon-option ${addons.roadside ? "checked" : ""}`}>
                <div className="addon-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={addons.roadside}
                    onChange={() => toggleAddon("roadside")}
                  />
                  <span className="addon-custom-check">✓</span>
                </div>
                <div className="addon-icon">🛟</div>
                <div className="addon-info">
                  <span className="addon-name">24/7 Roadside Assistance &amp; Towing</span>
                  <span className="addon-desc">Flat tire change, battery jump &amp; emergency cab</span>
                </div>
                <div className="addon-price-badge">
                  <strong>+₹99</strong>
                  <small>/day</small>
                </div>
              </label>

              <label className={`addon-option ${addons.gps ? "checked" : ""}`}>
                <div className="addon-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={addons.gps}
                    onChange={() => toggleAddon("gps")}
                  />
                  <span className="addon-custom-check">✓</span>
                </div>
                <div className="addon-icon">📡</div>
                <div className="addon-info">
                  <span className="addon-name">High-Definition Dual Dashcam + GPS</span>
                  <span className="addon-desc">Road trip safety footage &amp; offline navigation</span>
                </div>
                <div className="addon-price-badge">
                  <strong>+₹149</strong>
                  <small>/day</small>
                </div>
              </label>

              <label className={`addon-option ${addons.childSeat ? "checked" : ""}`}>
                <div className="addon-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={addons.childSeat}
                    onChange={() => toggleAddon("childSeat")}
                  />
                  <span className="addon-custom-check">✓</span>
                </div>
                <div className="addon-icon">👶</div>
                <div className="addon-info">
                  <span className="addon-name">ISOFIX Child Safety Infant Seat</span>
                  <span className="addon-desc">Clean, certified comfortable toddler seat</span>
                </div>
                <div className="addon-price-badge">
                  <strong>+₹120</strong>
                  <small>/day</small>
                </div>
              </label>
            </div>

            {/* Live Pricing Estimation Bar with Addons */}
            <div className="live-pricing-bar">
              <div className="live-pricing-col">
                <span className="live-pricing-label">Trip Duration</span>
                <span className="live-pricing-val">{totalDays} Days</span>
              </div>
              <div className="live-pricing-col">
                <span className="live-pricing-label">Daily (+Addons)</span>
                <span className="live-pricing-val">₹{pricing.baseDaily.toLocaleString("en-IN")}/d</span>
              </div>
              <div className="live-pricing-total-col">
                <span className="live-pricing-label">Live Estimate</span>
                <span className="live-pricing-total-val">₹{Math.round(pricing.net).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setActiveStep(1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1.5 }}
                onClick={() => setActiveStep(3)}
              >
                Next: Review &amp; Book ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Driver Details & Coupons */}
        {activeStep === 3 && (
          <div className="wizard-step-body">
            <h4 style={{ margin: "0 0 14px", fontSize: "1.05rem" }}>👤 Driver Info &amp; Fare Summary</h4>

            <div className="form-row">
              <label htmlFor="customerName">{t("customer_name")}</label>
              <input
                id="customerName"
                ref={nameInputRef}
                value={form.customerName}
                onChange={updateField("customerName")}
              />
              {errors.customerName && <span className="error-text">{errors.customerName}</span>}
            </div>

            <div className="form-row">
              <label htmlFor="phone">{t("customer_phone")}</label>
              <input
                id="phone"
                value={form.phone}
                onChange={updateField("phone")}
                placeholder="10 digit mobile"
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            <div className="form-row">
              <label htmlFor="email">{t("customer_email")}</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={updateField("email")}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* Interactive Promo Coupons */}
            <div className="form-row" style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="couponCode" style={{ margin: 0 }}>{t("coupon_code")}</label>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Tap to apply:</span>
              </div>

              <div className="quick-coupons-bar">
                {coupons.map((c) => (
                  <button
                    key={c.txt_Coupon_Code}
                    type="button"
                    className="quick-coupon-btn"
                    onClick={() => applyCouponCode(c.txt_Coupon_Code)}
                    title={`Apply ${c.txt_Coupon_Code}`}
                  >
                    🏷️ <strong>{c.txt_Coupon_Code}</strong> ({c.dbl_Discount_Percent}% OFF)
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <input
                  id="couponCode"
                  value={form.couponCode}
                  onChange={updateField("couponCode")}
                  placeholder="Enter Promo Code"
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => applyCouponCode()}
                >
                  {t("apply_coupon")}
                </button>
              </div>

              {couponStatus === "valid" && (
                <span style={{ color: "var(--signal-green)", fontSize: "0.82rem", marginTop: "4px", display: "block" }}>
                  ✓ {t("coupon_applied")} ({appliedDiscountPercent}% off discount)
                </span>
              )}
              {couponStatus === "invalid" && (
                <span className="error-text" style={{ marginTop: "4px", display: "block" }}>
                  {t("coupon_invalid")}
                </span>
              )}
            </div>

            {/* Real-time Comprehensive Pricing Summary */}
            <div className="pricing-box" style={{ marginTop: "16px" }}>
              <div className="pricing-header">
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>💳 Live Trip Fare Calculation</span>
                <span className="pricing-badge">{totalDays} {totalDays === 1 ? "Day" : "Days"}</span>
              </div>
              <div className="pricing-row">
                <span>Base Rent ({totalDays}d × ₹{vehicle.dbl_Daily_Rent.toLocaleString("en-IN")})</span>
                <span>₹{(totalDays * vehicle.dbl_Daily_Rent).toLocaleString("en-IN")}</span>
              </div>
              {dailyAddonsTotal > 0 && (
                <div className="pricing-row">
                  <span>Selected Protection &amp; Extras ({totalDays}d × ₹{dailyAddonsTotal}/d)</span>
                  <span>+₹{(totalDays * dailyAddonsTotal).toLocaleString("en-IN")}</span>
                </div>
              )}
              {pricing.discount > 0 && (
                <div className="pricing-row discount-row" style={{ color: "var(--signal-green)" }}>
                  <span>Promo Discount ({appliedDiscountPercent}%)</span>
                  <span>-₹{pricing.discount.toFixed(0)}</span>
                </div>
              )}
              <div className="pricing-row">
                <span>GST (18% Goods &amp; Services Tax)</span>
                <span>₹{pricing.tax.toFixed(0)}</span>
              </div>
              <div className="pricing-row">
                <span>Refundable Security Deposit</span>
                <span>₹{vehicle.dbl_Security_Deposit.toLocaleString("en-IN")}</span>
              </div>
              <div className="pricing-divider" />
              <div className="pricing-total">
                <div>
                  <span className="total-title">{t("net_amount")}</span>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-faint)" }}>
                    All inclusive (₹{Math.round(pricing.baseDaily).toLocaleString("en-IN")}/day)
                  </div>
                </div>
                <span className="total-amount">₹{Math.round(pricing.net).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setActiveStep(2)}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1.8, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                disabled={submitting}
              >
                {submitting ? (
                  "⏳ Preparing Checkout..."
                ) : activeBooking && activeBooking.paymentStatus !== "Paid" ? (
                  `💳 Pay Now with Razorpay (₹${Math.round(pricing.net).toLocaleString("en-IN")})`
                ) : (
                  `⚡ Proceed to Payment (₹${Math.round(pricing.net).toLocaleString("en-IN")})`
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Razorpay TEST Mode Payment Modal */}
      <RazorpayPaymentModal
        isOpen={showPaymentModal}
        booking={activeBooking}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={(confirmedBooking) => {
          setActiveBooking(confirmedBooking);
          setSuccessRef(confirmedBooking.txt_Booking_Number);
          setConfettiKey(`booking-${Date.now()}`);
          setShowPaymentModal(false);
        }}
      />

      {/* Booking Receipt Modal */}
      <BookingReceiptModal
        isOpen={showReceiptModal}
        booking={activeBooking}
        onClose={() => setShowReceiptModal(false)}
      />
    </div>
  );
}

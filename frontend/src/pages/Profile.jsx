import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useBookings } from "../context/BookingContext";
import CustomerDocumentsCard from "../components/documents/CustomerDocumentsCard";
import StaffProfileCard from "../components/dashboard/StaffProfileCard";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const { bookings } = useBookings();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    addressLine2: user?.addressLine2 || "",
    city: user?.city || "",
    state: user?.state || "",
    pincode: user?.pincode || "",
    country: user?.country || "India",
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    document.title = `${t("profile_title")} · ${t("appName")}`;
  }, [t]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        addressLine2: user.addressLine2 || "",
        city: user.city || "",
        state: user.state || "",
        pincode: user.pincode || "",
        country: user.country || "India",
      });
    }
  }, [user]);

  if (!user) return null;

  // Staff members view and manage their own Staff Profile (no Customer KYC required)
  if (user.role === "staff") {
    return (
      <div className="container" style={{ padding: "40px 16px" }}>
        <StaffProfileCard />
      </div>
    );
  }

  // Filter bookings for this customer
  const myBookings = bookings.filter(
    (b) =>
      b.customerUsername === user.username ||
      (b.email && b.email.toLowerCase() === user.email?.toLowerCase())
  );

  const totalSpent = myBookings.reduce((sum, b) => sum + (b.dbl_Net_Amount || 0), 0);
  const activeBookings = myBookings.filter((b) => ![4, 5].includes(b.int_Booking_Status_Id));

  const hasSavedAddress = Boolean(
    user?.address || user?.city || user?.state || user?.pincode
  );

  const formattedSavedAddress = [
    user?.address,
    user?.addressLine2,
    [user?.city, user?.state].filter(Boolean).join(", "),
    user?.pincode ? `PIN: ${user.pincode}` : "",
    user?.country || "India",
  ]
    .filter(Boolean)
    .join(", ");

  const handleSave = (e) => {
    e.preventDefault();
    if (form.pincode && form.pincode.length !== 6) {
      setFeedback("Please enter a valid 6-digit PIN code.");
      return;
    }
    updateProfile(form);
    setFeedback(t("profile_updated"));
    setTimeout(() => setFeedback(""), 3500);
  };

  return (
    <div className="container" style={{ padding: "40px 16px", maxWidth: "860px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ marginBottom: "6px" }}>{t("profile_title")}</h1>
          <div style={{ color: "var(--text-muted)" }}>
            @{user.username} · <span className="badge badge-role-customer">{t(`role_${user.role}`)}</span>
          </div>
        </div>
        <Link to="/my-bookings" className="btn btn-ghost">
          {t("nav_bookings")} ({myBookings.length})
        </Link>
      </div>

      <div className="stat-grid" style={{ margin: "0 0 32px 0" }}>
        <div className="stat-card">
          <div className="stat-label">{t("total_bookings")}</div>
          <div className="stat-value">{myBookings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("active_bookings")}</div>
          <div className="stat-value">{activeBookings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("total_revenue")}</div>
          <div className="stat-value">₹{totalSpent.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "28px" }}>
        {feedback && (
          <div className={`alert ${feedback.includes("valid") ? "alert-error" : "alert-success"}`} style={{ marginBottom: "20px" }}>
            {feedback}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="profile-section-header">
            <h3 className="profile-section-title">👤 {t("personal_info")}</h3>
          </div>

          <div className="form-row">
            <label htmlFor="profName">{t("customer_name")}</label>
            <input
              id="profName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="profEmail">{t("customer_email")}</label>
            <input
              id="profEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="profPhone">{t("customer_phone")}</label>
            <input
              id="profPhone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label>{t("username")}</label>
            <input value={user.username} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </div>

          <hr className="profile-section-divider" />

          <div className="profile-section-header">
            <h3 className="profile-section-title">📍 {t("address_details")}</h3>
            {hasSavedAddress && (
              <span className="badge badge-available" style={{ fontSize: "0.75rem" }}>
                ✓ {t("address_summary")}
              </span>
            )}
          </div>

          {hasSavedAddress ? (
            <div className="profile-address-preview">
              <div className="profile-address-icon">🏠</div>
              <div className="profile-address-body">
                <div className="profile-address-headline">{t("address_summary")}</div>
                <div className="profile-address-text">{formattedSavedAddress}</div>
              </div>
            </div>
          ) : (
            <div className="profile-address-preview">
              <div className="profile-address-icon">ℹ️</div>
              <div className="profile-address-body">
                <div className="profile-address-text" style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  {t("address_not_set")}
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <label htmlFor="profAddress">{t("address_street")}</label>
            <input
              id="profAddress"
              value={form.address}
              placeholder="e.g. 42/7, Anna Nagar 2nd Avenue"
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="profAddressLine2">{t("address_line2")}</label>
            <input
              id="profAddressLine2"
              value={form.addressLine2}
              placeholder="e.g. Near Roundtana / Flat 4B (Optional)"
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            />
          </div>

          <div className="form-row two">
            <div>
              <label htmlFor="profCity">{t("address_city")}</label>
              <input
                id="profCity"
                value={form.city}
                placeholder="e.g. Chennai"
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="profState">{t("address_state")}</label>
              <input
                id="profState"
                value={form.state}
                placeholder="e.g. Tamil Nadu"
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row two">
            <div>
              <label htmlFor="profPincode">{t("address_pincode")}</label>
              <input
                id="profPincode"
                value={form.pincode}
                placeholder="e.g. 600040"
                maxLength={6}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setForm({ ...form, pincode: val });
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="profCountry">{t("address_country")}</label>
              <input
                id="profCountry"
                value={form.country}
                placeholder="India"
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "18px" }}>
            {t("save_profile")}
          </button>
        </form>
      </div>

      {/* Customer KYC Documents */}
      <CustomerDocumentsCard />
    </div>
  );
}

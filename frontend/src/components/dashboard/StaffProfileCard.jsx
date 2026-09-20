import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getBranchName } from "../../data/mockData";

export default function StaffProfileCard() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", isError: false });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        dateOfBirth: user.dateOfBirth || "",
        emergencyContactName: user.emergencyContactName || "",
        emergencyContactPhone: user.emergencyContactPhone || "",
      });
    }
  }, [user]);

  if (!user) return null;

  const branchId = user.int_Branch_Id || 1;
  const branchName = getBranchName(branchId);
  const employeeId = user.employeeId || "RR-STF-" + String(branchId).padStart(3, "0");
  const accountStatus = user.accountStatus || (user.active !== false ? "Active" : "Deactivated");

  const getStatusBadgeStyle = () => {
    switch (accountStatus) {
      case "Active":
        return { background: "rgba(46,125,79,0.16)", color: "var(--signal-green)", border: "1px solid rgba(46,125,79,0.3)" };
      case "Pending Approval":
        return { background: "rgba(217,119,6,0.16)", color: "var(--signal-amber)", border: "1px solid rgba(217,119,6,0.3)" };
      default:
        return { background: "rgba(181,67,45,0.16)", color: "var(--signal-red)", border: "1px solid rgba(181,67,45,0.3)" };
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ text: "", isError: false });

    // Validate phone number if entered
    if (form.phone && !/^\d{10}$/.test(form.phone.trim())) {
      setFeedback({ text: "Phone number must be exactly 10 digits.", isError: true });
      return;
    }

    // Validate emergency phone if entered
    if (form.emergencyContactPhone && !/^\d{10}$/.test(form.emergencyContactPhone.trim())) {
      setFeedback({ text: "Emergency contact phone must be exactly 10 digits.", isError: true });
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      dateOfBirth: form.dateOfBirth,
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
    });
    setSaving(false);

    if (result.success) {
      setFeedback({ text: "Personal information updated successfully!", isError: false });
      setTimeout(() => setFeedback({ text: "", isError: false }), 4000);
    } else {
      setFeedback({ text: result.message || "Failed to save profile updates.", isError: true });
    }
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Staff Overview Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(30, 41, 59, 0.08) 100%)",
          border: "1px solid rgba(14, 165, 233, 0.28)",
          borderRadius: "var(--radius)",
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span className="role-pill role-pill-staff" style={{ fontSize: "0.85rem", padding: "4px 12px" }}>
              🏢 Role: Staff
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: "999px",
                ...getStatusBadgeStyle(),
              }}
            >
              ● {accountStatus}
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                padding: "3px 10px",
                borderRadius: "999px",
              }}
            >
              ID: {employeeId}
            </span>
          </div>

          <h2 style={{ margin: "0 0 6px 0", fontSize: "1.6rem" }}>
            {user.name || "Staff Member"}
          </h2>
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            @{user.username} · Branch: <strong>{branchName}</strong> (Branch #{branchId})
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "12px 18px",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Assigned Branch
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--accent)" }}>
            {branchName}
          </div>
        </div>
      </div>

      {/* Compliance Note */}
      <div
        style={{
          background: "rgba(14, 165, 233, 0.08)",
          border: "1px solid rgba(14, 165, 233, 0.25)",
          borderRadius: "var(--radius)",
          padding: "12px 18px",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>🛡️</span>
        <div>
          <strong>Enterprise Staff Verification:</strong> RoadReady staff accounts do not require Customer KYC (Aadhaar / Driving License). Account verification and branch assignments are securely controlled by System Administrators.
        </div>
      </div>

      {/* Profile Form Card */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "28px",
        }}
      >
        {feedback.text && (
          <div
            className={`alert ${feedback.isError ? "alert-error" : "alert-success"}`}
            style={{ marginBottom: "20px" }}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* SECTION 1: Personal Details */}
          <div className="profile-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className="profile-section-title" style={{ margin: 0 }}>
              👤 Personal Information
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Self-service editable by you
            </span>
          </div>

          <div className="form-row two">
            <div>
              <label htmlFor="staff-full-name">Full Name *</label>
              <input
                id="staff-full-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label htmlFor="staff-dob">Date of Birth</label>
              <input
                id="staff-dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row two">
            <div>
              <label htmlFor="staff-email">Email Address</label>
              <input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="staff@roadready.com"
              />
            </div>
            <div>
              <label htmlFor="staff-phone">Phone Number (10 Digits)</label>
              <input
                id="staff-phone"
                value={form.phone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, phone: val });
                }}
                placeholder="e.g. 9840112233"
              />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="staff-address">Address</label>
            <input
              id="staff-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Door No, Street, City, State, PIN"
            />
          </div>

          <hr className="profile-section-divider" style={{ margin: "24px 0" }} />

          {/* SECTION 2: Emergency Contact */}
          <div className="profile-section-header" style={{ marginBottom: "16px" }}>
            <h3 className="profile-section-title" style={{ margin: 0 }}>
              🚨 Emergency Contact Details
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0 0" }}>
              Designated contact in the event of an operational incident or emergency.
            </p>
          </div>

          <div className="form-row two">
            <div>
              <label htmlFor="staff-emer-name">Emergency Contact Name</label>
              <input
                id="staff-emer-name"
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                placeholder="e.g. Spouse, Parent, or Guardian Name"
              />
            </div>
            <div>
              <label htmlFor="staff-emer-phone">Emergency Contact Phone (10 Digits)</label>
              <input
                id="staff-emer-phone"
                value={form.emergencyContactPhone}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, emergencyContactPhone: val });
                }}
                placeholder="e.g. 9840119900"
              />
            </div>
          </div>

          <hr className="profile-section-divider" style={{ margin: "24px 0" }} />

          {/* SECTION 3: Organization & Administration Fields (Read-Only) */}
          <div className="profile-section-header" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="profile-section-title" style={{ margin: 0 }}>
                🏢 Enterprise & Branch Details
              </h3>
              <span className="badge" style={{ background: "rgba(100,116,139,0.16)", color: "var(--text-muted)" }}>
                🔒 Managed by Admin
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0 0" }}>
              These values are restricted to Enterprise Administrators and cannot be modified by staff.
            </p>
          </div>

          <div className="form-row two">
            <div>
              <label>Employee ID</label>
              <input
                value={employeeId}
                disabled
                style={{ opacity: 0.75, cursor: "not-allowed", background: "var(--bg-subtle)" }}
              />
            </div>
            <div>
              <label>Assigned Branch</label>
              <input
                value={`${branchName} (Branch #${branchId})`}
                disabled
                style={{ opacity: 0.75, cursor: "not-allowed", background: "var(--bg-subtle)" }}
              />
            </div>
          </div>

          <div className="form-row two">
            <div>
              <label>Account Role</label>
              <input
                value="Staff"
                disabled
                style={{ opacity: 0.75, cursor: "not-allowed", background: "var(--bg-subtle)" }}
              />
            </div>
            <div>
              <label>Account Status / Verification</label>
              <input
                value={accountStatus}
                disabled
                style={{ opacity: 0.75, cursor: "not-allowed", background: "var(--bg-subtle)" }}
              />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: "160px" }}
            >
              {saving ? "Saving Changes..." : "💾 Save My Personal Info"}
            </button>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Changes are immediately applied to your active profile.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

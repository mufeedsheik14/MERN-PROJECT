import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FleetLiveTracking from "../components/dashboard/FleetLiveTracking";
import { getBranchName } from "../data/mockData";

export default function LiveTracking() {
  const { bookingId } = useParams();
  const { user, isAdmin, isStaff } = useAuth();

  return (
    <div className="container" style={{ padding: "32px 16px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(217, 94, 37, 0.1) 0%, rgba(79, 190, 131, 0.08) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "22px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <Link
              to="/dashboard"
              className="btn btn-ghost"
              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
            >
              ← Back to Dashboard
            </Link>
            {isAdmin && <span className="role-pill role-pill-admin">👑 Admin Fleet</span>}
            {isStaff && (
              <span className="role-pill role-pill-staff">
                🛡️ Staff ({user?.int_Branch_Id ? getBranchName(user.int_Branch_Id).split(" ")[0] : "Branch"})
              </span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: "1.9rem" }}>🛰️ Live Fleet Telemetry & GPS Tracking</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
            Real-time phone GPS telemetry, live fleet map tracking, speed metrics, and trip status updates.
          </p>
        </div>
      </div>

      {/* Fleet Live Tracking Component */}
      <FleetLiveTracking
        branchFilter={isStaff ? user?.int_Branch_Id : null}
        initialBookingId={bookingId}
      />
    </div>
  );
}

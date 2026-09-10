import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, hasRole, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <div
          style={{
            fontSize: "2.5rem",
            marginBottom: "16px",
            display: "inline-block",
            animation: "spin 1.5s linear infinite",
          }}
        >
          ⚙️
        </div>
        <p style={{ color: "var(--text-muted)" }}>Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // If authenticated user lacks role, redirect to appropriate default space
    if (user.role === "customer") {
      return <Navigate to="/my-bookings" replace />;
    }
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <h2>{t("access_denied_title") || "Access Denied"}</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "12px", marginBottom: "24px" }}>
          {t("access_denied_desc") || "You do not have permission to view this page."}
        </p>
        <a href="/" className="btn btn-primary">
          {t("nav_home")}
        </a>
      </div>
    );
  }

  return children;
}

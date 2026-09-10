import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import StaffDashboard from "../components/dashboard/StaffDashboard";

export default function Dashboard() {
  const { user, isAdmin, isStaff } = useAuth();
  const { t } = useLanguage();
  useEffect(() => {
    if (isAdmin) {
      document.title = `${t("admin_dashboard_title")} · ${t("appName")}`;
    } else if (isStaff) {
      document.title = `${t("staff_dashboard_title")} · ${t("appName")}`;
    }
  }, [isAdmin, isStaff, t]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isStaff) {
    return <StaffDashboard />;
  }
  // Customers go to My Bookings
  return <Navigate to="/my-bookings" replace />;
}

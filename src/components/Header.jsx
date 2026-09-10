import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { LANGUAGES } from "../i18n/translations";
import { getBranchName } from "../data/mockData";
import { useInteraction } from "../context/InteractionContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { user, logout, isAdmin, isStaff, isCustomer } = useAuth();
  const { wishlist, setIsWishlistOpen } = useInteraction();
  const navigate = useNavigate();

  const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (isAdmin) {
      return <span className="role-pill role-pill-admin">👑 Admin</span>;
    }
    if (isStaff) {
      const branchLabel = user.int_Branch_Id ? getBranchName(user.int_Branch_Id) : "";
      return (
        <span className="role-pill role-pill-staff" title={`Branch: ${branchLabel}`}>
          🏢 Staff {branchLabel ? `(${branchLabel.split(" ")[0]})` : ""}
        </span>
      );
    }
    return <span className="role-pill role-pill-customer">👤 Customer</span>;
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">🚗</span>
          <div>
            <div>{t("appName")}</div>
            <div className="brand-tagline">{t("tagline")}</div>
          </div>
        </NavLink>

        <nav className="main-nav">
          <NavLink to="/" end className={navClass}>
            {t("nav_home")}
          </NavLink>
          <NavLink to="/vehicles" className={navClass}>
            {t("nav_vehicles")}
          </NavLink>
          
          {/* Customer links */}
          {isCustomer && (
            <NavLink to="/my-bookings" className={navClass}>
              {t("nav_bookings")}
            </NavLink>
          )}

          {/* Admin and Staff links */}
          {(isAdmin || isStaff) && (
            <>
              <NavLink to="/dashboard" className={navClass}>
                {t("nav_dashboard")}
              </NavLink>
              <NavLink to="/tracking" className={navClass}>
                🛰️ {t("nav_tracking") || "Live Fleet"}
              </NavLink>
            </>
          )}

          {/* Staff Portal link — shown only to guests and customers */}
          {!isAdmin && !isStaff && (
            <NavLink
              to="/staff-login"
              className={navClass}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "5px",
                opacity: isActive ? 1 : undefined,
              })}
            >
              🛡️ Staff Portal
            </NavLink>
          )}
        </nav>

        <div className="header-controls">
          <select
            className="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t("language")}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={t("theme_toggle")}
            title={t("theme_toggle")}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <button
            type="button"
            className="icon-btn header-wishlist-btn"
            onClick={() => setIsWishlistOpen(true)}
            aria-label="Saved Favorites"
            title="Saved Favorites"
          >
            <span>❤️</span>
            {wishlist.length > 0 && <span className="header-badge-count">{wishlist.length}</span>}
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isCustomer ? (
                <NavLink
                  to="/profile"
                  className="btn-user"
                  title={t("nav_profile")}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {getRoleBadge()}
                  <span style={{ fontWeight: 600 }}>{user.name}</span>
                </NavLink>
              ) : (
                <div
                  className="btn-user"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {getRoleBadge()}
                  <span style={{ fontWeight: 600 }}>{user.name}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="btn-ghost"
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
                title={t("logout")}
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="btn-user">
              {t("nav_login")}
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

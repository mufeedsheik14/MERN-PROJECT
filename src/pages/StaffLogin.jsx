import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { STAFF_MOCK_ACCOUNTS, getBranchName } from "../data/mockData";

export default function StaffLogin() {
  const { login, user, isStaff, isAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(null); // { name, branchName }

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail]         = useState("");
  const [forgotError, setForgotError]         = useState("");
  const [forgotSent, setForgotSent]           = useState(false);

  const identifierRef = useRef(null);
  const forgotEmailRef = useRef(null);

  // Redirect if already logged-in as staff/admin
  useEffect(() => {
    if (user && (isStaff || isAdmin)) {
      const returnPath = location.state?.from?.pathname;
      navigate(returnPath || "/dashboard", { replace: true });
    }
  }, [user, isStaff, isAdmin, navigate, location.state]);

  useEffect(() => {
    identifierRef.current?.focus();
  }, []);

  // Auto-focus forgot email field when modal opens
  useEffect(() => {
    if (showForgotModal) {
      setTimeout(() => forgotEmailRef.current?.focus(), 80);
    }
  }, [showForgotModal]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      setError("");

      if (!identifier.trim() || !password) {
        setError("Please enter your username / email and password.");
        return;
      }

      setIsLoggingIn(true);
      const result = await login(identifier.trim(), password);

      if (!result.success) {
        setIsLoggingIn(false);
        setError(
          result.message ||
            (result.errorKey === "account_deactivated"
              ? "This account has been deactivated. Contact your branch manager."
              : "Invalid credentials. Please check your username and password.")
        );
        return;
      }

      // Only staff and admin should access this portal
      const role = result.user?.role;
      if (role !== "staff" && role !== "admin") {
        setIsLoggingIn(false);
        setError("Access denied. This portal is for Staff and Admin only. Customers please use the main login.");
        return;
      }

      // Show brief "logging in" transition with branch name
      const branchName = result.user.int_Branch_Id
        ? getBranchName(result.user.int_Branch_Id)
        : "Head Office";
      setLoginSuccess({ name: result.user.name, branchName });

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1400);
    },
    [identifier, password, login, navigate]
  );

  const handleQuickDemo = useCallback(
    (acc) => {
      setIdentifier(acc.username);
      setPassword(acc.password);
      setError("");
      // Small delay so the user can see the fields fill before submitting
      setTimeout(async () => {
        setIsLoggingIn(true);
        const result = await login(acc.username, acc.password);
        if (!result.success) {
          setIsLoggingIn(false);
          setError(result.message || "Invalid credentials. Please check your username and password.");
          return;
        }

        const role = result.user?.role;
        if (role !== "staff" && role !== "admin") {
          setIsLoggingIn(false);
          setError("Access denied. This portal is for Staff and Admin only.");
          return;
        }

        const branchName = getBranchName(acc.int_Branch_Id);
        setLoginSuccess({ name: result.user.name, branchName });
        setTimeout(() => navigate("/dashboard", { replace: true }), 1400);
      }, 120);
    },
    [login, navigate]
  );

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail.trim())) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    setForgotSent(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail("");
    setForgotError("");
    setForgotSent(false);
  };

  /* ──────────────────────────────────────────
     LOGIN SUCCESS TRANSITION SCREEN
  ────────────────────────────────────────── */
  if (isLoggingIn && loginSuccess) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          gap: "20px",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0ea5e9 0%, #2e7d4f 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            boxShadow: "0 8px 32px rgba(14,165,233,0.35)",
            animation: "staff-pulse 1.2s ease-in-out infinite",
          }}
        >
          🏢
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Welcome, {loginSuccess.name}
          </div>
          <div style={{ color: "var(--text-muted)", marginTop: "6px" }}>
            Logging you in to{" "}
            <strong style={{ color: "#0ea5e9" }}>
              {loginSuccess.branchName}
            </strong>{" "}
            dashboard…
          </div>
        </div>
        <div
          style={{
            width: 200,
            height: 4,
            background: "var(--bg-inset)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #0ea5e9, #2e7d4f)",
              borderRadius: 999,
              animation: "staff-progress 1.3s ease forwards",
            }}
          />
        </div>
        <style>{`
          @keyframes staff-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.85; }
          }
          @keyframes staff-progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  /* ──────────────────────────────────────────
     MAIN RENDER
  ────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* ── Secure Portal Banner ── */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.13) 0%, rgba(46,125,79,0.10) 100%)",
            border: "1px solid rgba(14,165,233,0.28)",
            borderRadius: "var(--radius)",
            padding: "22px 28px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#0ea5e9",
                  background: "rgba(14,165,233,0.12)",
                  border: "1px solid rgba(14,165,233,0.3)",
                  borderRadius: "999px",
                  padding: "2px 10px",
                }}
              >
                Secure Portal
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontFamily: "var(--font-display)",
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              Staff Login
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              RoadReady · Branch Operations Portal
            </p>
          </div>
        </div>

        {/* ── Login Card ── */}
        <div
          className="login-wrap"
          style={{ maxWidth: "100%", padding: "32px" }}
        >
          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "20px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Username / Email */}
            <div className="form-row">
              <label htmlFor="staff-identifier">Username or Email</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "1rem",
                    pointerEvents: "none",
                    color: "var(--text-muted)",
                  }}
                >
                  👤
                </span>
                <input
                  id="staff-identifier"
                  ref={identifierRef}
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. staff_chennai or chennai@roadready.com"
                  style={{ paddingLeft: "2.4rem" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-row">
              <label htmlFor="staff-password">Password</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "1rem",
                    pointerEvents: "none",
                    color: "var(--text-muted)",
                  }}
                >
                  🔑
                </span>
                <input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: "2.4rem", paddingRight: "3rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: "1.05rem",
                    padding: "4px",
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Forgot Password link */}
            <div style={{ textAlign: "right", marginTop: "-8px", marginBottom: "20px" }}>
              <button
                type="button"
                id="forgot-password-btn"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "0.83rem",
                  fontWeight: 600,
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button
              id="staff-login-submit"
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                borderColor: "#0369a1",
                fontSize: "1rem",
                fontWeight: 700,
                padding: "13px",
                letterSpacing: "0.02em",
                boxShadow: "0 4px 16px rgba(14,165,233,0.28)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 22px rgba(14,165,233,0.38)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(14,165,233,0.28)";
              }}
            >
              🏢 Sign In to Staff Portal
            </button>
          </form>

          {/* ── Quick Demo Chips ── */}
          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px dashed var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Quick Demo — Branch Staff Accounts
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {STAFF_MOCK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  id={`demo-${acc.username}`}
                  onClick={() => handleQuickDemo(acc)}
                  className="btn btn-ghost"
                  style={{
                    padding: "7px 14px",
                    fontSize: "0.78rem",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                  }}
                >
                  {acc.emoji} {getBranchName(acc.int_Branch_Id).split(" ")[0]}
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: "10px",
                fontSize: "0.73rem",
                color: "var(--text-faint)",
              }}
            >
              All demo accounts use password:{" "}
              <code
                style={{
                  background: "var(--bg-inset)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontFamily: "monospace",
                }}
              >
                staff123
              </code>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: "16px",
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--text-faint)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🔒</span>
            <span>Restricted to authorised RoadReady staff only</span>
          </div>
          <div>
            Are you a customer?{" "}
            <Link
              to="/login"
              style={{
                color: "var(--accent)",
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Customer Login →
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          FORGOT PASSWORD MODAL
      ══════════════════════════════════════ */}
      {showForgotModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
            animation: "fadeIn 0.18s ease",
          }}
          onClick={closeForgotModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "32px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "var(--shadow-lg)",
              animation: "slideUp 0.22s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!forgotSent ? (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      background: "rgba(14,165,233,0.12)",
                      border: "1px solid rgba(14,165,233,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.4rem",
                      marginBottom: "14px",
                    }}
                  >
                    🔐
                  </div>
                  <h2 id="forgot-modal-title" style={{ margin: "0 0 6px 0", fontSize: "1.3rem" }}>
                    Forgot Password?
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Enter your registered staff email and we'll send a reset link to your branch manager.
                  </p>
                </div>

                {forgotError && (
                  <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotSubmit}>
                  <div className="form-row">
                    <label htmlFor="forgot-email">Staff Email Address</label>
                    <input
                      id="forgot-email"
                      ref={forgotEmailRef}
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. chennai@roadready.com"
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-ghost" onClick={closeForgotModal}>
                      Cancel
                    </button>
                    <button
                      id="forgot-submit"
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                        borderColor: "#0369a1",
                      }}
                    >
                      Send Reset Link
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "rgba(46,125,79,0.12)",
                    border: "2px solid var(--signal-green)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                    margin: "0 auto 18px",
                  }}
                >
                  ✅
                </div>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2rem" }}>Reset Link Sent!</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 6px 0", lineHeight: 1.5 }}>
                  A password reset link has been sent to your branch manager at
                </p>
                <p style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem", margin: "0 0 20px 0", wordBreak: "break-all" }}>
                  {forgotEmail}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", margin: "0 0 24px 0" }}>
                  Please contact your branch manager to complete the reset process.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={closeForgotModal}
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                    borderColor: "#0369a1",
                    width: "100%",
                  }}
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

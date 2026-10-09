import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/apiConfig";

const OAUTH_ERROR_MESSAGES = {
  cancelled: "Google sign-in was cancelled.",
  google_not_configured:
    "Google OAuth is not configured on the server yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.",
  missing_code_or_state: "Invalid Google authorization response. Missing code or state.",
  invalid_state: "Security verification (PKCE/state) failed or session expired. Please try again.",
  google_auth_failed: "Google authentication failed. Please try again.",
  unverified_email: "Your Google account email is not verified. Please verify your email with Google.",
  account_deactivated: "Your RoadReady account is deactivated. Please contact support.",
  token_exchange_failed: "Failed to communicate with Google authentication servers. Please try again.",
  token_validation_failed: "Failed to validate Google identity token. Please try again.",
  profile_fetch_failed: "Could not retrieve your verified Google profile. Please try again.",
  oauth_server_error: "A server error occurred during Google sign-in. Please try again.",
};

export default function Login() {
  const { t } = useLanguage();
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("signin"); // "signin" | "signup"

  // Sign In state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Sign Up state
  const [signupForm, setSignupForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [signupError, setSignupError] = useState("");
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);

  // Google OAuth state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState("");

  const userRef = useRef(null);
  const signupNameRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const returnPath = location.state?.from?.pathname || location.state?.from;
      if (returnPath) {
        navigate(returnPath, { replace: true, state: location.state });
      } else if (user.role === "admin" || user.role === "staff") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/my-bookings", { replace: true });
      }
    }
  }, [user, navigate, location.state]);

  // Focus input when tab changes
  useEffect(() => {
    if (activeTab === "signin") {
      userRef.current?.focus();
    } else {
      signupNameRef.current?.focus();
    }
  }, [activeTab]);

  // Check URL parameters for OAuth errors returning from backend redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthErr = params.get("error");
    if (oauthErr) {
      const message =
        OAUTH_ERROR_MESSAGES[oauthErr] ||
        `Google authentication error: ${oauthErr}`;
      setGoogleAuthError(message);
    }
  }, [location.search]);

  /**
   * Start Google OAuth 2.0 Authorization Code flow with PKCE
   * Directs browser to backend /api/auth/google
   */
  const handleGoogleSignInClick = () => {
    setGoogleAuthError("");
    setError("");
    setSignupError("");
    setIsGoogleLoading(true);

    try {
      // Build initiation URL passing current origin for seamless LAN / mobile phone support
      const origin = window.location.origin;
      const targetUrl = `${API_BASE_URL}/auth/google?origin=${encodeURIComponent(origin)}`;
      window.location.href = targetUrl;
    } catch {
      setIsGoogleLoading(false);
      setGoogleAuthError("Failed to initiate Google sign-in. Please try again.");
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setSignupError("");
    setGoogleAuthError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setGoogleAuthError("");
    if (!username.trim() || !password) {
      setError(t("field_required"));
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || (result.errorKey ? t(result.errorKey) : t("login_error")));
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError("");
    setGoogleAuthError("");

    if (
      !signupForm.name.trim() ||
      !signupForm.username.trim() ||
      !signupForm.email.trim() ||
      !signupForm.phone.trim() ||
      !signupForm.password
    ) {
      setSignupError(t("field_required"));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(signupForm.email.trim())) {
      setSignupError(t("invalid_email"));
      return;
    }

    if (!/^\d{10}$/.test(signupForm.phone.trim())) {
      setSignupError(t("invalid_phone"));
      return;
    }

    if (signupForm.password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError(t("password_mismatch"));
      return;
    }

    setIsSignupSubmitting(true);
    const result = await signup({
      name: signupForm.name,
      username: signupForm.username,
      email: signupForm.email,
      phone: signupForm.phone,
      password: signupForm.password,
    });
    setIsSignupSubmitting(false);

    if (!result.success) {
      setSignupError(result.message || (result.errorKey ? t(result.errorKey) : t("login_error")));
    }
  };

  const handleQuickDemo = useCallback(
    async (u, p) => {
      setUsername(u);
      setPassword(p);
      setError("");
      setGoogleAuthError("");
      setIsSubmitting(true);
      const result = await login(u, p);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.message || "Invalid credentials");
      }
    },
    [login]
  );

  return (
    <div className="container" style={{ padding: "40px 16px" }}>
      <div className="login-wrap" style={{ maxWidth: "460px" }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => switchTab("signin")}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "signin" ? "3px solid var(--accent)" : "3px solid transparent",
              fontWeight: 700,
              color: activeTab === "signin" ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {t("login_tab")}
          </button>
          <button
            type="button"
            onClick={() => switchTab("signup")}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "signup" ? "3px solid var(--accent)" : "3px solid transparent",
              fontWeight: 700,
              color: activeTab === "signup" ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {t("signup_tab")}
          </button>
        </div>

        {/* Inline Google OAuth Error Notification (No alert() popups) */}
        {googleAuthError && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              fontSize: "0.88rem",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1 }}>{googleAuthError}</div>
          </div>
        )}

        {/* Continue with Google Button */}
        <div style={{ marginBottom: "20px" }}>
          <button
            type="button"
            id="google-oauth-btn"
            onClick={handleGoogleSignInClick}
            disabled={isGoogleLoading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "11px 16px",
              background: isGoogleLoading ? "var(--bg-inset)" : "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.94rem",
              cursor: isGoogleLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              opacity: isGoogleLoading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isGoogleLoading) {
                e.currentTarget.style.borderColor = "#4285F4";
                e.currentTarget.style.boxShadow = "0 2px 10px rgba(66,133,244,0.18)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
            }}
          >
            {isGoogleLoading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    border: "2px solid #4285F4",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <style>
                  {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
                </style>
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  />
                </svg>
                <span>{activeTab === "signin" ? "Continue with Google" : "Sign up with Google"}</span>
              </>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: "12px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              {activeTab === "signin" ? "or sign in with credentials" : "or register with form"}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        </div>

        {/* Sign In View */}
        {activeTab === "signin" ? (
          <div>
            <h2>{t("login_title")}</h2>
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-row">
                <label htmlFor="username">{t("username")}</label>
                <input
                  id="username"
                  ref={userRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or customer1"
                />
              </div>

              <div className="form-row">
                <label htmlFor="password">{t("password")}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "12px" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : t("login_btn")}
              </button>
            </form>

            {/* Quick Demo Login Chips */}
            <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px dashed var(--border)" }}>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("quick_demo_accounts")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemo("admin", "admin123")}
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: "0.78rem", borderRadius: "16px" }}
                >
                  👑 Admin
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("customer1", "user123")}
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: "0.78rem", borderRadius: "16px" }}
                >
                  👤 Customer (Rahul)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo("customer2", "user123")}
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: "0.78rem", borderRadius: "16px" }}
                >
                  👤 Customer (Priya)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Customer Sign Up View */
          <div>
            <h2>{t("signup_title")}</h2>
            {signupError && <div className="alert alert-error">{signupError}</div>}

            <form onSubmit={handleSignupSubmit}>
              <div className="form-row">
                <label htmlFor="signupName">{t("customer_name")}</label>
                <input
                  id="signupName"
                  ref={signupNameRef}
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="form-row">
                <label htmlFor="signupUsername">{t("username")}</label>
                <input
                  id="signupUsername"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                  placeholder="e.g. johndoe"
                />
              </div>

              <div className="form-row">
                <label htmlFor="signupEmail">{t("customer_email")}</label>
                <input
                  id="signupEmail"
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="form-row">
                <label htmlFor="signupPhone">{t("customer_phone")}</label>
                <input
                  id="signupPhone"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                />
              </div>

              <div className="form-row">
                <label htmlFor="signupPassword">{t("password")}</label>
                <input
                  id="signupPassword"
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-row">
                <label htmlFor="signupConfirmPassword">{t("confirm_password")}</label>
                <input
                  id="signupConfirmPassword"
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "12px" }}
                disabled={isSignupSubmitting}
              >
                {isSignupSubmitting ? "Creating account..." : t("signup_btn")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

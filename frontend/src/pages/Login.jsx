import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "712345678901-exampleclientid.apps.googleusercontent.com";

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function Login() {
  const { t } = useLanguage();
  const { login, loginWithGoogle, signup, user } = useAuth();
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

  // Google OAuth Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
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

  useEffect(() => {
    if (activeTab === "signin") {
      userRef.current?.focus();
    } else {
      signupNameRef.current?.focus();
    }
  }, [activeTab]);

  // Initialize Google Identity Services (GSI) if available
  useEffect(() => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              const decoded = parseJwt(response.credential);
              if (decoded && decoded.email) {
                loginWithGoogle({
                  name: decoded.name || decoded.given_name || decoded.email.split("@")[0],
                  email: decoded.email,
                  googleId: decoded.sub,
                  picture: decoded.picture,
                });
              }
            }
          },
          auto_select: false,
        });
      } catch (err) {
        console.warn("Google GSI init note:", err);
      }
    }
  }, [loginWithGoogle]);

  const handleGoogleSignInClick = () => {
    // If real GSI client ID is configured and prompt can be displayed, try it
    if (
      window.google?.accounts?.id &&
      import.meta.env.VITE_GOOGLE_CLIENT_ID
    ) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowGoogleModal(true);
          }
        });
        return;
      } catch {
        // Fallback to interactive Google OAuth dialog
      }
    }
    setShowGoogleModal(true);
  };

  const handleGoogleAccountSelect = (account) => {
    setGoogleAuthError("");
    const result = loginWithGoogle({
      name: account.name,
      email: account.email,
      googleId: account.googleId,
      picture: account.picture,
    });
    if (result.success) {
      setShowGoogleModal(false);
    } else {
      setGoogleAuthError(t(result.errorKey || "login_error"));
    }
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    setGoogleAuthError("");
    if (!customGoogleEmail.trim()) {
      setGoogleAuthError("Please enter your Google email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(customGoogleEmail.trim())) {
      setGoogleAuthError("Please enter a valid email address.");
      return;
    }

    const result = loginWithGoogle({
      name: customGoogleName.trim() || customGoogleEmail.split("@")[0],
      email: customGoogleEmail.trim(),
      googleId: "google_" + Date.now(),
    });

    if (result.success) {
      setShowGoogleModal(false);
    } else {
      setGoogleAuthError(t(result.errorKey || "login_error"));
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setSignupError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
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

        {/* Continue with Google Option */}
        <div style={{ marginBottom: "20px" }}>
          <button
            type="button"
            onClick={handleGoogleSignInClick}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "11px 16px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.92rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#4285F4";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(66,133,244,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
            }}
          >
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

      {/* Google OAuth Interactive Dialog */}
      {showGoogleModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Google Header */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <svg width="32" height="32" viewBox="0 0 18 18" style={{ marginBottom: "10px" }}>
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
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>Sign in with Google</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Choose an account to continue to <strong>RoadReady</strong>
              </p>
            </div>

            {googleAuthError && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{googleAuthError}</div>}

            {!isCustomMode ? (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                  {[
                    {
                      name: "Rahul Sharma",
                      email: "rahul.sharma@gmail.com",
                      googleId: "google_rahul_101",
                      initial: "R",
                      color: "#E06B54",
                    },
                    {
                      name: "Priya Nair",
                      email: "priya.nair@gmail.com",
                      googleId: "google_priya_102",
                      initial: "P",
                      color: "#8B5CF6",
                    },
                    {
                      name: "Alex Morgan",
                      email: "alex.morgan@gmail.com",
                      googleId: "google_alex_103",
                      initial: "A",
                      color: "#4FBE83",
                    },
                  ].map((acc) => (
                    <div
                      key={acc.email}
                      onClick={() => handleGoogleAccountSelect(acc)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        background: "var(--bg-inset)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#4285F4";
                        e.currentTarget.style.background = "rgba(66,133,244,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "var(--bg-inset)";
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: acc.color,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {acc.initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>{acc.name}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{acc.email}</div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px dashed var(--border)",
                      background: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>➕</span>
                    <span>Use another Google account</span>
                  </button>
                </div>

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-faint)",
                    textAlign: "center",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "14px",
                    lineHeight: 1.4,
                  }}
                >
                  🔒 To continue, Google will share your name and email address with RoadReady. No passwords are ever stored or transferred.
                </div>
              </div>
            ) : (
              <form onSubmit={handleCustomGoogleSubmit}>
                <div className="form-row">
                  <label>Google Full Name</label>
                  <input
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>

                <div className="form-row">
                  <label>Gmail / Google Email Address *</label>
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="e.g. sarah.j@gmail.com"
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setIsCustomMode(false);
                      setGoogleAuthError("");
                    }}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: "#4285F4", borderColor: "#4285F4" }}>
                    Sign in with Google
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowGoogleModal(false)}
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ERROR_MESSAGES = {
  cancelled: "Google sign-in was cancelled.",
  google_not_configured:
    "Google OAuth is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.",
  missing_code_or_state: "Invalid Google authorization response. Missing code or state.",
  invalid_state: "OAuth security verification (state/PKCE) failed. Please try again.",
  google_auth_failed: "Google authentication failed. Please try again.",
  unverified_email: "Your Google account email is not verified. Please verify your email with Google first.",
  account_deactivated: "Your RoadReady account is deactivated. Please contact support.",
  token_exchange_failed: "Failed to exchange authorization code with Google. Please try again.",
  token_validation_failed: "Failed to validate Google ID token. Please try again.",
  profile_fetch_failed: "Could not retrieve your profile from Google. Please try again.",
  oauth_server_error: "Server error occurred during Google sign-in. Please try again.",
};

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthSuccess } = useAuth();

  const [status, setStatus] = useState("processing"); // "processing" | "error" | "success"
  const [errorMessage, setErrorMessage] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(ERROR_MESSAGES[error] || `Authentication error: ${error}`);
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("No authentication token received from Google callback.");
      return;
    }

    const processAuth = async () => {
      try {
        const result = await handleOAuthSuccess(token);
        if (result.success) {
          setStatus("success");
          // Short delay for visual polish before navigating
          setTimeout(() => {
            const role = result.user?.role;
            if (role === "admin" || role === "staff") {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/my-bookings", { replace: true });
            }
          }, 450);
        } else {
          setStatus("error");
          setErrorMessage(result.message || "Failed to restore authenticated session.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(err.message || "An unexpected error occurred during authentication.");
      }
    };

    processAuth();
  }, [searchParams, handleOAuthSuccess, navigate]);

  return (
    <div
      className="container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "460px",
          width: "100%",
          padding: "36px 28px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 16px)",
          boxShadow: "var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.1))",
          textAlign: "center",
        }}
      >
        {status === "processing" && (
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                border: "4px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                margin: "0 auto 20px auto",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>
              Completing Google Sign-In...
            </h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Verifying your Google identity and establishing your RoadReady session.
            </p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                margin: "0 auto 16px auto",
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>
              Authenticated Successfully!
            </h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Redirecting to your RoadReady account...
            </p>
          </div>
        )}

        {status === "error" && (
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                margin: "0 auto 16px auto",
              }}
            >
              ✕
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>
              Authentication Failed
            </h3>
            <div
              className="alert alert-error"
              style={{
                margin: "16px 0",
                textAlign: "left",
                fontSize: "0.88rem",
                padding: "12px 14px",
              }}
            >
              {errorMessage}
            </div>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ width: "100%", textDecoration: "none", display: "inline-block" }}
            >
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

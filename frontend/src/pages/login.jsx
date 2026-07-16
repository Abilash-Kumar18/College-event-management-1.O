import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import logoImg from "../assets/images/logo.jpg";
import "./login.css";
export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("Student");

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const roleMap = {
        Student: "student",
        Admin: "admin",
      };

      const res = await authService.googleLogin({
        token: credentialResponse.credential,
        role: roleMap[role],
      });

      // Store token and user data
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed. Please try again.");
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Remember Me & reCAPTCHA state
  const [rememberMe, setRememberMe] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  // Entrance logo overlay animation states
  const [showLogoOverlay, setShowLogoOverlay] = useState(true);
  const [overlayFadeOut, setOverlayFadeOut] = useState(false);

  useEffect(() => {
    // 1. Logo overlay fade out timers
    const fadeTimer = setTimeout(() => {
      setOverlayFadeOut(true);
    }, 1200);
    const removeTimer = setTimeout(() => {
      setShowLogoOverlay(false);
    }, 1800);

    // 2. Load Google reCAPTCHA v2 API explicitly
    const scriptId = "google-recaptcha-script";
    let script = document.getElementById(scriptId);

    const renderRecaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render) {
        try {
          window.grecaptcha.render("recaptcha-container", {
            sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
            callback: (token) => {
              setRecaptchaToken(token);
              setError("");
            },
            "expired-callback": () => {
              setRecaptchaToken("");
            }
          });
        } catch (e) {
          console.warn("reCAPTCHA render warning:", e);
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      window.onRecaptchaLoad = () => {
        renderRecaptcha();
      };
      document.body.appendChild(script);
    } else {
      if (window.grecaptcha && window.grecaptcha.render) {
        renderRecaptcha();
      } else {
        window.onRecaptchaLoad = () => {
          renderRecaptcha();
        };
      }
    }

    // 3. Retrieve remembered email
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }

    // Default to Student role, check if specific role requested in URL
    const queryParams = new URLSearchParams(window.location.search);
    const urlRole = queryParams.get("role");
    if (urlRole) {
      const capitalized = urlRole.charAt(0).toUpperCase() + urlRole.slice(1).toLowerCase();
      if (["Student", "Admin"].includes(capitalized)) {
        setRole(capitalized);
      } else if (capitalized === "Faculty" || capitalized === "Organizer") {
        setRole("Admin");
      }
    } else {
      setRole("Student");
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      window.onRecaptchaLoad = null;
    };
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");

    // Validate reCAPTCHA response token
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA challenge.");
      return;
    }

    setLoading(true);

    try {
      const roleMap = {
        Student: "student",
        Admin: "admin",
      };

      const response = await authService.login({
        email,
        password,
        role: roleMap[role],
        recaptchaToken,
      });

      // Handle Remember Me credentials storage
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedRole", role);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedRole");
      }

      // Store token and user data
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      if (window.grecaptcha) {
        window.grecaptcha.reset();
        setRecaptchaToken("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--ace-text-muted, #475569)",
              fontSize: "14px",
              fontWeight: "600",
              padding: "0"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        </div>
        <h1 className="login-title" style={{ fontSize: "22px", fontWeight: "800", marginTop: "5px", color: "var(--ace-primary, #10b981)", textAlign: "center", letterSpacing: "0.5px" }}>
          {role === "Student" ? "Login" : "Admin / Faculty Login"}
        </h1>

        {/* Role Toggles */}
        <div className="role-toggle-container">
          {["Student", "Admin"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRole(item)}
              className={`role-toggle-btn ${role === item ? "active" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="login-form">
          {error && (
            <div className="error-message" style={{ color: "red", marginBottom: "15px", fontSize: "14px", textAlign: "center" }}>
              {error}
            </div>
          )}
          
          <label className="login-label">
            {role === "Student" ? "Email" : "Email id:"}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            placeholder={role === "Student" ? "Enter email" : "Enter email id"}
            required
            disabled={loading}
          />

          <label className="login-label">
            {role === "Student" ? "Password" : "Password:"}
          </label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="Enter password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle-btn"
              disabled={loading}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          {/* Security Captcha Section (Google reCAPTCHA v2) */}
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
            <div id="recaptcha-container"></div>
          </div>

          {/* Remember Me and Forgot Password Container */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: "pointer", width: "14px", height: "14px" }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: "13px", color: "#666", cursor: "pointer", userSelect: "none" }}>
                Remember me
              </label>
            </div>
            <div className="forgot-password-container" style={{ margin: 0 }}>
              <Link to="/forgot-password" className="forgot-password-link" style={{ fontSize: "13px" }}>
                Forgot Password?
              </Link>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Google Sign-in Container */}
        <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>or</p>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              width="280px"
            />
          </GoogleOAuthProvider>
        </div>



        {role === "Student" && (
          <p className="signup-redirect-text">
            If you don't have account
            <Link to="/signup" className="signup-redirect-link">Sign Up</Link>
          </p>
        )}
      </div>
    </div>
  );
}

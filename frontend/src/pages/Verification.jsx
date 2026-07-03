import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import "./Verification.css";

export default function Verification() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resend countdown timer state (60 seconds)
  const [timerSeconds, setTimerSeconds] = useState(60);

  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const handleChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return;

    let newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Focus next input if a number is typed
    if (value !== "" && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Focus previous input if backspace is pressed on empty input
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const otpCode = otp.join("");
    if (otpCode.length < 4) {
      setError("Please enter the complete 4-digit verification code.");
      return;
    }

    const email = localStorage.getItem("resetEmail");
    if (!email) {
      setError("Reset session expired. Please start over from Forgot Password.");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOtp(email, otpCode);
      localStorage.setItem("resetOtp", otpCode);
      alert("OTP Verified Successfully!");
      navigate("/reset-password");
    } catch (err) {
      setError(err.message || "Invalid OTP code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (e) => {
    e.preventDefault();
    setError("");
    const email = localStorage.getItem("resetEmail");
    if (!email) {
      setError("Reset session expired. Please start over from Forgot Password.");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      alert("A new OTP code has been sent to your email!");
      setTimerSeconds(60); // Restart countdown timer
    } catch (err) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        
        <div className="header">
          <Link to="/forgot-password" className="back-arrow">←</Link>
          <h2>Verification</h2>
        </div>

        <p className="verify-description">
          We've sent the code to your phone
        </p>

        <form onSubmit={handleSubmit} className="verify-form">
          {error && (
            <div className="error-message" style={{ color: "red", marginBottom: "15px", fontSize: "14px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <div className="otp-inputs-container">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                ref={inputRefs[index]}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="otp-input-field"
                required
                disabled={loading}
              />
            ))}
          </div>

          <div className="resend-container">
            <span className="resend-text">Didn't receive the code? </span>
            {timerSeconds > 0 ? (
              <span className="resend-timer-text" style={{ color: "#15803d", fontWeight: "600", marginLeft: "4px" }}>
                Resend OTP in {timerSeconds}s
              </span>
            ) : (
              <a
                href="#"
                className="resend-link"
                onClick={handleResendOtp}
                style={{ pointerEvents: loading ? "none" : "auto", opacity: loading ? 0.6 : 1 }}
              >
                Resend OTP
              </a>
            )}
          </div>

          <button type="submit" className="verify-submit-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}

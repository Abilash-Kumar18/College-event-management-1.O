import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import "./OrganizerSignUp.css";

export default function OrganizerSignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organizerName: "",
    regNo: "",
    email: "",
    mobile: "",
    clubName: "",
    password: "",
    confirmPassword: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "mobile" || name === "regNo") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const form = e.target;

    // Check basic HTML5 validity
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // 1. Password constraints (advanced requirements)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    const passwordInput = form.querySelector('input[name="password"]');
    if (!passwordRegex.test(formData.password)) {
      if (passwordInput) {
        passwordInput.setCustomValidity("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
        passwordInput.reportValidity();
        passwordInput.focus();
      }
      return;
    } else if (passwordInput) {
      passwordInput.setCustomValidity("");
    }

    // 2. Passwords matching
    const confirmInput = form.querySelector('input[name="confirmPassword"]');
    if (formData.password !== formData.confirmPassword) {
      if (confirmInput) {
        confirmInput.setCustomValidity("Passwords do not match!");
        confirmInput.reportValidity();
        confirmInput.focus();
      }
      return;
    } else if (confirmInput) {
      confirmInput.setCustomValidity("");
    }

    // 3. Name validation (alphabets only)
    const nameRegex = /^[a-zA-Z\s]+$/;
    const nameInput = form.querySelector('input[name="organizerName"]');
    if (!nameRegex.test(formData.organizerName)) {
      if (nameInput) {
        nameInput.setCustomValidity("Organizer Name must contain only alphabets and spaces.");
        nameInput.reportValidity();
        nameInput.focus();
      }
      return;
    } else if (nameInput) {
      nameInput.setCustomValidity("");
    }

    // 4. Email validation (@gmail.com or @ksrce.ac.in)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
    const emailInput = form.querySelector('input[name="email"]');
    if (!emailRegex.test(formData.email)) {
      if (emailInput) {
        emailInput.setCustomValidity("Email address must end with @gmail.com or @ksrce.ac.in.");
        emailInput.reportValidity();
        emailInput.focus();
      }
      return;
    } else if (emailInput) {
      emailInput.setCustomValidity("");
    }

    // 5. Mobile validation (10 digits)
    const mobileRegex = /^\d{10}$/;
    const mobileInput = form.querySelector('input[name="mobile"]');
    if (!mobileRegex.test(formData.mobile)) {
      if (mobileInput) {
        mobileInput.setCustomValidity("Mobile number must be exactly 10 digits.");
        mobileInput.reportValidity();
        mobileInput.focus();
      }
      return;
    } else if (mobileInput) {
      mobileInput.setCustomValidity("");
    }

    setLoading(true);
    try {
      const { organizerName, regNo, email, mobile, clubName, password } = formData;
      await authService.registerOrganizer({
        name: organizerName,
        regNo,
        email,
        mobileNumber: `+91${mobile}`,
        clubName,
        password,
      });

      alert("Approval Request Sent Successfully!");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Registration request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        
        <div className="header">
          <Link to="/signup" className="back-arrow">←</Link>
          <h2>Organizer Sign Up</h2>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && (
            <div className="error-message" style={{ color: "red", marginBottom: "15px", fontSize: "14px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <label className="signup-label">Organizer Name:</label>
          <input
            type="text"
            name="organizerName"
            value={formData.organizerName}
            onChange={handleChange}
            onBlur={(e) => {
              const val = e.target.value;
              const nameRegex = /^[a-zA-Z\s]+$/;
              if (!val.trim()) {
                e.target.setCustomValidity("Organizer Name is required.");
              } else if (!nameRegex.test(val)) {
                e.target.setCustomValidity("Organizer Name must contain only alphabets and spaces.");
              } else {
                e.target.setCustomValidity("");
              }
              e.target.reportValidity();
            }}
            className="signup-input"
            placeholder="Enter organizer/organization name"
            required
            pattern="[a-zA-Z\s]+"
            title="Organizer Name must contain only alphabets and spaces."
            disabled={loading}
          />

          <label className="signup-label">Reg.no:</label>
          <input
            type="text"
            name="regNo"
            value={formData.regNo}
            onChange={handleChange}
            onBlur={(e) => {
              const val = e.target.value;
              if (!val.trim()) {
                e.target.setCustomValidity("Registration number is required.");
              } else if (!/^\d+$/.test(val)) {
                e.target.setCustomValidity("Registration number must contain only numbers.");
              } else {
                e.target.setCustomValidity("");
              }
              e.target.reportValidity();
            }}
            className="signup-input"
            placeholder="Enter registration/license number"
            required
            pattern="\d+"
            title="Registration number must contain only numbers."
            disabled={loading}
          />

          <label className="signup-label">Email id:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={(e) => {
              const val = e.target.value;
              const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
              if (!val.trim()) {
                e.target.setCustomValidity("Email is required.");
              } else if (!emailRegex.test(val)) {
                e.target.setCustomValidity("Email address must end with @gmail.com or @ksrce.ac.in.");
              } else {
                e.target.setCustomValidity("");
              }
              e.target.reportValidity();
            }}
            className="signup-input"
            placeholder="Enter email address"
            required
            pattern="^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$"
            title="Email address must end with @gmail.com or @ksrce.ac.in"
            disabled={loading}
          />

          <label className="signup-label">Mobile Number:</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ 
              padding: "10px 14px", 
              background: "rgba(255, 255, 255, 0.05)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "8px", 
              color: "var(--text-secondary)", 
              fontSize: "14px", 
              display: "flex", 
              alignItems: "center" 
            }}>
              +91
            </span>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              onBlur={(e) => {
                const val = e.target.value;
                if (!val.trim()) {
                  e.target.setCustomValidity("Mobile number is required.");
                } else if (!/^\d{10}$/.test(val)) {
                  e.target.setCustomValidity("Mobile number must be exactly 10 digits.");
                } else {
                  e.target.setCustomValidity("");
                }
                e.target.reportValidity();
              }}
              className="signup-input"
              placeholder="Enter 10-digit number"
              required
              pattern="\d{10}"
              title="Mobile number must be exactly 10 digits"
              disabled={loading}
              maxLength="10"
              style={{ flex: 1 }}
            />
          </div>

          <label className="signup-label">Club Name:</label>
          <input
            type="text"
            name="clubName"
            value={formData.clubName}
            onChange={handleChange}
            onBlur={(e) => {
              const val = e.target.value;
              const nameRegex = /^[a-zA-Z\s]+$/;
              if (!val.trim()) {
                e.target.setCustomValidity("Club Name is required.");
              } else if (!nameRegex.test(val)) {
                e.target.setCustomValidity("Club name must contain only alphabets and spaces.");
              } else {
                e.target.setCustomValidity("");
              }
              e.target.reportValidity();
            }}
            className="signup-input"
            placeholder="Enter club name"
            required
            disabled={loading}
          />

          <label className="signup-label">Password:</label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={(e) => {
                const val = e.target.value;
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
                if (!val) {
                  e.target.setCustomValidity("Password is required.");
                } else if (!passwordRegex.test(val)) {
                  e.target.setCustomValidity("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
                } else {
                  e.target.setCustomValidity("");
                }
                e.target.reportValidity();
              }}
              className="signup-input"
              placeholder="Enter password"
              required
              minLength="8"
              pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"
              title="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)."
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

          <label className="signup-label">Confirm Password:</label>
          <div className="password-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={(e) => {
                const val = e.target.value;
                if (!val) {
                  e.target.setCustomValidity("Confirm Password is required.");
                } else if (val !== formData.password) {
                  e.target.setCustomValidity("Passwords do not match!");
                } else {
                  e.target.setCustomValidity("");
                }
                e.target.reportValidity();
              }}
              className="signup-input"
              placeholder="Confirm password"
              required
              minLength="8"
              pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$"
              title="Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)."
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="password-toggle-btn"
              disabled={loading}
            >
              {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          <button type="submit" className="signup-submit-btn" disabled={loading}>
            {loading ? "Requesting Approval..." : "Request Approval"}
          </button>
        </form>
      </div>
    </div>
  );
}

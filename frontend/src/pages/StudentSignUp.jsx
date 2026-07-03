import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import "./StudentSignUp.css";

const DEPARTMENTS = [
  "AERONAUTICAL ENGINEERING",
  "AGRICULTURAL ENGINEERING",
  "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
  "AUTOMOBILE ENGINEERING",
  "BIOCHEMICAL ENGINEERING",
  "BIOMEDICAL ENGINEERING",
  "BIOTECHNOLOGY",
  "CERAMIC TECHNOLOGY",
  "CHEMICAL ENGINEERING",
  "CIVIL ENGINEERING",
  "COMPUTER SCIENCE AND BUSINESS SYSTEMS",
  "COMPUTER SCIENCE AND ENGINEERING",
  "COMPUTER SCIENCE AND ENGINEERING (INTERNET OF THINGS)",
  "ELECTRICAL AND ELECTRONICS ENGINEERING",
  "ELECTRONICS AND COMMUNICATION ENGINEERING",
  "ELECTRONICS AND INSTRUMENTATION ENGINEERING",
  "ENVIRONMENTAL ENGINEERING",
  "FOOD TECHNOLOGY",
  "GEOINFORMATICS",
  "INDUSTRIAL ENGINEERING",
  "INFORMATION TECHNOLOGY",
  "LEATHER TECHNOLOGY",
  "MANUFACTURING ENGINEERING",
  "MARINE ENGINEERING",
  "MATERIAL SCIENCE AND ENGINEERING",
  "MECHANICAL ENGINEERING",
  "MECHATRONICS ENGINEERING",
  "METALLURGICAL ENGINEERING",
  "PETROCHEMICAL ENGINEERING",
  "PETROLEUM ENGINEERING",
  "PHARMACEUTICAL TECHNOLOGY",
  "PRINTING TECHNOLOGY",
  "PRODUCTION ENGINEERING",
  "ROBOTICS AND AUTOMATION",
  "TEXTILE TECHNOLOGY"
];

export default function StudentSignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    regNo: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: ""
  });
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
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
    const nameInput = form.querySelector('input[name="name"]');
    if (!nameRegex.test(formData.name)) {
      if (nameInput) {
        nameInput.setCustomValidity("Name must contain only alphabets and spaces.");
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

    if (!selectedDept || !selectedYear) {
      alert("Please select both department and year.");
      return;
    }

    setLoading(true);
    try {
      const { name, regNo, email, mobile, password } = formData;
      const response = await authService.registerStudent({
        name,
        regNo,
        deptYear: `${selectedDept} - ${selectedYear}`,
        email,
        mobileNumber: `+91${mobile}`,
        password,
      });

      // Store token and user data on successful registration
      if (response.token) {
        localStorage.setItem("token", response.token);
      }
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      // Auto-login: if token was returned, go straight to dashboard
      if (response.token) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        
        <div className="header">
          <Link to="/signup" className="back-arrow">←</Link>
          <h2>Student Sign Up</h2>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && (
            <div className="error-message" style={{ color: "red", marginBottom: "15px", fontSize: "14px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <label className="signup-label">Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={(e) => {
              const val = e.target.value;
              const nameRegex = /^[a-zA-Z\s]+$/;
              if (!val.trim()) {
                e.target.setCustomValidity("Name is required.");
              } else if (!nameRegex.test(val)) {
                e.target.setCustomValidity("Name must contain only alphabets and spaces.");
              } else {
                e.target.setCustomValidity("");
              }
              e.target.reportValidity();
            }}
            className="signup-input"
            placeholder="Enter your name"
            required
            pattern="[a-zA-Z\s]+"
            title="Name must contain only alphabets and spaces."
            disabled={loading}
          />

          <label className="signup-label">Reg.No:</label>
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
            placeholder="Enter registration number"
            required
            pattern="\d+"
            title="Registration number must contain only numbers."
            disabled={loading}
          />

          <label className="signup-label">Department *:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="signup-input"
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '14px', color: 'var(--dash-text)', outline: 'none' }}
            required
            disabled={loading}
          >
            <option value="">-- Select Department --</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <label className="signup-label">Year of Study *:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="signup-input"
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '14px', color: 'var(--dash-text)', outline: 'none' }}
            required
            disabled={loading}
          >
            <option value="">-- Select Year --</option>
            <option value="I Year">I Year</option>
            <option value="II Year">II Year</option>
            <option value="III Year">III Year</option>
            <option value="IV Year">IV Year</option>
          </select>

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
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

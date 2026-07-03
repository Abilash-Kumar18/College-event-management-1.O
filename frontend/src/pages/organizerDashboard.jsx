import React, { useState } from "react";
import "./OrganizerDashboard.css";
import {
  FaHome,
  FaCalendarAlt,
  FaUserFriends,
  FaPlusCircle,
  FaCheckCircle,
  FaBullhorn,
  FaUsers,
  FaQrcode,
  FaTrophy,
  FaChartBar,
  FaUserCircle,
  FaArrowLeft,
  FaSignOutAlt,
} from "react-icons/fa";

const menuItems = [
  { icon: <FaHome />, label: "Home Page" },
  { icon: <FaCalendarAlt />, label: "Event Page" },
  { icon: <FaUserFriends />, label: "Registrations" },
  { icon: <FaPlusCircle />, label: "Create Event" },
  { icon: <FaCheckCircle />, label: "Approve Events" },
  { icon: <FaBullhorn />, label: "Announcements" },
  { icon: <FaUsers />, label: "Manage Users" },
  { icon: <FaQrcode />, label: "QR Attendance" },
  { icon: <FaTrophy />, label: "Results & Leaderboard" },
  { icon: <FaChartBar />, label: "Reports & Analytics" },
  { icon: <FaUserCircle />, label: "Profile" },
];

export default function OrganizerDashboard() {
  const [activeItem, setActiveItem] = useState("Home Page");

  return (
    <div className="od-wrapper">
      <div className="od-card">
        {/* Header / Profile Section */}
        <div className="od-header">
          <button className="od-back-btn" aria-label="Go back">
            <FaArrowLeft />
          </button>

          <div className="od-profile-row">
            <div className="od-avatar">
              <FaUserCircle />
            </div>
            <div className="od-profile-info">
              <p className="od-name">Ram Kumar</p>
              <p className="od-email">ramkumar@gmail.com</p>
              <span className="od-role">Event Coordinator</span>
            </div>
          </div>

          <div className="od-divider" />
        </div>

        {/* Menu List */}
        <nav className="od-menu">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`od-menu-btn${activeItem === item.label ? " od-menu-btn--active" : ""}`}
              onClick={() => setActiveItem(item.label)}
              aria-current={activeItem === item.label ? "page" : undefined}
            >
              <span className="od-menu-icon">{item.icon}</span>
              <span className="od-menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="od-footer">
          <button className="od-logout-btn">
            <FaSignOutAlt className="od-logout-icon" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import "./OrganizerHomePage.css";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaPlusCircle,
  FaCheckCircle,
  FaQrcode,
  FaCircle,
} from "react-icons/fa";

export default function OrganizerHomePage() {
  const [stats] = useState([
    { label: "Events", count: 12 },
    { label: "Registrat.", count: 284 },
    { label: "Pending", count: 5 },
    { label: "Check-ins", count: 198 },
  ]);

  const [highlight] = useState({
    title: "Tech Symposium 2026",
    date: "July 15, 2026",
    time: "10:00 AM – 4:00 PM",
    location: "Main Auditorium, Block A",
    status: "Upcoming",
  });

  const [activities] = useState([
    "New registration: Arjun Mehta for Tech Symposium 2026",
    "Event 'AI Workshop' approved and published",
    "QR check-in completed: 45 attendees at Design Bootcamp",
    "Pending approval: Cultural Fest 2026 submitted by Priya",
    "Announcement sent to 120 registered participants",
    "Results declared for Coding Hackathon – 3 winners",
  ]);

  const quickActions = [
    { icon: <FaPlusCircle />, label: "Create Event", color: "#2E7D32" },
    { icon: <FaCheckCircle />, label: "Approve Events", color: "#1565C0" },
    { icon: <FaQrcode />, label: "QR Attendance", color: "#6A1B9A" },
  ];

  return (
    <div className="ohp-wrapper">
      <div className="ohp-card">

        {/* ── Top Bar ── */}
        <div className="ohp-topbar">
          <button className="ohp-back-btn" aria-label="Go back">
            <FaArrowLeft />
          </button>
          <h1 className="ohp-page-title">Home Page</h1>
        </div>
        <div className="ohp-divider" />

        {/* ── Greeting ── */}
        <div className="ohp-greeting">
          <p className="ohp-greeting-title">Hi Organizer 👋</p>
          <p className="ohp-greeting-sub">Welcome back to Event Panel</p>
        </div>

        {/* ── Today's Highlight ── */}
        <section className="ohp-section">
          <h2 className="ohp-section-label">📌 Today's Highlights</h2>
          <div className="ohp-highlight-card">
            <div className="ohp-highlight-badge">{highlight.status}</div>
            <p className="ohp-highlight-title">{highlight.title}</p>
            <div className="ohp-highlight-meta">
              <span><FaCalendarAlt className="ohp-meta-icon" />{highlight.date}</span>
              <span><FaClock className="ohp-meta-icon" />{highlight.time}</span>
              <span><FaMapMarkerAlt className="ohp-meta-icon" />{highlight.location}</span>
            </div>
            <button className="ohp-view-btn">[ View Event ]</button>
          </div>
        </section>

        {/* ── Quick Stats ── */}
        <section className="ohp-section">
          <h2 className="ohp-section-label">📊 Quick Stats</h2>
          <div className="ohp-stats-container">
            {stats.map((s) => (
              <div className="ohp-stat-card" key={s.label}>
                <p className="ohp-stat-label">{s.label}</p>
                <div className="ohp-stat-count-box">
                  <span className="ohp-stat-count">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="ohp-section">
          <h2 className="ohp-section-label">⚡ Quick Actions</h2>
          <div className="ohp-actions-list">
            {quickActions.map((a) => (
              <button className="ohp-action-btn" key={a.label}>
                <span className="ohp-action-icon" style={{ color: a.color }}>
                  {a.icon}
                </span>
                <span className="ohp-action-label">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Recent Activity ── */}
        <section className="ohp-section ohp-section--last">
          <h2 className="ohp-section-label">🕐 Recent Activity</h2>
          <div className="ohp-activity-card">
            <ul className="ohp-activity-list">
              {activities.map((item, idx) => (
                <li key={idx} className="ohp-activity-item">
                  <FaCircle className="ohp-activity-dot" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}
import React, { useState } from "react";
import "./organizerEventlist.css";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaPlusCircle,
} from "react-icons/fa";

const EVENTS = [
  {
    id: 1,
    title: "Tech Symposium 2026",
    date: "July 15, 2026",
    venue: "Main Auditorium, Block A",
    registrations: 120,
    status: "Open",
  },
  {
    id: 2,
    title: "Coding Contest 2026",
    date: "August 3, 2026",
    venue: "Computer Lab, Block C",
    registrations: 85,
    status: "Open",
  },
  {
    id: 3,
    title: "Design Workshop",
    date: "June 10, 2026",
    venue: "Seminar Hall, Block B",
    registrations: 60,
    status: "Closed",
  },
];

const TABS = ["All", "Upcoming", "Closed"];

export default function OrganizerEventPage() {
  const [activeTab, setActiveTab] = useState("All");

  const filteredEvents = EVENTS.filter((e) => {
    if (activeTab === "All") return true;
    if (activeTab === "Upcoming") return e.status === "Open";
    if (activeTab === "Closed") return e.status === "Closed";
    return true;
  });

  return (
    <div className="oep-wrapper">
      <div className="oep-card">

        {/* ── Header ── */}
        <div className="oep-header">
          <button className="oep-back-btn" aria-label="Go back">
            <FaArrowLeft />
          </button>
          <h1 className="oep-title">Events</h1>
        </div>
        <div className="oep-divider" />

        {/* ── Tabs ── */}
        <div className="oep-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`oep-tab${activeTab === tab ? " oep-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {activeTab === tab && <span className="oep-tab-bar" />}
            </button>
          ))}
        </div>

        {/* ── Event Cards ── */}
        <div className="oep-events-list">
          {filteredEvents.length === 0 ? (
            <div className="oep-empty">No events found.</div>
          ) : (
            filteredEvents.map((event) => (
              <div className="oep-event-card" key={event.id}>
                {/* Status Badge */}
                <span
                  className={`oep-badge ${
                    event.status === "Open" ? "oep-badge--open" : "oep-badge--closed"
                  }`}
                >
                  {event.status}
                </span>

                {/* Title */}
                <h2 className="oep-event-title">{event.title}</h2>

                {/* Meta */}
                <div className="oep-event-meta">
                  <span>
                    <FaCalendarAlt className="oep-meta-icon" />
                    {event.date}
                  </span>
                  <span>
                    <FaMapMarkerAlt className="oep-meta-icon" />
                    {event.venue}
                  </span>
                  <span>
                    <FaUsers className="oep-meta-icon" />
                    {event.registrations} Registrations
                  </span>
                </div>

                {/* Divider */}
                <div className="oep-card-divider" />

                {/* Action Links */}
                <div className="oep-card-actions">
                  {event.status === "Open" ? (
                    <>
                      <button className="oep-link-btn oep-link-btn--details">
                        [ Details ]
                      </button>
                      <button className="oep-link-btn oep-link-btn--edit">
                        [ Edit ]
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="oep-link-btn oep-link-btn--view">
                        [ View ]
                      </button>
                      <button className="oep-link-btn oep-link-btn--report">
                        [ Report ]
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Create Button ── */}
        <div className="oep-footer">
          <button className="oep-create-btn">
            <FaPlusCircle className="oep-create-icon" />
            Create New Event
          </button>
        </div>

      </div>
    </div>
  );
}
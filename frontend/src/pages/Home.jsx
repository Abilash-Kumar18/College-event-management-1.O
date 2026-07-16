import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../services/api';
import './Home.css';

// Import images from assets
import logoImg from '../assets/images/logo.jpg';
import skylineOutline from '../assets/images/skyline_outline.png';
import hackathonImg from '../assets/images/hackathon.jpg';
import robotWarsImg from '../assets/images/robot_wars.jpg';
import culturalFusionImg from '../assets/images/cultural_fusion.jpg';
import reactWorkshopImg from '../assets/images/react_workshop.jpg';
import defaultEventImg from '../assets/images/default_event.jpg';

const getEventImage = (event) => {
  if (event.imageUrl) return event.imageUrl;
  if (event.posterUrl) return event.posterUrl;
  const titleLower = (event.title || '').toLowerCase();
  if (titleLower.includes('hack') || titleLower.includes('code') || titleLower.includes('tech') || titleLower.includes('program')) {
    return hackathonImg;
  }
  if (titleLower.includes('robo') || titleLower.includes('robot') || titleLower.includes('wars') || titleLower.includes('mech')) {
    return robotWarsImg;
  }
  if (titleLower.includes('cultural') || titleLower.includes('fusion') || titleLower.includes('music') || titleLower.includes('dance') || titleLower.includes('art') || titleLower.includes('fest')) {
    return culturalFusionImg;
  }
  if (titleLower.includes('workshop') || titleLower.includes('react') || titleLower.includes('web') || titleLower.includes('learn') || titleLower.includes('craft')) {
    return reactWorkshopImg;
  }
  return defaultEventImg;
};

export default function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFullPosterOpen, setIsFullPosterOpen] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setIsLoggedIn(false);
      }
    }

    const fetchEvents = async () => {
      try {
        const data = await eventService.getAll();
        setEvents((data || []).filter(e => e.status === 'Approved'));
      } catch (err) {
        console.warn("Failed to fetch events:", err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedEvent]);

  const handleDashboardClick = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login?role=Student');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    navigate('/');
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatEventDateRange = (evt) => {
    if (!evt) return '';
    const start = evt.fromDate || evt.dateTime || evt.date;
    const end = evt.toDate;
    if (!start) return '';

    const dStart = new Date(start);
    const startStr = isNaN(dStart.getTime()) ? '' : dStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end) return startStr;

    const dEnd = new Date(end);
    const endStr = isNaN(dEnd.getTime()) ? '' : dEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    if (startStr === endStr) return startStr;
    return `${startStr} - ${endStr}`;
  };

  const getEventMode = (event) => {
    if (event && event.mode) {
      return event.mode.charAt(0).toUpperCase() + event.mode.slice(1).toLowerCase();
    }
    const locationStr = (event && (event.location || event.venue) || '').toLowerCase();
    if (locationStr.includes('online') || locationStr.includes('zoom') || locationStr.includes('meet') || locationStr.includes('teams') || locationStr.includes('virtual')) {
      return 'Online';
    }
    return 'Offline';
  };

  return (
    <div className="home-container">
      {/* Background Blobs (React Bits style background animation) */}
      <div className="home-background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Navigation */}
      <nav className="home-navbar">
        <a href="/" className="home-logo">
          <img src={logoImg} alt="KSR Logo" className="navbar-logo-img" />
          <span className="logo-text">KSRCE</span>
        </a>
        <div className="home-nav-links">
          {isLoggedIn ? (
            <>
              <button onClick={handleDashboardClick} className="home-nav-btn btn-secondary-outline">
                Dashboard ({user?.name?.split(' ')[0]})
              </button>
              <button onClick={handleLogout} className="home-nav-btn btn-primary-gradient">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login?role=Student')} className="home-nav-btn btn-secondary-outline">
                Sign In
              </button>
              <button onClick={() => navigate('/signup')} className="home-nav-btn btn-primary-gradient">
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Header Section */}
      <header className="home-hero">
        <div className="college-logo-container animate-fade-in">
          <img src={logoImg} alt="K.S.R. College Of Engineering Logo" className="college-brand-logo" />
        </div>
        <h1 className="college-title animate-slide-up">K.S.R College Of Engineering</h1>
        <p className="product-subtitle animate-slide-up-delay">College Event Management</p>
      </header>

      {/* Events Section */}
      <main className="events-section-container">
        <div className="section-title-block">
          <h2>Active Campus Events</h2>
          <p>Explore technical symposiums, workshops, and cultural fests hosted across departments.</p>
        </div>

        {loadingEvents ? (
          <div className="loading-container">
            <span className="spinner"></span>
            <p>Loading college events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="no-events-container">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--h-primary)', marginBottom: '12px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <h3>No Active Events</h3>
            <p>Check back later for newly published departmental events.</p>
          </div>
        ) : (
          <div className="home-events-grid">
            {events.map((event) => {
              const formattedDate = formatDate(event.date);
              const eventMode = getEventMode(event);
              return (
                <div key={event._id} className="home-event-card">
                  <div className="card-image-wrapper">
                    <img src={getEventImage(event)} alt={event.title} className="card-image" />
                    <span className="card-badge">{event.clubName || 'KSRCE Event'}</span>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{event.title}</h3>
                    <p className="card-description">
                      {event.description?.length > 110 ? `${event.description.substring(0, 110)}...` : event.description}
                    </p>
                    <div className="card-meta-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {formatEventDateRange(event)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        {eventMode} ({event.venue || event.location || 'Main Campus'})
                      </span>
                    </div>
                    <div className="card-actions">
                      <button onClick={() => setSelectedEvent(event)} className="btn-card-outline">
                        Details
                      </button>
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            navigate('/login?role=Student');
                          } else {
                            navigate(`/register?eventId=${event._id}`);
                          }
                        }}
                        className="btn-card-primary"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-skyline" style={{ backgroundImage: `url(${skylineOutline})` }} />

        <div className="footer-top" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px' }}>
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <img src={logoImg} alt="KSR Logo" style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
              <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ace-text)' }}>KSRCE Events</span>
            </div>
            <p style={{ maxWidth: '400px' }}>
              Official Event Management Portal of K.S.R College Of Engineering. Streamlining student registrations, schedules, and certificate issuance.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <a
              href="https://ksrce.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-card-outline"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Visit KSRCE Website
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 K.S.R College Of Engineering. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Event Details Modal */}
      {/* Event Details Modal */}
      {selectedEvent && (() => {
        const formattedDate = formatDate(selectedEvent.date);
        const eventMode = getEventMode(selectedEvent);
        const isFull = selectedEvent.registrationsCount >= selectedEvent.maxParticipants;
        return (
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3>{selectedEvent.title}</h3>
                <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="modal-body" style={{ fontFamily: 'var(--ace-font, "Outfit", sans-serif)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <img
                    src={getEventImage(selectedEvent)}
                    alt={selectedEvent.title}
                    onClick={() => setIsFullPosterOpen(true)}
                    style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                    title="Click to view full size poster"
                  />
                  <div>
                    <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Hosting Club / Department</strong>
                    <div style={{ fontSize: '14px', color: 'var(--ace-text)', lineHeight: '1.5' }}>{selectedEvent.clubName || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Date & Time</strong>
                    <div style={{ fontSize: '14px', color: 'var(--ace-text)', lineHeight: '1.5' }}>
                      {formatEventDateRange(selectedEvent)}
                    </div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Mode of Event</strong>
                    <div style={{ fontSize: '14px', color: 'var(--ace-primary, #10b981)', fontWeight: 'bold', lineHeight: '1.5' }}>
                      {eventMode}
                    </div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Venue Location</strong>
                    <div style={{ fontSize: '14px', color: 'var(--ace-text)', lineHeight: '1.5' }}>{selectedEvent.venue || selectedEvent.location || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Participation & Pricing</strong>
                    <div style={{ fontSize: '14px', color: 'var(--ace-text)', lineHeight: '1.5' }}>
                      Price: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{selectedEvent.priceType || 'Free'}</span>
                      {selectedEvent.priceType === 'paid' && ` (Entry Fee: ₹${selectedEvent.entryFee} per person)`}
                      &nbsp;|&nbsp;
                      Type: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{selectedEvent.registrationType || 'Solo'} Registration</span>
                    </div>
                  </div>
                  {selectedEvent.capacity && (
                    <div>
                      <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Maximum Capacity</strong>
                      <div style={{ fontSize: '14px', color: 'var(--ace-text)', lineHeight: '1.5' }}>{selectedEvent.capacity} participants ({selectedEvent.registrationsCount || 0} registered)</div>
                    </div>
                  )}

                  {selectedEvent.studentCoordinators && selectedEvent.studentCoordinators.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Student Coordinators</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedEvent.studentCoordinators.map((coord, idx) => (
                          <div key={idx} style={{ 
                            padding: '12px', 
                            background: 'rgba(255,255,255,0.03)', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '14px',
                            lineHeight: '1.5'
                          }}>
                            <div style={{ fontWeight: '700', color: 'var(--brand-green-light)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '2px' }}>
                              <span>👤</span> Coordinator {idx + 1}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px' }}>
                              <span style={{ color: 'var(--ace-text-muted)', fontWeight: '600' }}>Name:</span>
                              <span style={{ color: 'var(--ace-text)' }}>{coord.name}</span>
                              
                              <span style={{ color: 'var(--ace-text-muted)', fontWeight: '600' }}>Reg No:</span>
                              <span style={{ color: 'var(--ace-text)' }}>{coord.regNo}</span>
                              
                              <span style={{ color: 'var(--ace-text-muted)', fontWeight: '600' }}>Department:</span>
                              <span style={{ color: 'var(--ace-text)' }}>{coord.dept}</span>
                              
                              <span style={{ color: 'var(--ace-text-muted)', fontWeight: '600' }}>Phone Number:</span>
                              <span style={{ color: 'var(--ace-text)' }}>{coord.phone}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedEvent.requestedFaculty || selectedEvent.facultyContact) && (
                    <div>
                      <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Faculty Coordinator / Contact</strong>
                      <div style={{ fontSize: '14px', color: 'var(--ace-text)', lineHeight: '1.5' }}>
                        {selectedEvent.requestedFaculty?.name ? `🎓 Prof. ${selectedEvent.requestedFaculty.name} (${selectedEvent.requestedFaculty.email})` : ''}
                        {selectedEvent.facultyContact ? ` | Contact: ${selectedEvent.facultyContact}` : ''}
                      </div>
                    </div>
                  )}

                  <div>
                    <strong style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green-light)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Event Description</strong>
                    <p style={{ color: 'var(--ace-text-muted)', fontSize: '14px', lineHeight: '1.6', marginTop: '4px', whiteSpace: 'pre-line', margin: 0 }}>
                      {selectedEvent.description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ fontFamily: 'var(--ace-font, "Outfit", sans-serif)' }}>
                <button className="dash-btn dash-btn-secondary" onClick={() => setSelectedEvent(null)}>
                  Close
                </button>
                <button
                  disabled={isFull}
                  onClick={() => {
                    if (isFull) return;
                    setSelectedEvent(null);
                    if (!isLoggedIn || !user || user.role !== 'student') {
                      navigate('/login?role=Student');
                    } else {
                      navigate(`/register?eventId=${selectedEvent._id}`);
                    }
                  }}
                  className="dash-btn dash-btn-primary"
                  style={isFull ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                >
                  {isFull ? 'Event Full' : 'Register Event'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox for full size poster */}
      {isFullPosterOpen && selectedEvent && (
        <div
          className="modal-overlay"
          onClick={() => setIsFullPosterOpen(false)}
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={getEventImage(selectedEvent)}
              alt={selectedEvent.title}
              style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <button
              onClick={() => setIsFullPosterOpen(false)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

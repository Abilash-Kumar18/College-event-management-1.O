import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService, eventService, studentService } from '../services/api';
import './EventRegister.css';

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

// Import local images from assets
import hackathonImg from '../assets/images/hackathon.jpg';
import robotWarsImg from '../assets/images/robot_wars.jpg';
import culturalFusionImg from '../assets/images/cultural_fusion.jpg';
import reactWorkshopImg from '../assets/images/react_workshop.jpg';
import defaultEventImg from '../assets/images/default_event.jpg';

const getEventImage = (evt) => {
  if (!evt) return defaultEventImg;
  if (evt.imageUrl) return evt.imageUrl;
  const titleLower = (evt.title || '').toLowerCase();
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

export default function EventRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(null);
  const [teamMembers, setTeamMembers] = useState([
    { name: '', regNo: '', dept: '', phone: '' }
  ]);

  const handleAddMember = () => {
    setTeamMembers(prev => [...prev, { name: '', regNo: '', dept: '', phone: '' }]);
  };

  const handleRemoveMember = (idx) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx, field, value) => {
    setTeamMembers(prev => prev.map((member, i) => {
      if (i === idx) {
        return { ...member, [field]: value };
      }
      return member;
    }));
  };

  // Form fields
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    regNo: '',
    department: '',
    year: '',
    reason: '',
    agreeTerms: false,
    collegeName: 'K.S.R. College Of Engineering',
    teamDetails: '',
    paymentScreenshot: ''
  });

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, paymentScreenshot: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Load user
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(storedUser);
      if (parsed.role !== 'student') {
        setError('Only students are authorized to register for events.');
        setLoading(false);
        return;
      }
      setUser(parsed);

      // Parse department and year from deptYear
      let parsedDept = '';
      let parsedYear = '';
      if (parsed.deptYear) {
        const parts = parsed.deptYear.split(' - ');
        if (parts.length > 0) parsedDept = parts[0].trim();
        if (parts.length > 1) {
          const yr = parts[1].trim();
          if (yr.startsWith('I Year') || yr === 'I') parsedYear = '1st Year';
          else if (yr.startsWith('II Year') || yr === 'II') parsedYear = '2nd Year';
          else if (yr.startsWith('III Year') || yr === 'III') parsedYear = '3rd Year';
          else if (yr.startsWith('IV Year') || yr === 'IV') parsedYear = '4th Year';
          else parsedYear = yr;
        }
      }

      setForm(prev => ({
        ...prev,
        fullName: parsed.name || '',
        email: parsed.email || '',
        regNo: parsed.regNo || '',
        phone: parsed.mobileNumber ? parsed.mobileNumber.replace(/^\+91/, '') : '',
        department: parsedDept,
        year: parsedYear
      }));
    } catch {
      navigate('/login');
      return;
    }

    // Load event details
    if (!eventId) {
      setError('No event specified.');
      setLoading(false);
      return;
    }

    const loadEventDetails = async () => {
      try {
        const found = await eventService.getById(eventId);
        if (found) {
          setEvent(found);
          
          // Check if already registered
          try {
            const studentRegs = await studentService.getRegistrations();
            const existingReg = studentRegs.find(r => String(r.eventId?._id || r.eventId) === String(eventId));
            if (existingReg) {
              setAlreadyRegistered(existingReg);
            }
          } catch (regErr) {
            console.warn('Failed to load registrations from backend, checking localStorage.', regErr);
            const storedAllRegs = localStorage.getItem('dash_global_registrations');
            if (storedAllRegs) {
              const allRegs = JSON.parse(storedAllRegs);
              const existingRegLocal = allRegs.find(r => String(r.eventId) === String(eventId) && String(r.studentId) === String(parsed._id));
              if (existingRegLocal) {
                setAlreadyRegistered(existingRegLocal);
              }
            }
          }
        } else {
          throw new Error('Not found on backend');
        }
      } catch (apiErr) {
        console.warn('Backend event fetch failed, checking local database.', apiErr);
        let allEvents = [];
        const storedCustomEvents = localStorage.getItem('dash_custom_events');
        if (storedCustomEvents) {
          try { allEvents = JSON.parse(storedCustomEvents); } catch { }
        }
        const defaultEvents = [
          { _id: 'mock_event_1', title: 'Smart Tech Hackathon', description: 'A 24-hour coding marathon where students solve real-world industry challenges using cutting-edge AI and web technologies.', date: '2026-07-15T09:00:00.000Z', location: 'Main Seminar Hall', capacity: 100, clubName: 'Coding Club', organizer: { name: 'Coding Club Coordinator', email: 'coding@college.edu' }, imageUrl: hackathonImg },
          { _id: 'mock_event_2', title: 'Robo Wars 2026', description: 'Design, build, and battle! Watch custom-engineered robots clash in a high-octane battle arena to win the grand cash prize.', date: '2026-07-22T10:00:00.000Z', location: 'College Indoor Stadium', capacity: 60, clubName: 'Robotics Club', organizer: { name: 'Robotics Coordinator', email: 'robotics@college.edu' }, imageUrl: robotWarsImg },
          { _id: 'mock_event_3', title: 'Cultural Fusion 2026', description: 'An evening of music, choreography, and dramatic performances celebrating national heritage and student talent.', date: '2026-08-05T17:00:00.000Z', location: 'Open Air Auditorium', capacity: 600, clubName: 'Arts & Music Club', organizer: { name: 'Cultural Committee', email: 'cultural@college.edu' }, imageUrl: culturalFusionImg },
          { _id: 'mock_event_4', title: 'Web Craft React Workshop', description: 'Learn modern single-page application development using React, Vite, and tailwind. Perfect for beginners and intermediates.', date: '2026-06-10T10:00:00.000Z', location: 'CSE Department Lab 3', capacity: 40, clubName: 'Web Dev Club', organizer: { name: 'Web Dev Coordinator', email: 'webdev@college.edu' }, imageUrl: reactWorkshopImg }
        ];
        const mergedEvents = [...allEvents, ...defaultEvents];
        const foundLocal = mergedEvents.find(e => e._id === eventId);

        if (foundLocal) {
          setEvent(foundLocal);
          // Check locally registered events
          const userRegKey = `dash_registered_${parsed._id}`;
          const storedUserRegs = localStorage.getItem(userRegKey);
          if (storedUserRegs) {
            const regIds = JSON.parse(storedUserRegs);
            if (regIds.includes(eventId)) {
              setAlreadyRegistered({ status: 'Registered' });
            }
          }
        } else {
          setError('Event not found.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadEventDetails();
  }, [eventId, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'phone' || name === 'regNo') {
      const numericValue = value.replace(/\D/g, '');
      setForm(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName || !form.email || !form.phone || !form.regNo || !form.department || !form.year || !form.collegeName) {
      setError('Please fill in all required fields.');
      return;
    }

    const regNoRegex = /^\d+$/;
    if (!regNoRegex.test(form.regNo)) {
      setError('Registration number must contain only numbers.');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(form.phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    if (event.priceType === 'paid' && !form.paymentScreenshot) {
      setError('Please upload a screenshot of your UPI payment.');
      return;
    }
    if (!form.agreeTerms) {
      setError('Please agree to the terms and conditions.');
      return;
    }

    let teamDetailsStr = '';
    if (event && event.registrationType === 'team') {
      const filledMembers = teamMembers.filter(m => m.name.trim() !== '');
      if (filledMembers.length === 0) {
        setError('Please fill in at least one team member detail.');
        return;
      }
      // Check validations for all filled members
      for (let i = 0; i < filledMembers.length; i++) {
        const m = filledMembers[i];
        if (!m.name || !m.regNo || !m.dept || !m.phone) {
          setError(`Please fill in all details for Team Member ${i + 1}.`);
          return;
        }
        if (!/^[a-zA-Z\s]+$/.test(m.name)) {
          setError(`Team Member ${i + 1} name must contain only letters and spaces.`);
          return;
        }
        if (!/^\d+$/.test(m.regNo)) {
          setError(`Team Member ${i + 1} registration number must contain only numbers.`);
          return;
        }
        if (!/^\d{10}$/.test(m.phone)) {
          setError(`Team Member ${i + 1} phone number must be exactly 10 digits.`);
          return;
        }
      }
      teamDetailsStr = filledMembers.map((m, idx) => `Member ${idx + 1}: ${m.name} (${m.regNo}, ${m.dept}, ${m.phone})`).join('\n');
    }

    try {
      const createdReg = await eventService.register(event._id, {
        collegeName: form.collegeName,
        teamDetails: teamDetailsStr || undefined,
        paymentScreenshot: form.paymentScreenshot
      });

      // Persist registration
      const newReg = {
        id: createdReg._id,
        eventId: event._id,
        eventTitle: event.title,
        studentId: user._id,
        studentName: form.fullName,
        studentReg: form.regNo,
        studentEmail: form.email,
        phone: form.phone,
        department: form.department,
        year: form.year,
        reason: form.reason,
        date: new Date().toISOString(),
        status: createdReg?.status || 'Pending',
        checkedIn: false,
        teamDetails: teamDetailsStr || undefined
      };

      // Update global registrations
      const storedAllRegs = localStorage.getItem('dash_global_registrations');
      let allRegs = storedAllRegs ? JSON.parse(storedAllRegs) : [];
      allRegs.push(newReg);
      localStorage.setItem('dash_global_registrations', JSON.stringify(allRegs));

      // Update user registered event IDs
      const userRegKey = `dash_registered_${user._id}`;
      const storedUserRegs = localStorage.getItem(userRegKey);
      let regIds = storedUserRegs ? JSON.parse(storedUserRegs) : [];
      if (!regIds.includes(event._id)) {
        regIds.push(event._id);
        localStorage.setItem(userRegKey, JSON.stringify(regIds));
      }

      // Update gamification stats
      const localStatsKey = `dash_profile_stats_${user._id}`;
      const storedStats = localStorage.getItem(localStatsKey);
      let stats = storedStats ? JSON.parse(storedStats) : {
        points: 0,
        heartsCount: 0,
        savesCount: 0,
        sharesCount: 0,
        eventViewsCount: 0,
        registrationsCount: 0
      };

      stats.registrationsCount += 1;
      stats.points += 10;
      localStorage.setItem(localStatsKey, JSON.stringify(stats));

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.points = stats.points;
          parsed.heartsCount = stats.heartsCount;
          parsed.savesCount = stats.savesCount;
          parsed.sharesCount = stats.sharesCount;
          parsed.eventViewsCount = stats.eventViewsCount;
          parsed.registrationsCount = stats.registrationsCount;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (err) {
          console.error(err);
        }
      }

      authService.updateStats('registrations', 'increment').catch(err => {
        console.warn('Backend registrations stats update failed, fallback to localStorage', err);
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to complete registration');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="er-page">
        <div className="er-loading">Loading event details...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="er-page">
        <div className="er-container">
          <div className="er-error-card">
            <h2>⚠️ {error}</h2>
            <button onClick={() => navigate('/dashboard?tab=browse-events')} className="er-btn er-btn-primary">Browse Events</button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="er-page">
        <div className="er-container">
          <div className="er-success-card">
            <div className="er-success-icon">✅</div>
            <h2>Registration Successful!</h2>
            <p>You have successfully registered for <strong>{event.title}</strong>.</p>
            <p className="er-success-note">Your registration is currently <strong>Pending</strong> approval from the organizer. You will be notified once it is approved.</p>
            <div className="er-success-summary">
              <div className="er-summary-item"><span>Event</span><strong>{event.title}</strong></div>
              <div className="er-summary-item"><span>Name</span><strong>{form.fullName}</strong></div>
              <div className="er-summary-item"><span>Reg No.</span><strong>{form.regNo}</strong></div>
              <div className="er-summary-item"><span>Department</span><strong>{form.department}</strong></div>
            </div>
            <div className="er-success-actions">
              <button onClick={() => navigate('/dashboard?tab=registrations')} className="er-btn er-btn-primary">View My Registrations</button>
              <button onClick={() => navigate('/dashboard?tab=browse-events')} className="er-btn er-btn-secondary">Browse More Events</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="er-page">
      <div className="er-container">
        
        {/* Back button */}
        <button className="er-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="er-layout">
          {/* Left: Event Details Card */}
          <div className="er-event-card">
            <div 
              className="er-event-banner"
              style={{
                backgroundImage: `url(${getEventImage(event)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <span className="er-event-club">{event.clubName || 'College Club'}</span>
            </div>
            <div className="er-event-body">
              <h2 className="er-event-title">{event.title}</h2>
              <p className="er-event-desc">{event.description}</p>
              <div className="er-event-details">
                <div className="er-detail-item">
                  <span className="er-detail-icon">📅</span>
                  <div>
                    <label>Date & Time</label>
                    <span>{formatDate(event.date || event.dateTime)}</span>
                  </div>
                </div>
                <div className="er-detail-item">
                  <span className="er-detail-icon">📍</span>
                  <div>
                    <label>Location</label>
                    <span>{event.location || event.venue || 'Main Campus'}</span>
                  </div>
                </div>
                <div className="er-detail-item">
                  <span className="er-detail-icon">👥</span>
                  <div>
                    <label>Capacity</label>
                    <span>{event.capacity || event.maxParticipants || 'N/A'} seats</span>
                  </div>
                </div>
                {event.organizer && (
                  <div className="er-detail-item">
                    <span className="er-detail-icon">🧑‍💼</span>
                    <div>
                      <label>Organizer</label>
                      <span>{event.organizer.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Registration Form or Registration Status */}
          <div className="er-form-card">
            {alreadyRegistered ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>ℹ️</div>
                <h2 style={{ marginBottom: '12px' }}>Already Registered</h2>
                <p style={{ color: 'var(--dash-text-muted)', marginBottom: '24px', fontSize: '15px' }}>
                  You have already registered for this event.
                </p>
                <div style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: alreadyRegistered.status === 'Registered' || alreadyRegistered.status === 'Checked-in' || alreadyRegistered.status === 'Approved' ? '#e8f5e9' : '#fffdeb',
                  border: alreadyRegistered.status === 'Registered' || alreadyRegistered.status === 'Checked-in' || alreadyRegistered.status === 'Approved' ? '1.5px solid #2e7d32' : '1.5px solid #b45309',
                  color: alreadyRegistered.status === 'Registered' || alreadyRegistered.status === 'Checked-in' || alreadyRegistered.status === 'Approved' ? '#2e7d32' : '#b45309',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Registration Status: {alreadyRegistered.status}
                </div>
                <div style={{ marginTop: '30px' }}>
                  <button onClick={() => navigate('/dashboard?tab=registrations')} className="er-btn er-btn-primary">
                    View My Registrations
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="er-form-title">📝 Registration Form</h2>
                <p className="er-form-subtitle">Fill in your details to register for this event</p>

                {error && <div className="er-form-error">{error}</div>}

                <form onSubmit={handleSubmit} className="er-form">
                  <div className="er-form-row">
                    <div className="er-form-group">
                      <label>Full Name <span className="required">*</span></label>
                      <input type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" required />
                    </div>
                    <div className="er-form-group">
                      <label>Email Address <span className="required">*</span></label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
                    </div>
                  </div>

                  <div className="er-form-row">
                    <div className="er-form-group">
                      <label>Phone Number <span className="required">*</span></label>
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 9876543210" required pattern="\d{10}" maxLength="10" title="Phone number must be exactly 10 digits" />
                    </div>
                    <div className="er-form-group">
                      <label>Registration Number <span className="required">*</span></label>
                      <input type="text" name="regNo" value={form.regNo} onChange={handleChange} placeholder="e.g. 2112001" required pattern="\d+" title="Registration number must contain only numbers" />
                    </div>
                  </div>

                  <div className="er-form-row">
                    <div className="er-form-group">
                      <label>Department <span className="required">*</span></label>
                      <select name="department" value={form.department} onChange={handleChange} required>
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="er-form-group">
                      <label>Year of Study <span className="required">*</span></label>
                      <select name="year" value={form.year} onChange={handleChange} required>
                        <option value="">Select Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="er-form-group">
                    <label>College Name <span className="required">*</span></label>
                    <input 
                      type="text" 
                      name="collegeName" 
                      value={form.collegeName} 
                      onChange={handleChange} 
                      placeholder="Enter your college name" 
                      required 
                    />
                  </div>

                  {event && event.registrationType === 'team' && (
                    <div style={{ marginTop: '20px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc', width: '100%', boxSizing: 'border-box' }} className="full-width">
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>Team Members Details</h4>
                      {teamMembers.map((member, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                            placeholder="Member Name"
                            className="er-input"
                            style={{ padding: '8px 12px', height: '42px', boxSizing: 'border-box' }}
                            pattern="^[a-zA-Z\s]+$"
                            title="Name must contain only letters and spaces"
                            required={idx === 0}
                          />
                          <input
                            type="text"
                            value={member.regNo}
                            onChange={(e) => handleMemberChange(idx, 'regNo', e.target.value.replace(/\D/g, ''))}
                            placeholder="Reg No"
                            className="er-input"
                            style={{ padding: '8px 12px', height: '42px', boxSizing: 'border-box' }}
                            pattern="^\d+$"
                            title="Registration number must contain only numbers"
                            required={idx === 0}
                          />
                          <select
                            value={member.dept}
                            onChange={(e) => handleMemberChange(idx, 'dept', e.target.value)}
                            className="er-select"
                            style={{ padding: '8px 12px', height: '42px', boxSizing: 'border-box', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', width: '100%' }}
                            required={idx === 0}
                          >
                            <option value="">-- Dept --</option>
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={member.phone}
                            onChange={(e) => handleMemberChange(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Phone Number"
                            className="er-input"
                            style={{ padding: '8px 12px', height: '42px', boxSizing: 'border-box' }}
                            pattern="^\d{10}$"
                            maxLength="10"
                            title="Phone number must be exactly 10 digits"
                            required={idx === 0}
                          />
                          {teamMembers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              className="er-btn"
                              style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', width: '42px' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="er-btn"
                        style={{ padding: '8px 14px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                      >
                        + Add Member
                      </button>
                    </div>
                  )}

                  {event && event.priceType === 'paid' && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '16px', marginBottom: '16px', color: '#1e293b' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#166534', fontWeight: 'bold' }}>💳 Paid Event Registration</h4>
                      <p style={{ fontSize: '13px', margin: '0 0 12px 0' }}>
                        This event is paid. Please pay using UPI to the organizer's UPI number: <strong>{event.upiNumber || '9876543210'}</strong>
                      </p>
                      <div className="er-form-group">
                        <label>Upload Payment Screenshot <span className="required">*</span></label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleScreenshotChange} 
                          required 
                        />
                        {form.paymentScreenshot && (
                          <div style={{ marginTop: '10px' }}>
                            <img 
                              src={form.paymentScreenshot} 
                              alt="Screenshot Preview" 
                              style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '6px', border: '1px solid #ccc' }} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="er-form-group full-width">
                    <label>Why do you want to participate? <span className="optional">(Optional)</span></label>
                    <textarea name="reason" value={form.reason} onChange={handleChange} placeholder="Tell us why you're interested in this event..." rows="3"></textarea>
                  </div>

                  <div className="er-form-checkbox">
                    <input type="checkbox" id="agreeTerms" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} />
                    <label htmlFor="agreeTerms">I agree to the event <strong>terms and conditions</strong> and confirm all the details are correct.</label>
                  </div>

                  <button type="submit" className="er-btn er-btn-primary er-submit-btn">
                    Submit Registration
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

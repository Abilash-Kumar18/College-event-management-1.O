import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, eventService } from '../services/api';
import logoImg from '../assets/images/logo.jpg';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [isDobPickerOpen, setIsDobPickerOpen] = useState(false);
  const [user, setUser] = useState({
    name: 'Sridhar Venkataraman',
    email: 'sridharvenkataraman16@gmail.com',
    role: 'student',
    picture: '',
    points: 0,
    heartsCount: 0,
    savesCount: 0,
    sharesCount: 0,
    eventViewsCount: 0,
    registrationsCount: 0,
    mobileNumber: '',
    dob: null,
    country: '',
    state: '',
    city: ''
  });

  const [activeTab, setActiveTab] = useState('Overview');
  const [activeSidebar, setActiveSidebar] = useState('Profile');
  const [globalRank, setGlobalRank] = useState(81);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Sidebar hover and accordion state
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    profile: true,
    activities: true,
    settings: false
  });

  // Saved / Liked / Registered helper states
  const [likedIds, setLikedIds] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  // Details Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);

  // Settings modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Settings forms state
  const [editForm, setEditForm] = useState({
    name: '',
    mobileNumber: '',
    dob: '',
    country: '',
    state: '',
    city: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  useEffect(() => {
    const isAnyModalOpen = isEventDetailModalOpen || isEditModalOpen || isPasswordModalOpen || isDeleteModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEventDetailModalOpen, isEditModalOpen, isPasswordModalOpen, isDeleteModalOpen]);

  useEffect(() => {
    // 1. Load user from sessionStorage
    const storedUser = sessionStorage.getItem('user');
    let userId = 'default';
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        userId = parsed._id || 'default';
        setUser(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse user from sessionStorage', e);
      }
    }

    // Load localStorage stats fallbacks
    const localStatsKey = `dash_profile_stats_${userId}`;
    const storedStats = localStorage.getItem(localStatsKey);
    if (storedStats) {
      try {
        const stats = JSON.parse(storedStats);
        setUser(prev => ({ ...prev, ...stats }));
      } catch (e) { }
    }

    // Load liked and saved list IDs
    const storedLikes = localStorage.getItem(`dash_liked_${userId}`);
    if (storedLikes) {
      try { setLikedIds(JSON.parse(storedLikes)); } catch { }
    }
    const storedSaves = localStorage.getItem(`dash_saved_${userId}`);
    if (storedSaves) {
      try { setSavedIds(JSON.parse(storedSaves)); } catch { }
    }

    // Load registrations
    const storedRegs = localStorage.getItem('dash_global_registrations');
    if (storedRegs) {
      try {
        const parsedRegs = JSON.parse(storedRegs);
        setRegistrations(parsedRegs.filter(r => r.studentId === userId));
      } catch { }
    }

    // Load announcements
    const storedAnn = localStorage.getItem('dash_announcements');
    if (storedAnn) {
      try { setAnnouncements(JSON.parse(storedAnn)); } catch { }
    }

    // 2. Fetch from backend API
    const fetchProfileAndData = async () => {
      try {
        const backendProfile = await authService.getProfile();
        if (backendProfile) {
          setUser(prev => ({ ...prev, ...backendProfile }));
          
          // Sync full details
          const stored = sessionStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            sessionStorage.setItem('user', JSON.stringify({ ...parsed, ...backendProfile }));
          }
        }

        // Fetch leaderboard rank
        try {
          const leaderboardData = await authService.getLeaderboard();
          if (leaderboardData && leaderboardData.userRank) {
            setGlobalRank(leaderboardData.userRank);
          }
        } catch { }
      } catch (err) {
        console.warn('Backend connection unavailable, running locally.', err);
      }

      // Fetch all events
      try {
        const allEvents = await eventService.getAll();
        setEvents(allEvents || []);
      } catch (err) {
        setEvents([]);
      }
    };

    fetchProfileAndData();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const userAvatar = user.picture || user.avatarUrl || user.avatar;
  const points = user.points || 0;
  const currentRank = globalRank !== 81 ? globalRank : Math.max(1, 92 - points);

  const getTierDetails = (pts) => {
    if (pts >= 300) {
      return { current: 'Platinum', next: 'None (Max Tier!)', progressPercent: 100, ptsAway: 0 };
    } else if (pts >= 150) {
      return { current: 'Gold', next: 'Platinum', progressPercent: ((pts - 150) / 150) * 100, ptsAway: 300 - pts };
    } else if (pts >= 50) {
      return { current: 'Silver', next: 'Gold', progressPercent: ((pts - 50) / 100) * 100, ptsAway: 150 - pts };
    } else {
      return { current: 'Bronze', next: 'Silver', progressPercent: (pts / 50) * 100, ptsAway: 50 - pts };
    }
  };

  const tierInfo = getTierDetails(points);

  const toggleSubmenu = (menu, e) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Toggle Like and Save locally inside Profile to support direct list updates
  const triggerStatUpdate = async (type, action) => {
    const localStatsKey = `dash_profile_stats_${user._id}`;
    const storedStats = localStorage.getItem(localStatsKey);
    let stats = storedStats ? JSON.parse(storedStats) : {
      points: 0, heartsCount: 0, savesCount: 0, sharesCount: 0, eventViewsCount: 0, registrationsCount: 0
    };

    let pointsDiff = 0;
    if (type === 'hearts') {
      if (action === 'decrement') {
        stats.heartsCount = Math.max(0, stats.heartsCount - 1);
        pointsDiff = -1;
      } else {
        stats.heartsCount += 1;
        pointsDiff = 1;
      }
    } else if (type === 'saves') {
      if (action === 'decrement') {
        stats.savesCount = Math.max(0, stats.savesCount - 1);
        pointsDiff = -1;
      } else {
        stats.savesCount += 1;
        pointsDiff = 1;
      }
    }

    stats.points = Math.max(0, stats.points + pointsDiff);
    localStorage.setItem(localStatsKey, JSON.stringify(stats));

    setUser(prev => ({ ...prev, ...stats }));
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      sessionStorage.setItem('user', JSON.stringify({ ...parsed, ...stats }));
    }

    try {
      await authService.updateStats(type, action);
    } catch { }
  };

  const handleUnlikeEvent = (eventId) => {
    const updated = likedIds.filter(id => id !== eventId);
    setLikedIds(updated);
    localStorage.setItem(`dash_liked_${user._id}`, JSON.stringify(updated));
    triggerStatUpdate('hearts', 'decrement');
  };

  const handleUnsaveEvent = (eventId) => {
    const updated = savedIds.filter(id => id !== eventId);
    setSavedIds(updated);
    localStorage.setItem(`dash_saved_${user._id}`, JSON.stringify(updated));
    triggerStatUpdate('saves', 'decrement');
  };

  // Edit Settings Submit
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    const form = e.target;

    // Check basic HTML5 validity
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Name validations
    const nameRegex = /^[a-zA-Z\s]+$/;
    const nameInput = form.querySelector('input[name="name"]');
    if (nameInput) {
      if (!nameRegex.test(editForm.name)) {
        nameInput.setCustomValidity("Name must contain only alphabets and spaces.");
        nameInput.reportValidity();
        nameInput.focus();
        return;
      }
      if (editForm.name.length >= 50) {
        nameInput.setCustomValidity("Name must be less than 50 characters.");
        nameInput.reportValidity();
        nameInput.focus();
        return;
      }
      nameInput.setCustomValidity("");
    }

    // Phone validations
    const mobileInput = form.querySelector('input[name="mobileNumber"]');
    if (mobileInput && editForm.mobileNumber) {
      const cleanMobile = editForm.mobileNumber.replace(/\D/g, '');
      if (cleanMobile.length !== 10 || !/^\d{10}$/.test(editForm.mobileNumber)) {
        mobileInput.setCustomValidity("Phone number must contain only numbers and be exactly 10 digits.");
        mobileInput.reportValidity();
        mobileInput.focus();
        return;
      }
      mobileInput.setCustomValidity("");
    }

    // Date of Birth validation
    if (editForm.dob) {
      const dobDate = new Date(editForm.dob);
      const today = new Date();
      if (dobDate >= today) {
        alert("Date of Birth must be a past date.");
        return;
      }
    }

    // Country, State, City validations
    const countryInput = form.querySelector('input[name="country"]');
    if (countryInput && editForm.country) {
      if (!nameRegex.test(editForm.country)) {
        countryInput.setCustomValidity("Country must contain only alphabets and spaces.");
        countryInput.reportValidity();
        countryInput.focus();
        return;
      }
      countryInput.setCustomValidity("");
    }

    const stateInput = form.querySelector('input[name="state"]');
    if (stateInput && editForm.state) {
      if (!nameRegex.test(editForm.state)) {
        stateInput.setCustomValidity("State must contain only alphabets and spaces.");
        stateInput.reportValidity();
        stateInput.focus();
        return;
      }
      stateInput.setCustomValidity("");
    }

    const cityInput = form.querySelector('input[name="city"]');
    if (cityInput && editForm.city) {
      if (!nameRegex.test(editForm.city)) {
        cityInput.setCustomValidity("City must contain only alphabets and spaces.");
        cityInput.reportValidity();
        cityInput.focus();
        return;
      }
      cityInput.setCustomValidity("");
    }

    setSettingsLoading(true);

    try {
      const updatedData = await authService.updateProfile(editForm);
      setUser(prev => ({ ...prev, ...updatedData }));

      const stored = sessionStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        sessionStorage.setItem('user', JSON.stringify({ ...parsed, ...updatedData }));
      }

      setSettingsSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSettingsSuccess('');
      }, 1500);
    } catch (err) {
      setSettingsError(err.message || 'Failed to update profile.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Password Submit
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    const form = e.target;

    const newPasswordInput = form.querySelector('input[name="newPassword"]');
    const confirmPasswordInput = form.querySelector('input[name="confirmNewPassword"]');

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      if (confirmPasswordInput) {
        confirmPasswordInput.setCustomValidity('New passwords do not match.');
        confirmPasswordInput.reportValidity();
        confirmPasswordInput.focus();
      }
      return;
    } else if (confirmPasswordInput) {
      confirmPasswordInput.setCustomValidity('');
    }

    if (passwordForm.newPassword.length < 8) {
      if (newPasswordInput) {
        newPasswordInput.setCustomValidity('New password must be at least 8 characters long.');
        newPasswordInput.reportValidity();
        newPasswordInput.focus();
      }
      return;
    }
    if (/^\d+$/.test(passwordForm.newPassword)) {
      if (newPasswordInput) {
        newPasswordInput.setCustomValidity('Password cannot consist of only numbers.');
        newPasswordInput.reportValidity();
        newPasswordInput.focus();
      }
      return;
    }

    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      if (newPasswordInput) {
        newPasswordInput.setCustomValidity('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
        newPasswordInput.reportValidity();
        newPasswordInput.focus();
      }
      return;
    } else if (newPasswordInput) {
      newPasswordInput.setCustomValidity('');
    }

    setSettingsLoading(true);

    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setSettingsSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setSettingsSuccess('');
      }, 1500);
    } catch (err) {
      setSettingsError(err.message || 'Failed to change password.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Delete Account
  const handleDeleteAccountSubmit = async () => {
    setSettingsError('');
    setSettingsLoading(true);

    try {
      await authService.deleteAccount();
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      setIsDeleteModalOpen(false);
      navigate('/login');
    } catch (err) {
      setSettingsError(err.message || 'Failed to delete account.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Calendar logic: July 2026
  // July 1st is Wednesday, has 31 days
  const calendarDays = [];
  // 3 padding days for Sun, Mon, Tue
  for (let i = 0; i < 3; i++) calendarDays.push(null);
  for (let i = 1; i <= 31; i++) calendarDays.push(i);

  const getEventsForDay = (day) => {
    if (!day) return [];
    // July date checking
    return events.filter(e => {
      const isRegistered = registrations.some(r => r.eventId === e._id);
      if (!isRegistered) return false;
      const d = new Date(e.date);
      return d.getFullYear() === 2026 && d.getMonth() === 6 && d.getDate() === day; // Month 6 is July (0-indexed)
    });
  };

  const isFacultyOrOrg = user.role === 'faculty' || user.role === 'organizer';
  const sidebarTabs = [
    { id: 'Overview', label: 'My Profile', icon: '👤' },
    { id: 'Calendar', label: 'Event Calendar', icon: '📅' },
    { id: 'Inbox', label: 'Inbox', icon: '📥' }
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation matching Dashboard style */}
      <aside className="dashboard-sidebar open">
        <div 
          className="sidebar-header" 
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 0 20px 0', borderBottom: '1px solid var(--dash-border)', marginBottom: '20px', cursor: 'pointer' }}
          title="Go to Homepage"
        >
          <img src={logoImg} alt="KSR Logo" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid var(--dash-border)' }} />
          <div className="sidebar-title-container">
            <span className="sidebar-title" style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.3px', color: 'var(--dash-text)' }}>CAMPUS EVENTS</span>
            <span className="sidebar-subtitle" style={{ fontSize: '11px', color: 'var(--dash-text-muted)' }}>User Profile</span>
          </div>
        </div>

        <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          {sidebarTabs.map((tab) => {
            const props = { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round', style: { marginRight: '10px', verticalAlign: 'middle' } };
            let iconSvg = null;
            if (tab.id === 'Overview') {
              iconSvg = <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
            } else if (tab.id === 'Calendar') {
              iconSvg = <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
            } else if (tab.id === 'Saved') {
              iconSvg = <svg {...props}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>;
            } else if (tab.id === 'Liked') {
              iconSvg = <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
            } else if (tab.id === 'Registered') {
              iconSvg = <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg>;
            } else if (tab.id === 'Inbox') {
              iconSvg = <svg {...props}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
            } else if (tab.id === 'Settings') {
              iconSvg = <svg {...props}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', width: '100%', border: 'none', background: 'none', textAlign: 'left', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                {iconSvg}
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--dash-border)' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="nav-item" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', border: 'none', background: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--brand-green-light)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ padding: '30px' }}>
        
        {/* Top Hero Banner */}
        <div className="profile-hero-banner">
          <div className="hero-gradient-bg"></div>
          <div className="hero-user-details">
            <div className="hero-avatar">
              {userAvatar ? (
                <img src={userAvatar} alt="Profile" />
              ) : (
                <span>{getInitials(user.name)}</span>
              )}
            </div>
            <div className="hero-info">
              <h2>{user.name}</h2>
              <p className="hero-email">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {user.email}
                <span className="status-badge verified">✔ Verified</span>
              </p>
              <div className="hero-status">
                <span className="status-badge role">{user.role || 'Student'}</span>
                <span className="status-badge active">● Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <div className="tab-content overview-content">
            
            {/* Personal Profile */}
            <div className="section-block personal-profile">
              <h3 className="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                PERSONAL PROFILE
              </h3>
              <div className="profile-grid">
                <div className="profile-grid-item">
                  <label>Account Holder</label>
                  <span>{user.name}</span>
                </div>
                <div className="profile-grid-item">
                  <label>Contact Email</label>
                  <span>{user.email}</span>
                </div>
                <div className="profile-grid-item">
                  <label>Role</label>
                  <span style={{textTransform: 'capitalize'}}>{user.role}</span>
                </div>
                <div className="profile-grid-item">
                  <label>Member Since</label>
                  <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'July 2026'}</span>
                </div>
                <div className="profile-grid-item">
                  <label>Profile Status</label>
                  <span className="status-badge active-light">Active User</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    setSettingsError('');
                    setSettingsSuccess('');
                    setEditForm({
                      name: user.name || '',
                      mobileNumber: user.mobileNumber || '',
                      dob: user.dob || '',
                      country: user.country || '',
                      state: user.state || '',
                      city: user.city || ''
                    });
                    setIsEditModalOpen(true);
                  }} 
                  className="dash-btn dash-btn-primary"
                >
                  ✏️ Edit Profile
                </button>
                <button 
                  onClick={() => {
                    setSettingsError('');
                    setSettingsSuccess('');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                    setIsPasswordModalOpen(true);
                  }} 
                  className="dash-btn dash-btn-outline"
                >
                  🔒 Change Password
                </button>
                <button 
                  onClick={() => {
                    setSettingsError('');
                    setIsDeleteModalOpen(true);
                  }} 
                  className="dash-btn dash-btn-secondary"
                  style={{ color: '#ff6b6b', border: '1px solid #ff6b6b' }}
                >
                  🗑️ Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Calendar View */}
        {activeTab === 'Calendar' && (
          <div className="tab-content calendar-content">
            <div className="stats-section-header">
              <h3>📅 MY EVENT CALENDAR</h3>
            </div>
            <p className="calendar-desc">Track campus events for <strong>July 2026</strong>.</p>
            
            <div className="calendar-card">
              <div className="calendar-header-title">
                <h4>July 2026</h4>
              </div>
              <div className="calendar-grid-header">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              <div className="calendar-grid-body">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div key={idx} className={`calendar-day-cell ${!day ? 'empty' : ''} ${dayEvents.length > 0 ? 'has-event' : ''}`}>
                      <span className="day-number">{day}</span>
                      <div className="day-event-tags">
                        {dayEvents.map(e => (
                          <div 
                            key={e._id} 
                            onClick={() => { setSelectedEvent(e); setIsEventDetailModalOpen(true); }}
                            className="calendar-event-tag"
                            title={e.title}
                          >
                            ⭐ {e.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}



        {/* Inbox Tab Content */}
        {activeTab === 'Inbox' && (
          <div className="tab-content inbox-content">
            <div className="stats-section-header">
              <h3>📥 NOTIFICATIONS & ANNOUNCEMENTS</h3>
            </div>
            <div className="no-events-placeholder">
              <span className="placeholder-icon">📬</span>
              <p>Your inbox is empty. No announcements published.</p>
            </div>
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>📝 Edit Profile</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            {settingsError && <div className="modal-alert error">{settingsError}</div>}
            {settingsSuccess && <div className="modal-alert success">{settingsSuccess}</div>}
            <form onSubmit={handleEditProfileSubmit} className="profile-modal-form">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
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
                  }}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input 
                  type="text" 
                  name="mobileNumber"
                  value={editForm.mobileNumber} 
                  onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value })} 
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const cleanMobile = val.replace(/\D/g, '');
                      if (cleanMobile.length !== 10 || !/^\d{10}$/.test(val)) {
                        e.target.setCustomValidity("Phone number must contain only numbers and be exactly 10 digits.");
                      } else {
                        e.target.setCustomValidity("");
                      }
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Birth Date</label>
                <button
                  type="button"
                  className="dash-btn dash-btn-outline"
                  onClick={() => setIsDobPickerOpen(!isDobPickerOpen)}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '42px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', color: '#1f2937' }}
                >
                  <span>{editForm.dob ? new Date(editForm.dob).toLocaleDateString() : 'Select Date 📅'}</span>
                </button>
                {isDobPickerOpen && (
                  <div style={{ position: 'absolute', top: '70px', left: 0, zIndex: 1000, background: '#fff', border: '1.5px solid #10b981', borderRadius: '8px', padding: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', color: '#000' }}>
                    <DayPicker
                      mode="single"
                      selected={editForm.dob ? new Date(editForm.dob) : undefined}
                      onSelect={(day) => {
                        if (day) {
                          setEditForm({ ...editForm, dob: day.toISOString().split('T')[0] });
                        }
                        setIsDobPickerOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Country</label>
                <input 
                  type="text" 
                  name="country"
                  value={editForm.country} 
                  onChange={e => setEditForm({ ...editForm, country: e.target.value })} 
                  onBlur={(e) => {
                    const val = e.target.value;
                    const nameRegex = /^[a-zA-Z\s]+$/;
                    if (val && !nameRegex.test(val)) {
                      e.target.setCustomValidity("Country must contain only alphabets and spaces.");
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input 
                  type="text" 
                  name="state"
                  value={editForm.state} 
                  onChange={e => setEditForm({ ...editForm, state: e.target.value })} 
                  onBlur={(e) => {
                    const val = e.target.value;
                    const nameRegex = /^[a-zA-Z\s]+$/;
                    if (val && !nameRegex.test(val)) {
                      e.target.setCustomValidity("State must contain only alphabets and spaces.");
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input 
                  type="text" 
                  name="city"
                  value={editForm.city} 
                  onChange={e => setEditForm({ ...editForm, city: e.target.value })} 
                  onBlur={(e) => {
                    const val = e.target.value;
                    const nameRegex = /^[a-zA-Z\s]+$/;
                    if (val && !nameRegex.test(val)) {
                      e.target.setCustomValidity("City must contain only alphabets and spaces.");
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={settingsLoading}>
                  {settingsLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>🔒 Change Password</h3>
              <button className="modal-close" onClick={() => setIsPasswordModalOpen(false)}>×</button>
            </div>
            {settingsError && <div className="modal-alert error">{settingsError}</div>}
            {settingsSuccess && <div className="modal-alert success">{settingsSuccess}</div>}
            <form onSubmit={handleChangePasswordSubmit} className="profile-modal-form">
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  name="currentPassword"
                  value={passwordForm.currentPassword} 
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  name="newPassword"
                  value={passwordForm.newPassword} 
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                  onBlur={(e) => {
                    const val = e.target.value;
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
                    if (!val) {
                      e.target.setCustomValidity("New Password is required");
                    } else if (val.length < 8) {
                      e.target.setCustomValidity("New password must be at least 8 characters long.");
                    } else if (/^\d+$/.test(val)) {
                      e.target.setCustomValidity("Password cannot consist of only numbers.");
                    } else if (!passwordRegex.test(val)) {
                      e.target.setCustomValidity("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirmNewPassword"
                  value={passwordForm.confirmNewPassword} 
                  onChange={e => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })} 
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      e.target.setCustomValidity("Confirm Password is required");
                    } else if (val !== passwordForm.newPassword) {
                      e.target.setCustomValidity("New passwords do not match.");
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save" disabled={settingsLoading}>
                  {settingsLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="profile-modal-content danger" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>⚠️ Confirm Delete Account</h3>
              <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)}>×</button>
            </div>
            {settingsError && <div className="modal-alert error">{settingsError}</div>}
            <div className="delete-modal-body" style={{ margin: '15px 0' }}>
              <p>Are you absolutely sure you want to delete your account? This action is <strong>irreversible</strong> and will delete all your events registration history and details.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-delete" onClick={handleDeleteAccountSubmit} disabled={settingsLoading}>
                {settingsLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Event Details Modal */}
      {isEventDetailModalOpen && selectedEvent && (
        <div className="profile-modal-overlay" onClick={() => setIsEventDetailModalOpen(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '540px'}}>
            <div className="profile-modal-header" style={{background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(20,29,34,0.05) 100%)'}}>
              <h3 style={{color: 'var(--ace-primary, #22c55e)'}}>⭐ Event Details</h3>
              <button className="modal-close" onClick={() => setIsEventDetailModalOpen(false)}>×</button>
            </div>
            <div className="event-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{margin: '0', fontSize: '20px', color: '#111827'}}>{selectedEvent.title}</h3>
              <span style={{background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', width: 'fit-content'}}>
                {selectedEvent.clubName || 'College Club'}
              </span>
              <p style={{margin: '0', fontSize: '13px', color: '#4b5563', lineHeight: '1.6'}}>{selectedEvent.description}</p>
              
              <div className="modal-event-details-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '8px'}}>
                <div>
                  <label style={{fontSize: '11px', fontWeight: '700', color: '#9ca3af'}}>DATE & TIME</label>
                  <p style={{margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1f2937'}}>{formatDate(selectedEvent.date)}</p>
                </div>
                <div>
                  <label style={{fontSize: '11px', fontWeight: '700', color: '#9ca3af'}}>LOCATION</label>
                  <p style={{margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1f2937'}}>{selectedEvent.location}</p>
                </div>
                <div>
                  <label style={{fontSize: '11px', fontWeight: '700', color: '#9ca3af'}}>CAPACITY</label>
                  <p style={{margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1f2937'}}>{selectedEvent.capacity} seats</p>
                </div>
                {selectedEvent.organizer && (
                  <div>
                    <label style={{fontSize: '11px', fontWeight: '700', color: '#9ca3af'}}>ORGANIZER</label>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1f2937'}}>{selectedEvent.organizer.name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions" style={{padding: '16px 24px', borderTop: '1px solid #f3f4f6', background: '#f9fafb'}}>
              <button className="btn-cancel" onClick={() => setIsEventDetailModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

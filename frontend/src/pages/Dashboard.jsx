import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { eventService, scanService, authService, studentService, facultyService, announcementService, registrationService, adminService } from '../services/api';
import './Dashboard.css';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

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
import logoImg from '../assets/images/logo.jpg';
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

// No mock constants needed, rely on database.

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [likedEvents, setLikedEvents] = useState(() => {
    const userStored = localStorage.getItem('user');
    if (!userStored) return [];
    try {
      const parsed = JSON.parse(userStored);
      const userId = parsed._id || 'default';
      const stored = localStorage.getItem(`dash_liked_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [savedEvents, setSavedEvents] = useState(() => {
    const userStored = localStorage.getItem('user');
    if (!userStored) return [];
    try {
      const parsed = JSON.parse(userStored);
      const userId = parsed._id || 'default';
      const stored = localStorage.getItem(`dash_saved_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Navigation Tab State synced with URL query (?tab=...)
  const [currentTab, setCurrentTab] = useState(() => {
    return new URLSearchParams(window.location.search).get('tab') || 'home';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [browseFilter, setBrowseFilter] = useState('all'); // 'all' | 'upcoming' | 'closed'
  const [organizerRegEventId, setOrganizerRegEventId] = useState('');

  // Data States
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [staff, setStaff] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [results, setResults] = useState({});
  const [organizers, setOrganizers] = useState([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: '', email: '', password: '' });

  // Loading and Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const getRegEventId = (reg) => {
    if (!reg) return '';
    if (typeof reg.eventId === 'object' && reg.eventId !== null) {
      return String(reg.eventId._id || reg.eventId.id || '');
    }
    return String(reg.eventId || '');
  };

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedApprovalEvent, setSelectedApprovalEvent] = useState(null);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
  const [selectedScreenshotReg, setSelectedScreenshotReg] = useState(null);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isAddClubModalOpen, setIsAddClubModalOpen] = useState(false);
  const [isCreateAnnouncementModalOpen, setIsCreateAnnouncementModalOpen] = useState(false);
  const [isResultEntryModalOpen, setIsResultEntryModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  // Form Input States
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    fromDate: '',
    toDate: '',
    location: '',
    capacity: 100,
    clubName: '',
    requestedFaculty: '',
    imageTheme: 'default',
    mode: 'offline',
    registrationType: 'solo',
    priceType: 'free',
    upiNumber: '',
    entryFee: 0,
    posterUrl: ''
  });

  const [studentCoordinators, setStudentCoordinators] = useState([
    { name: '', regNo: '', dept: '', phone: '' }
  ]);

  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isToDatePickerOpen, setIsToDatePickerOpen] = useState(false);

  const handleAddCoordinator = () => {
    setStudentCoordinators([...studentCoordinators, { name: '', regNo: '', dept: '', phone: '' }]);
  };

  const handleRemoveCoordinator = (index) => {
    setStudentCoordinators(studentCoordinators.filter((_, i) => i !== index));
  };

  const handleCoordinatorChange = (index, field, val) => {
    const updated = [...studentCoordinators];
    updated[index][field] = val;
    setStudentCoordinators(updated);
  };

  const [staffForm, setStaffForm] = useState({
    name: '',
    dept: '',
    role: '',
    email: ''
  });

  const [clubForm, setClubForm] = useState({
    name: '',
    dept: '',
    president: '',
    desc: ''
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    body: '',
    author: ''
  });

  const [resultForm, setResultForm] = useState({
    eventId: '',
    firstPlaceName: '',
    firstPlaceEmail: '',
    secondPlaceName: '',
    secondPlaceEmail: '',
    thirdPlaceName: '',
    thirdPlaceEmail: ''
  });

  // QR Scan Sim states
  const [qrScanEventId, setQrScanEventId] = useState('');
  const [qrScanStudentReg, setQrScanStudentReg] = useState('');
  const [qrScanResult, setQrScanResult] = useState(null);

  // Memoized values for performance optimizations
  const eventsMap = useMemo(() => {
    const map = new Map();
    events.forEach(e => map.set(e._id, e));
    return map;
  }, [events]);

  const studentRegistrations = useMemo(() => {
    if (!user?._id) return [];
    return registrations.filter(r => r.studentId === user._id);
  }, [registrations, user?._id]);

  const attendedRegistrations = useMemo(() => {
    return studentRegistrations.filter(r => r.checkedIn && r.certificateApproved);
  }, [studentRegistrations]);

  const approvedRegistrations = useMemo(() => {
    return studentRegistrations.filter(r => r.status === 'Registered' || r.status === 'Checked-in' || r.status === 'Approved');
  }, [studentRegistrations]);

  // Student camera QR scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Dynamically load jsQR CDN script
  useEffect(() => {
    if (!document.getElementById('jsqr-script')) {
      const script = document.createElement('script');
      script.id = 'jsqr-script';
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const startScanning = async () => {
    if (user && user.role === 'student' && !qrScanEventId) {
      setScanStatus('Please select an event from the dropdown list first.');
      return;
    }
    setIsScanning(true);
    setScanStatus('Initializing camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        videoRef.current.play();
        setTimeout(() => {
          if (streamRef.current) {
            requestAnimationFrame(tickScan);
          }
        }, 500);
      }
    } catch (err) {
      console.error(err);
      setScanStatus('Failed to access camera: ' + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const tickScan = () => {
    if (!streamRef.current) return;
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code) {
          console.log('Found QR code:', code.data);
          handleSelfCheckIn(code.data);
          return;
        }
      }
    }
    setTimeout(() => {
      if (streamRef.current) requestAnimationFrame(tickScan);
    }, 250);
  };

  const handleSelfCheckIn = async (qrData) => {
    stopScanning();
    setScanStatus('Checking in...');
    try {
      const targetEvent = events.find(e => e._id === qrData || e.qrCode === qrData || e.title === qrData);
      if (!targetEvent) {
        setScanStatus('Invalid Event QR Code.');
        return;
      }
      if (qrScanEventId && String(targetEvent._id) !== String(qrScanEventId)) {
        const expectedTitle = events.find(e => e._id === qrScanEventId)?.title || '';
        setScanStatus(`Scanned QR code does not match the selected event "${expectedTitle}".`);
        return;
      }
      const reg = registrations.find(r => String(r.eventId) === String(targetEvent._id) && (String(r.studentId?._id || r.studentId) === String(user._id)));
      if (!reg) {
        setScanStatus('You are not registered for this event or your registration is not approved yet.');
        return;
      }

      // Front-end date validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(targetEvent.fromDate || targetEvent.dateTime);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetEvent.toDate || targetEvent.dateTime || targetEvent.fromDate);
      end.setHours(23, 59, 59, 999);
      if (today < start || today > end) {
        setScanStatus('Attendance check-in is only allowed on the scheduled event day(s).');
        return;
      }

      await studentService.selfScan(targetEvent._id);

      const updated = registrations.map(r => {
        if (r.id === reg.id) {
          return {
            ...r,
            checkedIn: true,
            status: 'Checked-in',
            checkInTime: new Date().toISOString()
          };
        }
        return r;
      });
      setRegistrations(updated);
      localStorage.setItem('dash_global_registrations', JSON.stringify(updated));

      setScanStatus(`Successfully checked in for "${targetEvent.title}"!`);
      setActionSuccess(`Successfully checked in for "${targetEvent.title}"!`);
    } catch (err) {
      setScanStatus('Check-in failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', currentTab);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [currentTab]);

  // Auth check
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (e) {
      navigate('/login');
    }
  }, [navigate]);

  // Gamified interactions
  const triggerStatUpdate = async (type, action) => {
    if (!user) return;
    const userId = user._id;
    const localStatsKey = `dash_profile_stats_${userId}`;
    const storedStats = localStorage.getItem(localStatsKey);
    let stats = storedStats ? JSON.parse(storedStats) : {
      points: 0,
      heartsCount: 0,
      savesCount: 0,
      sharesCount: 0,
      eventViewsCount: 0,
      registrationsCount: 0
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
    } else if (type === 'shares') {
      stats.sharesCount += 1;
      pointsDiff = 2;
    } else if (type === 'eventViews') {
      stats.eventViewsCount += 1;
      pointsDiff = 1;
    }

    stats.points = Math.max(0, stats.points + pointsDiff);
    localStorage.setItem(localStatsKey, JSON.stringify(stats));

    // Also update main user object in localStorage if present so Profile is synced
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

    try {
      await authService.updateStats(type, action);
    } catch (e) {
      console.warn('Backend stats sync failed, using localStorage fallback.', e);
    }
  };

  const handleLikeEvent = (eventId) => {
    const isLiked = likedEvents.includes(eventId);
    const updated = isLiked
      ? likedEvents.filter(id => id !== eventId)
      : [...likedEvents, eventId];

    setLikedEvents(updated);
    localStorage.setItem(`dash_liked_${user._id}`, JSON.stringify(updated));
    triggerStatUpdate('hearts', isLiked ? 'decrement' : 'increment');
  };

  const handleSaveEvent = (eventId) => {
    const isSaved = savedEvents.includes(eventId);
    const updated = isSaved
      ? savedEvents.filter(id => id !== eventId)
      : [...savedEvents, eventId];

    setSavedEvents(updated);
    localStorage.setItem(`dash_saved_${user._id}`, JSON.stringify(updated));
    triggerStatUpdate('saves', isSaved ? 'decrement' : 'increment');
  };

  const handleShareEvent = (event) => {
    const shareText = `Check out this college event: ${event.title} at ${event.location}!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setActionSuccess(`Copied event details to clipboard! Shared to earn 2 points.`);
        setTimeout(() => setActionSuccess(''), 3000);
      }).catch(() => {
        setActionSuccess(`Shared details: "${event.title}". Earned 2 points.`);
        setTimeout(() => setActionSuccess(''), 3000);
      });
    } else {
      setActionSuccess(`Shared details: "${event.title}". Earned 2 points.`);
      setTimeout(() => setActionSuccess(''), 3000);
    }
    triggerStatUpdate('shares', 'increment');
  };

  const handleViewEventDetails = (event) => {
    setSelectedEvent(event);
    setIsEventDetailModalOpen(true);
    triggerStatUpdate('eventViews', 'increment');
  };

  // Load Dashboard Data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch events from API
        let apiEvents = [];
        try {
          apiEvents = await eventService.getAll({ includeDeleted: true });
        } catch (e) {
          console.warn('Backend API event fetch failed.', e);
        }
        setEvents(apiEvents);

        // 1. Fetch announcements from API
        try {
          const apiAnnouncements = await announcementService.getAll();
          const mappedAnn = apiAnnouncements.map(ann => ({
            id: ann._id,
            title: ann.title,
            body: ann.message,
            date: ann.sentAt || ann.createdAt,
            author: 'Campus Management'
          }));
          setAnnouncements(mappedAnn);
        } catch (annError) {
          console.warn('Failed to fetch announcements from API.', annError);
          const storedAnn = localStorage.getItem('dash_announcements');
          setAnnouncements(storedAnn ? JSON.parse(storedAnn) : []);
        }

        const storedStaff = localStorage.getItem('dash_staff');
        if (storedStaff) {
          setStaff(JSON.parse(storedStaff));
        } else {
          setStaff([]);
        }

        const dbClubs = [];
        const seenClubs = new Set();
        apiEvents.forEach(evt => {
          const clubKey = (evt.clubName || evt.category || '').trim();
          if (clubKey && !seenClubs.has(clubKey.toLowerCase())) {
            seenClubs.add(clubKey.toLowerCase());
            dbClubs.push({
              id: evt._id,
              name: clubKey,
              dept: evt.organizerDept || 'General',
              president: evt.createdBy?.name || 'Student Coordinator',
              desc: `Organizing body for ${evt.title}.`
            });
          }
        });

        const storedClubs = localStorage.getItem('dash_clubs');
        let localClubs = [];
        if (storedClubs) {
          try { localClubs = JSON.parse(storedClubs); } catch (e) { }
        }

        const combinedClubs = [...dbClubs];
        localClubs.forEach(lc => {
          if (!seenClubs.has(lc.name.toLowerCase())) {
            seenClubs.add(lc.name.toLowerCase());
            combinedClubs.push(lc);
          }
        });
        setClubs(combinedClubs);

        const storedResults = localStorage.getItem('dash_results');
        if (storedResults) {
          setResults(JSON.parse(storedResults));
        }

        // 2. Fetch registrations based on user role
        let fetchedRegs = [];
        try {
          if (user.role === 'student') {
            const apiRegs = await studentService.getRegistrations();
            fetchedRegs = apiRegs.map(r => ({
              id: r._id,
              eventId: r.eventId?._id || r.eventId,
              eventTitle: r.eventId?.title || 'Unknown Event',
              studentId: user._id,
              studentName: user.name,
              studentReg: user.regNo || 'N/A',
              studentEmail: user.email,
              date: r.createdAt,
              status: r.status,
              checkedIn: r.status === 'Checked-in',
              checkInTime: r.scanTime
            }));
            const regIds = fetchedRegs.map(r => r.eventId);
            setRegisteredEventIds(regIds);
            localStorage.setItem(`dash_registered_${user._id}`, JSON.stringify(regIds));
          } else if (user.role === 'organizer') {
            const organizerEvents = apiEvents.filter(e => String(e.createdBy?._id || e.createdBy) === String(user._id));
            for (const evt of organizerEvents) {
              try {
                const res = await eventService.getRegistrations(evt._id);
                const mapped = res.map(r => ({
                  id: r._id,
                  eventId: evt._id,
                  eventTitle: evt.title,
                  studentId: r.studentId?._id || r.studentId,
                  studentObj: r.studentId,
                  studentName: r.studentId?.name || 'Student',
                  studentReg: r.studentId?.regNo || 'N/A',
                  studentEmail: r.studentId?.email || '',
                  studentDept: r.studentId?.deptYear || 'N/A',
                  studentMobile: r.studentId?.mobileNumber || 'N/A',
                  collegeName: r.collegeName || 'K.S.R. College Of Engineering',
                  teamDetails: r.teamDetails || 'N/A',
                  ticketId: r.sixDigitId || 'N/A',
                  date: r.createdAt,
                  status: r.status,
                  checkedIn: r.status === 'Checked-in',
                  checkInTime: r.scanTime,
                  paymentScreenshot: r.paymentScreenshot,
                  paymentVerified: r.paymentVerified,
                  certificateApproved: r.certificateApproved || false
                }));
                fetchedRegs = [...fetchedRegs, ...mapped];
              } catch (err) {
                console.warn(`Failed to fetch organizer registrations for event ${evt._id}`, err);
              }
            }
          } else if (user.role === 'faculty' || user.role === 'admin') {
            try {
              const res = await facultyService.getAllRegistrations();
              fetchedRegs = res.map(r => ({
                id: r._id,
                eventId: r.eventId?._id || r.eventId,
                eventTitle: r.eventId?.title || 'Unknown Event',
                studentId: r.studentId?._id || r.studentId,
                studentObj: r.studentId,
                studentName: r.studentId?.name || 'Student',
                studentReg: r.studentId?.regNo || 'N/A',
                studentEmail: r.studentId?.email || '',
                studentDept: r.studentId?.deptYear || 'N/A',
                studentMobile: r.studentId?.mobileNumber || 'N/A',
                collegeName: r.collegeName || 'K.S.R. College Of Engineering',
                teamDetails: r.teamDetails || 'N/A',
                ticketId: r.sixDigitId || 'N/A',
                date: r.createdAt,
                status: r.status,
                checkedIn: r.status === 'Checked-in',
                checkInTime: r.scanTime,
                paymentScreenshot: r.paymentScreenshot,
                paymentVerified: r.paymentVerified,
                certificateApproved: r.certificateApproved || false
              }));
            } catch (err) {
              console.warn(`Failed to fetch all registrations:`, err);
            }
          }
          setRegistrations(fetchedRegs);
          localStorage.setItem('dash_global_registrations', JSON.stringify(fetchedRegs));

          if (user.role === 'faculty' || user.role === 'admin') {
            try {
              const apiOrgs = await facultyService.getOrganizers();
              setOrganizers(apiOrgs || []);
            } catch (orgError) {
              console.warn('Failed to fetch organizers from API', orgError);
            }
          }

          if (user.role === 'organizer' || user.role === 'faculty' || user.role === 'admin') {
            try {
              const apiFac = await facultyService.getFacultyList();
              setFacultyList(apiFac || []);
            } catch (facError) {
              console.warn('Failed to fetch faculty from API', facError);
            }
          }
        } catch (regErr) {
          console.warn('Failed to fetch registrations from API, falling back to localStorage.', regErr);
          const userRegKey = `dash_registered_${user._id}`;
          const storedUserRegs = localStorage.getItem(userRegKey);
          const regIds = storedUserRegs ? JSON.parse(storedUserRegs) : [];
          setRegisteredEventIds(regIds);

          const storedAllRegs = localStorage.getItem('dash_global_registrations');
          if (storedAllRegs) {
            setRegistrations(JSON.parse(storedAllRegs));
          } else {
            setRegistrations([]);
          }
        }

      } catch (err) {
        setError('Error loading dashboard data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, refreshTrigger]);

  // Alert dismiss timers
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Lock scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      isEventDetailModalOpen ||
      !!selectedApprovalEvent ||
      isAddStaffModalOpen ||
      isAddClubModalOpen ||
      isCreateAnnouncementModalOpen ||
      isResultEntryModalOpen ||
      isOrganizerModalOpen ||
      confirmDialog.isOpen ||
      !!selectedOrganizer;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEventDetailModalOpen, selectedApprovalEvent, isAddStaffModalOpen, isAddClubModalOpen, isCreateAnnouncementModalOpen, isResultEntryModalOpen, isOrganizerModalOpen, confirmDialog.isOpen, selectedOrganizer]);

  if (!user) return null;

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Student Actions: Register for event
  const handleRegisterEvent = async (event) => {
    if (registeredEventIds.includes(event._id)) {
      setActionSuccess('You are already registered for this event.');
      return;
    }

    try {
      // 1. Try real API registration
      try {
        await eventService.register(event._id);
      } catch (e) {
        console.warn('API registration check failed. Simulating local registration persistence.', e);
      }

      // 2. Persist registration locally in state/localStorage
      const updatedRegs = [...registeredEventIds, event._id];
      const userRegKey = `dash_registered_${user._id}`;
      localStorage.setItem(userRegKey, JSON.stringify(updatedRegs));
      setRegisteredEventIds(updatedRegs);

      // Add to global registrations log
      const newReg = {
        id: `reg_${Date.now()}`,
        eventId: event._id,
        eventTitle: event.title,
        studentId: user._id,
        studentName: user.name,
        studentReg: user.regNo || '21CSR01',
        studentEmail: user.email,
        date: new Date().toISOString(),
        status: 'Pending',
        checkedIn: false
      };
      const updatedGlobalRegs = [...registrations, newReg];
      localStorage.setItem('dash_global_registrations', JSON.stringify(updatedGlobalRegs));
      setRegistrations(updatedGlobalRegs);

      setActionSuccess(`Successfully registered for ${event.title}! Approval is pending from organizer.`);
      setIsEventDetailModalOpen(false);
    } catch (err) {
      setError(err.message || 'Registration failed. Capacity may be full.');
    }
  };

  // Faculty Actions: Delete/Remove Student, Organizer, Event, or Registration
  const handleDeleteUser = (userId, roleToDelete) => {
    const roleLabel = roleToDelete === 'student' ? 'Student' : 'Organizer';
    const confirmMessage = roleToDelete === 'organizer'
      ? "Are you sure you want to permanently delete this organizer account? All events created by this organizer will also be removed. This action cannot be undone."
      : "Are you sure you want to permanently delete this student account and remove all their access? This action cannot be undone.";

    requestConfirm(`Confirm Revoke Access`, confirmMessage, async () => {
      setLoading(true);
      try {
        await facultyService.deleteUser(userId);
        setRefreshTrigger(prev => prev + 1);
        setActionSuccess(`${roleLabel} account and associated data removed successfully.`);
      } catch (err) {
        setError(err.message || `Failed to delete ${roleLabel} account.`);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteEvent = (eventId) => {
    requestConfirm("Confirm Delete Event", "Are you sure you want to permanently delete this event and all student registrations associated with it? This action cannot be undone.", async () => {
      setLoading(true);
      try {
        await facultyService.deleteEvent(eventId);
        setRefreshTrigger(prev => prev + 1);
        setActionSuccess("Event deleted successfully.");
      } catch (err) {
        setError(err.message || "Failed to delete event.");
      } finally {
        setLoading(false);
      }
    });
  };

  const handlePermanentDeleteEvent = (eventId) => {
    requestConfirm("Confirm Permanent Delete Event", "Are you sure you want to permanently delete this event and all student registrations associated with it? This will completely remove it from the database. This action cannot be undone.", async () => {
      setLoading(true);
      try {
        await facultyService.deleteEvent(eventId);
        setRefreshTrigger(prev => prev + 1);
        setActionSuccess("Event permanently deleted.");
      } catch (err) {
        setError(err.message || "Failed to permanently delete event.");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteRegistration = (regId) => {
    requestConfirm("Confirm Delete Registration", "Are you sure you want to delete this event registration record? This action cannot be undone.", async () => {
      setLoading(true);
      try {
        await facultyService.deleteRegistration(regId);
        setRefreshTrigger(prev => prev + 1);
        setActionSuccess("Registration deleted successfully.");
      } catch (err) {
        setError(err.message || "Failed to delete registration.");
      } finally {
        setLoading(false);
      }
    });
  };

  // Organizer Actions: Create/Publish Event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setActionSuccess('');

    const form = e.target;

    // Check basic HTML5 validity
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Constraints & Validations
    const titleInput = form.querySelector('input[placeholder*="Event name"]') || form.querySelector('input[placeholder*="event name"]');
    if (titleInput) {
      if (eventForm.title.length >= 50) {
        titleInput.setCustomValidity('Event title must be less than 50 characters.');
        titleInput.reportValidity();
        titleInput.focus();
        return;
      }
      if (/^\d+$/.test(eventForm.title)) {
        titleInput.setCustomValidity('Event title cannot contain only numbers.');
        titleInput.reportValidity();
        titleInput.focus();
        return;
      }
      titleInput.setCustomValidity('');
    }

    const clubInput = form.querySelector('input[placeholder*="Coding Club"]') || form.querySelector('input[placeholder*="coding club"]');
    if (clubInput) {
      if (/\d/.test(eventForm.clubName)) {
        clubInput.setCustomValidity('Organizing Club name cannot contain numbers.');
        clubInput.reportValidity();
        clubInput.focus();
        return;
      }
      clubInput.setCustomValidity('');
    }

    const now = new Date();
    const start = new Date(eventForm.fromDate);
    const end = new Date(eventForm.toDate);

    if (start < now) {
      alert('Event starting date/time cannot be in the past.');
      return;
    }
    if (start >= end) {
      alert('Event ending date/time must be after starting date/time.');
      return;
    }

    // Untime checking (10 PM to 6 AM)
    const startHour = start.getHours();
    const endHour = end.getHours();
    if ((startHour >= 22 || startHour < 6) || (endHour >= 22 || endHour < 6)) {
      alert('Events cannot start or end between 10:00 PM and 6:00 AM (untime hours).');
      return;
    }

    // Capacity limit (Max 1000 seats validation)
    const capVal = parseInt(eventForm.capacity, 10);
    const capInput = form.querySelector('input[type="number"]') || form.querySelector('input[placeholder*="Capacity"]');
    if (capInput) {
      if (isNaN(capVal) || capVal < 1 || capVal > 1000) {
        capInput.setCustomValidity("Capacity Limit must be between 1 and 1000 seats.");
        capInput.reportValidity();
        capInput.focus();
        return;
      }
      capInput.setCustomValidity('');
    }

    // Paid fields check
    if (eventForm.priceType === 'paid') {
      const upiInput = form.querySelector('input[placeholder*="UPI ID"]') || form.querySelector('input[placeholder*="UPI ID/Number"]');
      if (upiInput) {
        const isUpiIdValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(eventForm.upiNumber);
        const isUpiPhoneValid = /^\d{10}$/.test(eventForm.upiNumber);
        if (!isUpiIdValid && !isUpiPhoneValid) {
          upiInput.setCustomValidity('Please provide a valid UPI ID (e.g., username@bank) or a 10-digit phone number for payment.');
          upiInput.reportValidity();
          upiInput.focus();
          return;
        }
        upiInput.setCustomValidity('');
      }

      const feeInput = form.querySelector('input[placeholder*="Amount in ₹"]');
      if (feeInput) {
        if (eventForm.entryFee <= 0) {
          feeInput.setCustomValidity('Entry fee must be greater than zero for paid events.');
          feeInput.reportValidity();
          feeInput.focus();
          return;
        }
        if (eventForm.entryFee >= 1500) {
          feeInput.setCustomValidity('Amount per person must be less than 1500.');
          feeInput.reportValidity();
          feeInput.focus();
          return;
        }
        feeInput.setCustomValidity('');
      }
    }

    // Validate student coordinators
    const scNameRegex = /^[a-zA-Z\s]+$/;
    const scRegNoRegex = /^\d+$/;
    const scPhoneRegex = /^\d{10}$/;

    const coordinatorInputs = form.querySelectorAll('input[placeholder="Student Name"]');
    const regNoInputs = form.querySelectorAll('input[placeholder="Registration No"]');
    const phoneInputs = form.querySelectorAll('input[placeholder="Phone Number"]');

    for (let i = 0; i < studentCoordinators.length; i++) {
      const c = studentCoordinators[i];
      const isAnyFieldFilled = c.name.trim() || c.regNo.trim() || c.dept.trim() || c.phone.trim();

      if (studentCoordinators.length > 1 || isAnyFieldFilled) {
        if (!c.name.trim()) {
          if (coordinatorInputs[i]) {
            coordinatorInputs[i].setCustomValidity(`Please fill in all details for Student Coordinator ${i + 1}.`);
            coordinatorInputs[i].reportValidity();
            coordinatorInputs[i].focus();
          }
          return;
        }
        if (!scNameRegex.test(c.name)) {
          if (coordinatorInputs[i]) {
            coordinatorInputs[i].setCustomValidity(`Student Coordinator ${i + 1} name must contain only letters and spaces.`);
            coordinatorInputs[i].reportValidity();
            coordinatorInputs[i].focus();
          }
          return;
        } else if (coordinatorInputs[i]) {
          coordinatorInputs[i].setCustomValidity('');
        }

        if (!c.regNo.trim()) {
          if (regNoInputs[i]) {
            regNoInputs[i].setCustomValidity(`Please fill in all details for Student Coordinator ${i + 1}.`);
            regNoInputs[i].reportValidity();
            regNoInputs[i].focus();
          }
          return;
        }
        if (!scRegNoRegex.test(c.regNo)) {
          if (regNoInputs[i]) {
            regNoInputs[i].setCustomValidity(`Student Coordinator ${i + 1} registration number must contain only numbers.`);
            regNoInputs[i].reportValidity();
            regNoInputs[i].focus();
          }
          return;
        } else if (regNoInputs[i]) {
          regNoInputs[i].setCustomValidity('');
        }

        if (!c.phone.trim()) {
          if (phoneInputs[i]) {
            phoneInputs[i].setCustomValidity(`Please fill in all details for Student Coordinator ${i + 1}.`);
            phoneInputs[i].reportValidity();
            phoneInputs[i].focus();
          }
          return;
        }
        if (!scPhoneRegex.test(c.phone)) {
          if (phoneInputs[i]) {
            phoneInputs[i].setCustomValidity(`Student Coordinator ${i + 1} phone number must be exactly 10 digits.`);
            phoneInputs[i].reportValidity();
            phoneInputs[i].focus();
          }
          return;
        } else if (phoneInputs[i]) {
          phoneInputs[i].setCustomValidity('');
        }
      }
    }

    try {
      let resolvedPosterUrl = '';
      if (eventForm.posterUrl) resolvedPosterUrl = eventForm.posterUrl;
      else if (eventForm.imageTheme === 'hackathon') resolvedPosterUrl = hackathonImg;
      else if (eventForm.imageTheme === 'robotics') resolvedPosterUrl = robotWarsImg;
      else if (eventForm.imageTheme === 'cultural') resolvedPosterUrl = culturalFusionImg;
      else if (eventForm.imageTheme === 'workshop') resolvedPosterUrl = reactWorkshopImg;
      else resolvedPosterUrl = defaultEventImg;

      let createdEvent = null;
      try {
        createdEvent = await eventService.create({
          title: eventForm.title,
          description: eventForm.description,
          dateTime: start.toISOString(),
          venue: eventForm.location,
          maxParticipants: parseInt(eventForm.capacity) || 100,
          category: eventForm.clubName,
          organizerDept: user.deptYear || 'General',
          clubName: eventForm.clubName,
          requestedFaculty: eventForm.requestedFaculty || undefined,
          posterUrl: resolvedPosterUrl,
          mode: eventForm.mode,
          registrationType: eventForm.registrationType,
          priceType: eventForm.priceType,
          upiNumber: eventForm.priceType === 'paid' ? eventForm.upiNumber : undefined,
          entryFee: eventForm.priceType === 'paid' ? eventForm.entryFee : 0,
          fromDate: start.toISOString(),
          toDate: end.toISOString(),
          studentCoordinators: studentCoordinators.filter(c => c.name.trim() !== ''),
        });
      } catch (err) {
        console.warn('Backend API event creation failed. Simulating local event creation.', err);
      }

      // 2. Fallback / merge locally
      if (!createdEvent) {
        createdEvent = {
          _id: `event_${Date.now()}`,
          title: eventForm.title,
          description: eventForm.description,
          date: start.toISOString(),
          location: eventForm.location,
          capacity: parseInt(eventForm.capacity) || 100,
          clubName: eventForm.clubName,
          posterUrl: resolvedPosterUrl,
          mode: eventForm.mode,
          registrationType: eventForm.registrationType,
          priceType: eventForm.priceType,
          upiNumber: eventForm.priceType === 'paid' ? eventForm.upiNumber : undefined,
          fromDate: start.toISOString(),
          toDate: end.toISOString(),
          studentCoordinators: studentCoordinators.filter(c => c.name.trim() !== ''),
          facultyContact: eventForm.facultyContact,
          organizer: { name: user.name, email: user.email }
        };
      } else {
        // Map backend properties back to frontend properties
        createdEvent.date = createdEvent.dateTime;
        createdEvent.location = createdEvent.venue;
        createdEvent.capacity = createdEvent.maxParticipants;
      }

      const updatedEvents = [createdEvent, ...events];
      setEvents(updatedEvents);
      // Persist created events in localStorage if running completely offline
      localStorage.setItem('dash_custom_events', JSON.stringify(updatedEvents));

      setActionSuccess(`Successfully submitted event proposal "${eventForm.title}" for approval!`);
      setEventForm({
        title: '',
        description: '',
        fromDate: '',
        toDate: '',
        location: '',
        capacity: 100,
        clubName: user.clubName || '',
        requestedFaculty: '',
        imageTheme: 'default',
        mode: 'offline',
        registrationType: 'solo',
        priceType: 'free',
        upiNumber: '',
        facultyContact: ''
      });
      setStudentCoordinators([{ name: '', regNo: '', dept: '', phone: '' }]);
      setCurrentTab('home'); // Go back to main dashboard
    } catch (err) {
      setError(err.message || 'Failed to create event. Make sure you are authorized.');
    }
  };

  // Organizer: Approve / Reject Student Registration
  const handleUpdateRegistrationStatus = async (regId, status) => {
    setError('');
    setActionSuccess('');
    try {
      if (regId && !String(regId).startsWith('reg_')) {
        await registrationService.updateStatus(regId, status);
      }
      const updated = registrations.map(reg => {
        if (reg.id === regId) {
          return { ...reg, status, checkedIn: status === 'Checked-in' };
        }
        return reg;
      });
      setRegistrations(updated);
      localStorage.setItem('dash_global_registrations', JSON.stringify(updated));
      setActionSuccess(`Registration status updated to ${status}.`);
    } catch (err) {
      setError(err.message || 'Failed to update registration status');
    }
  };

  // Faculty: Approve / Reject Event Request
  const handleApproveRejectEvent = async (eventId, newStatus) => {
    setError('');
    setActionSuccess('');
    try {
      let updatedEvent = null;
      if (eventId && !String(eventId).startsWith('event_')) {
        const response = await facultyService.updateEventStatus(eventId, newStatus);
        updatedEvent = response.event;
      }
      const updated = events.map(evt => {
        if (evt._id === eventId) {
          return updatedEvent ? { ...evt, ...updatedEvent } : { ...evt, status: newStatus };
        }
        return evt;
      });
      setEvents(updated);
      setActionSuccess(`Event successfully ${newStatus === 'Approved' ? 'approved' : 'rejected'}!`);
    } catch (err) {
      setError(err.message || 'Failed to update event approval status');
    }
  };

  const handleUpdateCoordination = async (eventId, status) => {
    setError('');
    setActionSuccess('');
    setLoading(true);
    try {
      await facultyService.updateCoordinationStatus(eventId, status);
      setRefreshTrigger(prev => prev + 1);
      setActionSuccess(`Coordination request successfully ${status.toLowerCase()}!`);
    } catch (err) {
      setError(err.message || 'Failed to update coordination status');
    } finally {
      setLoading(false);
    }
  };

  // Faculty: Approve Organizer Account
  const handleApproveOrganizer = async (organizerId) => {
    setError('');
    setActionSuccess('');
    try {
      await facultyService.approveOrganizer(organizerId);
      const updated = organizers.map(org => {
        if (org._id === organizerId) {
          return { ...org, isApproved: true };
        }
        return org;
      });
      setOrganizers(updated);
      setActionSuccess('Organizer approved successfully!');
      if (selectedOrganizer && selectedOrganizer._id === organizerId) {
        setSelectedOrganizer(prev => ({ ...prev, isApproved: true }));
      }
    } catch (err) {
      setError(err.message || 'Failed to approve organizer');
    }
  };

  // Admin: Create & Manage Faculty accounts
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setActionSuccess('');
    setError('');

    if (!facultyForm.name || !facultyForm.email || !facultyForm.password) {
      setError('Please fill in all faculty fields.');
      return;
    }

    const nameRegex = /^[a-zA-Z\s.]+$/;
    if (!nameRegex.test(facultyForm.name.trim())) {
      setError("Name must contain only alphabets, dots, and spaces.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
    if (!emailRegex.test(facultyForm.email.trim())) {
      setError("Email address must end with @gmail.com or @ksrce.ac.in.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(facultyForm.password)) {
      setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
      return;
    }

    try {
      setLoading(true);
      await adminService.createFaculty(facultyForm);
      setActionSuccess(`Faculty account for ${facultyForm.name} created successfully.`);
      setFacultyForm({ name: '', email: '', password: '' });

      const apiFac = await facultyService.getFacultyList();
      setFacultyList(apiFac || []);
    } catch (err) {
      setError(err.message || 'Failed to create faculty account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaculty = (facultyId, facultyName) => {
    requestConfirm(
      "Confirm Delete Faculty",
      `Are you sure you want to permanently delete the faculty account for ${facultyName}? All events created by this faculty will also be removed. This action cannot be undone.`,
      async () => {
        setActionSuccess('');
        setError('');
        try {
          setLoading(true);
          await facultyService.deleteUser(facultyId);
          setActionSuccess(`Faculty account for ${facultyName} has been deleted.`);
          const apiFac = await facultyService.getFacultyList();
          setFacultyList(apiFac || []);
        } catch (err) {
          setError(err.message || 'Failed to delete faculty account.');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Organizer: Add Staff
  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.dept || !staffForm.role || !staffForm.email) {
      setError('Please fill in all staff fields.');
      return;
    }
    const newStaff = {
      id: `staff_${Date.now()}`,
      ...staffForm
    };
    const updated = [...staff, newStaff];
    setStaff(updated);
    localStorage.setItem('dash_staff', JSON.stringify(updated));
    setStaffForm({ name: '', dept: '', role: '', email: '' });
    setIsAddStaffModalOpen(false);
    setActionSuccess('Staff member added successfully!');
  };

  // Organizer: Add Club
  const handleAddClub = (e) => {
    e.preventDefault();
    if (!clubForm.name || !clubForm.dept || !clubForm.president || !clubForm.desc) {
      setError('Please fill in all club fields.');
      return;
    }
    const newClub = {
      id: `club_${Date.now()}`,
      ...clubForm
    };
    const updated = [...clubs, newClub];
    setClubs(updated);
    localStorage.setItem('dash_clubs', JSON.stringify(updated));
    setClubForm({ name: '', dept: '', president: '', desc: '' });
    setIsAddClubModalOpen(false);
    setActionSuccess('Club added successfully!');
  };

  // Organizer: Create Announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.body) {
      setError('Please provide announcement title and content.');
      return;
    }
    try {
      let created = null;
      try {
        created = await announcementService.create({
          title: announcementForm.title,
          message: announcementForm.body,
          audience: 'all'
        });
      } catch (err) {
        console.warn('API announcement creation failed. Simulating locally.', err);
      }

      const newAnn = {
        id: created?._id || `ann_${Date.now()}`,
        title: announcementForm.title,
        body: announcementForm.body,
        date: created?.sentAt || new Date().toISOString(),
        author: announcementForm.author || user.name
      };

      const updated = [newAnn, ...announcements];
      setAnnouncements(updated);
      localStorage.setItem('dash_announcements', JSON.stringify(updated));
      setAnnouncementForm({ title: '', body: '', author: '' });
      setIsCreateAnnouncementModalOpen(false);
      setActionSuccess('New announcement published successfully!');
    } catch (err) {
      setError(err.message || 'Failed to publish announcement');
    }
  };

  // Organizer: Result Entry
  const handleAddResult = (e) => {
    e.preventDefault();
    if (!resultForm.eventId || !resultForm.firstPlaceName || !resultForm.firstPlaceEmail) {
      setError('Please select an event and fill at least the first place winner name and email.');
      return;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
    if (!emailRegex.test(resultForm.firstPlaceEmail)) {
      setError('First place email must be a valid @gmail.com or @ksrce.ac.in address.');
      return;
    }
    if (resultForm.secondPlaceName && resultForm.secondPlaceEmail && !emailRegex.test(resultForm.secondPlaceEmail)) {
      setError('Second place email must be a valid @gmail.com or @ksrce.ac.in address.');
      return;
    }
    if (resultForm.thirdPlaceName && resultForm.thirdPlaceEmail && !emailRegex.test(resultForm.thirdPlaceEmail)) {
      setError('Third place email must be a valid @gmail.com or @ksrce.ac.in address.');
      return;
    }

    const updatedResults = {
      ...results,
      [resultForm.eventId]: {
        firstPlace: `${resultForm.firstPlaceName} (${resultForm.firstPlaceEmail})`,
        secondPlace: resultForm.secondPlaceName ? `${resultForm.secondPlaceName} (${resultForm.secondPlaceEmail})` : '',
        thirdPlace: resultForm.thirdPlaceName ? `${resultForm.thirdPlaceName} (${resultForm.thirdPlaceEmail})` : '',
        datePublished: new Date().toISOString()
      }
    };
    setResults(updatedResults);
    localStorage.setItem('dash_results', JSON.stringify(updatedResults));
    setResultForm({
      eventId: '',
      firstPlaceName: '',
      firstPlaceEmail: '',
      secondPlaceName: '',
      secondPlaceEmail: '',
      thirdPlaceName: '',
      thirdPlaceEmail: ''
    });
    setIsResultEntryModalOpen(false);
    setActionSuccess('Event results published successfully!');
  };

  // Organizer: Scan check-in attendee simulation
  const handleCheckInSimulate = async (studentRegStr, eventIdStr) => {
    setQrScanResult(null);
    setError('');

    const targetEventId = eventIdStr || qrScanEventId;
    const targetStudentReg = studentRegStr || qrScanStudentReg;

    if (!targetEventId || !targetStudentReg) {
      setError('Please select an event and enter Student ID/Registration Number.');
      return;
    }

    // Find if the registration exists
    const reg = registrations.find(r => r.eventId === targetEventId && (r.studentReg.toLowerCase() === targetStudentReg.toLowerCase() || r.studentName.toLowerCase() === targetStudentReg.toLowerCase()));

    if (!reg) {
      setQrScanResult({
        success: false,
        message: 'No registration record found for this student and event.'
      });
      return;
    }

    if (reg.status !== 'Approved') {
      setQrScanResult({
        success: false,
        message: 'Attendee registration is pending or rejected.'
      });
      return;
    }

    // Verify date constraint
    const ev = events.find(e => e._id === targetEventId);
    if (ev) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(ev.fromDate || ev.dateTime);
      start.setHours(0, 0, 0, 0);
      const end = new Date(ev.toDate || ev.dateTime || ev.fromDate);
      end.setHours(23, 59, 59, 999);
      if (today < start || today > end) {
        setQrScanResult({
          success: false,
          message: 'Attendance check-in is only allowed on the scheduled event day(s).'
        });
        return;
      }
    }

    if (reg.checkedIn) {
      setQrScanResult({
        success: true,
        alreadyIn: true,
        message: `${reg.studentName} is already checked in.`,
        reg
      });
      return;
    }

    // Try scanning on backend API if matching details exist
    try {
      const qrData = JSON.stringify({ userId: reg.studentId, eventId: reg.eventId });
      await scanService.checkIn(qrData);
    } catch (e) {
      console.warn('Backend API scan failed. Simulating local check-in.', e);
    }

    // Mark checkedIn local state
    const updatedRegs = registrations.map(r => {
      if (r.id === reg.id) {
        return { ...r, checkedIn: true, checkInTime: new Date().toISOString() };
      }
      return r;
    });

    setRegistrations(updatedRegs);
    localStorage.setItem('dash_global_registrations', JSON.stringify(updatedRegs));
    setQrScanResult({
      success: true,
      message: `${reg.studentName} checked in successfully!`,
      reg: { ...reg, checkedIn: true, checkInTime: new Date().toISOString() }
    });
    setQrScanStudentReg('');
  };

  // Toggle checkedIn manual checklist state
  const handleToggleAttendanceCheck = async (regId) => {
    setError('');
    setActionSuccess('');
    const reg = registrations.find(r => r.id === regId);
    if (!reg) return;

    const isChecked = !reg.checkedIn;
    const newStatus = isChecked ? 'Checked-in' : 'Registered';

    try {
      if (regId && !String(regId).startsWith('reg_')) {
        await registrationService.updateStatus(regId, newStatus);
      }
      const updated = registrations.map(r => {
        if (r.id === regId) {
          return {
            ...r,
            checkedIn: isChecked,
            status: newStatus,
            checkInTime: isChecked ? new Date().toISOString() : undefined
          };
        }
        return r;
      });
      setRegistrations(updated);
      localStorage.setItem('dash_global_registrations', JSON.stringify(updated));
      setActionSuccess('Attendance status updated.');
    } catch (err) {
      setError(err.message || 'Failed to update attendance status');
    }
  };

  // Toggle certificate manual approval checklist state
  const handleToggleCertificateApproval = async (regId) => {
    setError('');
    setActionSuccess('');
    const reg = registrations.find(r => r.id === regId);
    if (!reg) return;

    const newApproval = !reg.certificateApproved;

    try {
      if (regId && !String(regId).startsWith('reg_')) {
        await registrationService.updateStatus(regId, reg.status, reg.points, newApproval);
      }
      const updated = registrations.map(r => {
        if (r.id === regId) {
          return {
            ...r,
            certificateApproved: newApproval
          };
        }
        return r;
      });
      setRegistrations(updated);
      localStorage.setItem('dash_global_registrations', JSON.stringify(updated));
      setActionSuccess('Certificate approval status updated.');
    } catch (err) {
      setError(err.message || 'Failed to update certificate approval status');
    }
  };

  // Export report XLSX trigger using SheetJS
  const handleExportReport = (format) => {
    if (format !== 'xlsx') {
      setActionSuccess(`Compiling statistics... File "College_Event_Report_${Date.now()}.${format}" generated and downloading.`);
      return;
    }

    try {
      setError('');
      setActionSuccess('');

      if (!qrScanEventId) {
        setError('Please select a specific event from the dropdown to export.');
        return;
      }

      // Find events to export
      const eventsToExport = events.filter(e => e._id === qrScanEventId);

      if (eventsToExport.length === 0) {
        setError('No events found to export.');
        return;
      }

      // Create a new Workbook
      const wb = XLSX.utils.book_new();

      eventsToExport.forEach((ev) => {
        // Find registrations for this event
        const eventRegs = registrations.filter(r => r.eventId === ev._id);

        const organizerName = ev.organizer?.name || ev.createdBy?.name || 'N/A';
        const organizerMail = ev.organizer?.email || ev.createdBy?.email || 'N/A';
        const dateStr = formatDate(ev.date || ev.dateTime);

        // Header info matching requirements
        const headerInfo = [
          [`Event Name:`, ev.title],
          [`Date:`, dateStr],
          [`Organizer Name:`, organizerName, `Organizer Email:`, organizerMail],
          [], // Blank row spacing
          [`S NO`, `Ticket ID`, `Student Name`, `Reg. Number`, `Email`, `Dept`, `Mobile`, `College`, `Team Details`, `Paid Status`, `Attendance`]
        ];

        const attendedRows = [];
        const notAttendedRows = [];

        eventRegs.forEach((reg, index) => {
          const isAttended = reg.checkedIn || reg.status === 'Checked-in';
          const ticketId = reg.ticketId || reg.sixDigitId || 'N/A';
          const studentName = reg.studentName || reg.studentObj?.name || 'N/A';
          const studentReg = reg.studentReg || reg.studentObj?.regNo || 'N/A';
          const studentEmail = reg.studentEmail || reg.studentObj?.email || 'N/A';
          const studentDept = reg.studentDept || reg.studentObj?.deptYear || 'N/A';
          const studentMobile = reg.studentMobile || reg.studentObj?.mobileNumber || 'N/A';
          const studentCollege = reg.collegeName || 'K.S.R. College Of Engineering';
          const teamDetails = reg.teamDetails || 'N/A';
          const paidStatus = reg.isPaid || reg.paid || reg.status === 'Registered' || reg.status === 'Checked-in' || reg.paymentVerified ? 'Paid' : 'Not Paid';
          const attendanceVal = isAttended ? 'Yes' : 'No';

          const rowData = [
            index + 1,
            ticketId,
            studentName,
            studentReg,
            studentEmail,
            studentDept,
            studentMobile,
            studentCollege,
            teamDetails,
            paidStatus,
            attendanceVal
          ];

          if (isAttended) {
            attendedRows.push(rowData);
          } else {
            notAttendedRows.push(rowData);
          }
        });

        // Sheet 1: Attended / All registrations
        // Re-number index for sequential display
        const allAttendedMapped = attendedRows.map((row, idx) => {
          const r = [...row];
          r[0] = idx + 1;
          return r;
        });
        const allRegisteredData = [...headerInfo, ...allAttendedMapped];
        const wsAll = XLSX.utils.aoa_to_sheet(allRegisteredData);

        // Sheet 2: Not Attended
        const notAttendedHeaderInfo = [
          [`Event Name:`, ev.title],
          [`Date:`, dateStr],
          [`Organizer Name:`, organizerName, `Organizer Email:`, organizerMail],
          [],
          [`S NO`, `Ticket ID`, `Student Name`, `Reg. Number`, `Email`, `Dept`, `Mobile`, `College`, `Team Details`, `Paid Status`, `Attendance`]
        ];
        const notAttendedMapped = notAttendedRows.map((row, idx) => {
          const r = [...row];
          r[0] = idx + 1;
          return r;
        });
        const wsNotAttended = XLSX.utils.aoa_to_sheet([...notAttendedHeaderInfo, ...notAttendedMapped]);

        // Extend cell column widths
        const colWidths = [
          { wch: 8 },   // S NO
          { wch: 15 },  // Ticket ID
          { wch: 25 },  // Student Name
          { wch: 15 },  // Reg. Number
          { wch: 32 },  // Email
          { wch: 20 },  // Dept
          { wch: 15 },  // Mobile
          { wch: 35 },  // College
          { wch: 25 },  // Team Details
          { wch: 15 },  // Paid Status
          { wch: 12 }   // Attendance
        ];
        wsAll['!cols'] = colWidths;
        wsNotAttended['!cols'] = colWidths;

        // Sheet titles (Max 31 chars)
        const cleanTitle = ev.title.replace(/[\[\]\*\?\/\\:]/g, '').substring(0, 20);
        XLSX.utils.book_append_sheet(wb, wsAll, `${cleanTitle}_Attendees`);
        XLSX.utils.book_append_sheet(wb, wsNotAttended, `${cleanTitle}_Absentees`);
      });

      // Write workbook file
      let filename = 'Event_Registrations_Report.xlsx';
      if (eventsToExport.length === 1) {
        const ev = eventsToExport[0];
        const rawDate = ev.date || ev.dateTime;
        const formattedDateStr = rawDate ? new Date(rawDate).toLocaleDateString().replace(/\//g, '-') : 'Date_N_A';
        filename = `${ev.title.replace(/[^a-z0-9]/gi, '_')}_${formattedDateStr}.xlsx`;
      }

      XLSX.writeFile(wb, filename);
      setActionSuccess(`Excel file "${filename}" generated and downloaded successfully.`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate Excel sheet report: ' + err.message);
    }
  };

  // Helper date text formatter
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventDateRange = (evt) => {
    if (!evt) return '';
    const start = evt.fromDate || evt.dateTime || evt.date;
    const end = evt.toDate;
    if (!start) return '';

    const dStart = new Date(start);
    const startStr = isNaN(dStart.getTime()) ? '' : dStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + dStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (!end) return startStr;

    const dEnd = new Date(end);
    const endStr = isNaN(dEnd.getTime()) ? '' : dEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + dEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (startStr === endStr) return startStr;
    return `${startStr} - ${endStr}`;
  };

  // Menu lists based on user role
  const isStudent = user.role === 'student';
  const isOrganizer = user.role === 'organizer';

  const studentTabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'browse-events', label: 'Browse Events', icon: '🔍' },
    { id: 'registrations', label: 'My Registrations', icon: '📝' },
    { id: 'attendance', label: 'My Attendance', icon: '📱' },
    { id: 'certificates', label: 'My Certificates', icon: '🏆' },
    { id: 'profile', label: 'My Profile', icon: '👤' }
  ];

  const organizerTabs = [];

  const facultyTabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'event-plan', label: 'Create Event', icon: '📅' },
    { id: 'faculty-events', label: 'Event Page', icon: '📅' },
    { id: 'faculty-registrations', label: 'Student Registrations', icon: '👨‍🎓' },
    { id: 'faculty-reports', label: 'Reports', icon: '📊' },
    { id: 'profile', label: 'My Profile', icon: '👤' }
  ];

  const adminTabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'event-plan', label: 'Create Event', icon: '📅' },
    { id: 'faculty-events', label: 'Event Page', icon: '📅' },
    { id: 'faculty-registrations', label: 'Student Registrations', icon: '👨‍🎓' },
    { id: 'faculty-reports', label: 'Reports', icon: '📊' },
    { id: 'manage-faculty', label: 'Manage Faculty', icon: '🛠️' },
    { id: 'profile', label: 'My Profile', icon: '👤' }
  ];

  const isFaculty = user.role === 'faculty' || user.role === 'admin';
  const isAdmin = user.role === 'admin';
  const tabsToRender = isStudent ? studentTabs : isAdmin ? adminTabs : facultyTabs;

  return (
    <div className="dashboard-container">
      {/* Sidebar backdrop */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div
          className="sidebar-header"
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', cursor: 'pointer' }}
          title="Go to Homepage"
        >
          <img src={logoImg} alt="KSR Logo" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid var(--dash-border)' }} />
          <div className="sidebar-title-container">
            <span className="sidebar-title" style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.3px', color: 'var(--dash-text)' }}>CAMPUS EVENTS</span>
            <span className="sidebar-subtitle" style={{ fontSize: '11px', color: 'var(--dash-text-muted)' }}>{isStudent ? 'Student Portal' : isAdmin ? 'Admin Portal' : 'Faculty Portal'}</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {tabsToRender.map((tab) => {
            const props = { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round', style: { marginRight: '10px', verticalAlign: 'middle' } };
            let iconSvg = null;
            if (tab.id === 'home') {
              iconSvg = <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
            } else if (tab.id === 'browse-events' || tab.id === 'faculty-events' || tab.id === 'event-plan') {
              iconSvg = <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
            } else if (tab.id === 'registrations' || tab.id === 'faculty-registrations') {
              iconSvg = <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg>;
            } else if (tab.id === 'attendance' || tab.id === 'faculty-attendance') {
              iconSvg = <svg {...props}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;
            } else if (tab.id === 'certificates') {
              iconSvg = <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>;
            } else if (tab.id === 'faculty-approve' || tab.id === 'approve-events') {
              iconSvg = <svg {...props}><polyline points="20 6 9 17 4 12"></polyline></svg>;
            } else if (tab.id === 'faculty-approve-organizer') {
              iconSvg = <svg {...props}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>;
            } else if (tab.id === 'staff' || tab.id === 'clubs') {
              iconSvg = <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
            } else if (tab.id === 'manage-faculty') {
              iconSvg = <svg {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
            } else if (tab.id === 'result-entry') {
              iconSvg = <svg {...props}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>;
            } else if (tab.id === 'report-menu' || tab.id === 'faculty-reports') {
              iconSvg = <svg {...props}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
            } else if (tab.id === 'profile') {
              iconSvg = <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'profile') {
                    navigate('/profile');
                  } else {
                    setCurrentTab(tab.id);
                  }
                  setIsSidebarOpen(false);
                }}
                className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {iconSvg}
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-summary-card" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="View Profile">
            <div className="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info-brief">
              <span className="user-name-brief">{user.name}</span>
              <span className="user-role-brief">{user.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', color: '#ff6b6b' }}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Dashboard Pages */}
      <main className="dashboard-main">
        {/* Topbar Welcome / Burger toggler */}
        <div className="dashboard-topbar">
          <div className="welcome-section">
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isSidebarOpen}
              style={isSidebarOpen ? {
                position: 'fixed',
                left: '210px',
                top: '16px',
                zIndex: 1000,
                background: 'var(--brand-green-light)',
                border: 'none',
                color: 'var(--brand-text-green)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              } : {}}
            >
              {isSidebarOpen ? '✕' : '☰'}
            </button>
            <div className="welcome-text">
              <h1>Welcome, {user.name}!</h1>
              <p>Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="profile-role-badge">{user.role}</span>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div className="badge badge-success" style={{ padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', width: '100%', fontSize: '14px' }}>
            ✨ {actionSuccess}
          </div>
        )}
        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Render Tab Contents */}
        {loading ? (
          <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
            <span className="spinner"></span>
            <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: '500', color: 'var(--dash-text-muted)' }}>Loading campus network...</p>
          </div>
        ) : (
          <>
            {/* -------------------- STUDENT DASHBOARD FLOWS -------------------- */}
            {isStudent && (
              <>
                {/* 1. Student Home Tab */}
                {currentTab === 'home' && (
                  <div>
                    {/* 1. Build Skills & Connect with Campus on the top below the welcome */}
                    <div className="dashboard-summary-banner" style={{ marginTop: '10px', marginBottom: '24px' }}>
                      <div className="banner-text">
                        <h2>Build Skills & Connect with Campus</h2>
                        <p>Explore technical events, hands-on workshops, and competitions. Register to participate, log attendance with QR codes, and download verified certificates.</p>
                      </div>
                    </div>

                    {registrations.some(r => r.status === 'Pending') && (
                      <div className="alert-banner warning" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#b45309', fontSize: '14px', fontWeight: '500' }}>
                        <span>⚠️</span>
                        <span>You have <strong>{registrations.filter(r => r.status === 'Pending').length}</strong> registrations pending organizer confirmation. Please check the registrations tab for details.</span>
                      </div>
                    )}

                    {/* 2. Overview (stats-grid) made a little bigger using stat-card-lg */}
                    <div className="stats-grid" style={{ marginBottom: '32px' }}>
                      <div className="stat-card stat-card-lg" onClick={() => setCurrentTab('registrations')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                          <span className="stat-value">{registrations.filter(r => r.status === 'Registered' || r.status === 'Checked-in').length}</span>
                          <span className="stat-label">Registered Events</span>
                        </div>
                      </div>
                      <div className="stat-card stat-card-lg" onClick={() => setCurrentTab('attendance')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                          <span className="stat-value">
                            {registrations.filter(r => r.status === 'Checked-in').length}
                          </span>
                          <span className="stat-label">Attended Events</span>
                        </div>
                      </div>
                      <div className="stat-card stat-card-lg" onClick={() => setCurrentTab('certificates')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon">🏆</div>
                        <div className="stat-info">
                          <span className="stat-value">
                            {registrations.filter(r => r.status === 'Checked-in').length}
                          </span>
                          <span className="stat-label">Certificates Earned</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Registration Cards */}
                    {registrations.filter(r => r.status === 'Pending').length > 0 && (
                      <div style={{ marginBottom: '32px' }}>
                        <div className="section-header" style={{ marginBottom: '16px' }}>
                          <h3 style={{ margin: 0, color: '#b45309' }}>⏳ Pending Registration Approvals</h3>
                        </div>
                        <div className="event-grid">
                          {registrations.filter(r => r.status === 'Pending').map((reg) => {
                            const matchingEvent = events.find(e => e._id === reg.eventId || e.title === reg.eventTitle);
                            const eventImg = matchingEvent ? getEventImage(matchingEvent) : reactWorkshopImg;
                            const dateVal = matchingEvent ? formatEventDateRange(matchingEvent) : new Date(reg.date).toLocaleDateString();
                            const venueVal = matchingEvent ? (matchingEvent.venue || matchingEvent.location) : 'Campus Venue';
                            return (
                              <div key={reg.id} className="dash-event-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <div
                                  className="event-card-header"
                                  style={{
                                    backgroundImage: `url("${eventImg}")`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                  }}
                                >
                                  <span className="event-card-club" style={{ background: '#b45309', color: '#fff' }}>⏳ Pending Approval</span>
                                </div>
                                <div className="event-card-content">
                                  <h4 className="event-card-title">{reg.eventTitle}</h4>
                                  <p className="event-card-desc" style={{ color: '#b45309', fontWeight: '500', fontSize: '12px', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a', margin: '8px 0' }}>
                                    Your receipt is currently awaiting organizer verification.
                                  </p>
                                  <div className="event-card-info-row">
                                    <div className="event-card-info-item">
                                      <span>📅</span> {dateVal}
                                    </div>
                                    <div className="event-card-info-item">
                                      <span>📍</span> {venueVal}
                                    </div>
                                  </div>
                                  <div className="event-card-action-row">
                                    <button
                                      onClick={() => {
                                        if (matchingEvent) {
                                          setSelectedEvent(matchingEvent);
                                          setIsEventDetailModalOpen(true);
                                        }
                                      }}
                                      className="dash-btn dash-btn-secondary"
                                      style={{ flex: 1 }}
                                    >
                                      View Event Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Upcoming Recommended Events below overview */}
                    <div className="section-header" style={{ marginBottom: '16px' }}>
                      <h3 style={{ margin: 0 }}>Upcoming Recommended Events</h3>
                    </div>

                    <div className="event-grid">
                      {events.filter(e => new Date(e.dateTime || e.fromDate || e.date) >= new Date() && e.status === 'Approved').slice(0, 3).map((event) => {
                        const isRegistered = registeredEventIds.includes(event._id);
                        const eventImg = getEventImage(event);
                        return (
                          <div key={event._id} className="dash-event-card">
                            <div
                              className="event-card-header"
                              style={{
                                backgroundImage: `url(${eventImg})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
                              <span className="event-card-club">{event.clubName || 'College Club'}</span>
                            </div>
                            <div className="event-card-content">
                              <h4 className="event-card-title">{event.title}</h4>
                              <p className="event-card-desc">{event.description}</p>
                              <div className="event-card-info-row">
                                <div className="event-card-info-item">
                                  <span>📅</span> {formatEventDateRange(event)}
                                </div>
                                <div className="event-card-info-item">
                                  <span>📍</span> {event.venue || event.location || 'Main Campus'}
                                </div>
                              </div>
                              <div className="event-card-action-row">
                                <button
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setIsEventDetailModalOpen(true);
                                  }}
                                  className="dash-btn dash-btn-secondary"
                                >
                                  Details
                                </button>
                                <button
                                  disabled={isRegistered || (event.registrationsCount >= event.maxParticipants)}
                                  onClick={() => (isRegistered || (event.registrationsCount >= event.maxParticipants)) ? null : navigate(`/register?eventId=${event._id}`)}
                                  className="dash-btn dash-btn-primary"
                                  style={(event.registrationsCount >= event.maxParticipants && !isRegistered) ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                                >
                                  {isRegistered ? 'Registered' : (event.registrationsCount >= event.maxParticipants) ? 'Event Full' : 'Register Now'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Button for Upcoming Events at the bottom-right of this section */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', marginBottom: '32px' }}>
                      <button
                        onClick={() => setCurrentTab('browse-events')}
                        className="dash-btn dash-btn-outline"
                        style={{ width: '90px', padding: '4px 10px', fontSize: '11px' }}
                      >
                        Browse All
                      </button>
                    </div>

                    {/* Separately: My Registrations and Announcements down the overview */}
                    <div className="home-column-section" style={{ display: 'flex', flexDirection: 'column', marginTop: '24px', marginBottom: '32px' }}>
                      <div>
                        <div className="section-header" style={{ marginBottom: '16px' }}>
                          <h3 style={{ margin: 0 }}>My Registrations</h3>
                        </div>
                        <div className="dash-table-container">
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Event</th>
                                <th>Date</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentRegistrations.slice().reverse().slice(0, 3).map((reg) => (
                                <tr key={reg.id}>
                                  <td style={{ fontWeight: 'bold' }}>{reg.eventTitle}</td>
                                  <td>
                                    {formatEventDateRange(eventsMap.get(reg.eventId))}
                                  </td>
                                  <td>
                                    <span className={`badge ${reg.status === 'Approved' || reg.status === 'Registered' || reg.status === 'Checked-in' ? 'badge-success' :
                                      reg.status === 'Rejected' || reg.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                                      }`}>
                                      {reg.status === 'Approved' || reg.status === 'Registered' ? 'Registration Completed' : reg.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {studentRegistrations.length === 0 && (
                                <tr>
                                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--dash-text-muted)' }}>
                                    No registered events yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                        <button
                          onClick={() => setCurrentTab('registrations')}
                          className="dash-btn dash-btn-outline"
                          style={{ width: '80px', padding: '4px 10px', fontSize: '11px' }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Student Browse Events Tab */}
                {currentTab === 'browse-events' && (() => {
                  const approvedEvents = events.filter(e => e.status === 'Approved');
                  const upcomingEvents = approvedEvents.filter(e => new Date(e.dateTime || e.fromDate || e.date) >= new Date());
                  const closedEvents = approvedEvents.filter(e => new Date(e.dateTime || e.fromDate || e.date) < new Date());
                  const filteredEvents =
                    browseFilter === 'upcoming' ? upcomingEvents :
                      browseFilter === 'closed' ? closedEvents : approvedEvents;

                  return (
                    <div>
                      {/* Header + Filter Tabs */}
                      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <h3>Explore Campus Events</h3>
                        <div className="filter-tabs">
                          <button
                            className={`filter-btn ${browseFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('all')}
                          >
                            All&nbsp;<span style={{ opacity: 0.7 }}>({approvedEvents.length})</span>
                          </button>
                          <button
                            className={`filter-btn ${browseFilter === 'upcoming' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('upcoming')}
                          >
                            🟢 Upcoming&nbsp;<span style={{ opacity: 0.7 }}>({upcomingEvents.length})</span>
                          </button>
                          <button
                            className={`filter-btn ${browseFilter === 'closed' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('closed')}
                          >
                            🔴 Closed&nbsp;<span style={{ opacity: 0.7 }}>({closedEvents.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Event Cards */}
                      {filteredEvents.length === 0 ? (
                        <div style={{
                          textAlign: 'center', padding: '60px 20px',
                          color: 'var(--dash-text-muted)', fontSize: '15px'
                        }}>
                          {browseFilter === 'upcoming' ? '🗓️ No upcoming events at the moment. Check back soon!' :
                            browseFilter === 'closed' ? '📁 No closed events found.' :
                              '📭 No events available.'}
                        </div>
                      ) : (
                        <div className="event-grid" style={{ marginTop: '20px' }}>
                          {filteredEvents.map((event) => {
                            const isRegistered = registeredEventIds.includes(event._id);
                            const isPast = new Date(event.dateTime || event.fromDate || event.date) < new Date();
                            return (
                              <div key={event._id} className="dash-event-card">
                                <div
                                  className="event-card-header"
                                  style={{
                                    backgroundImage: `url(${getEventImage(event)})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: isPast ? 'grayscale(80%)' : 'none'
                                  }}
                                >
                                  <span className="event-card-club">{event.clubName || 'College Club'}</span>
                                  <span
                                    className="event-card-tag"
                                    style={isPast
                                      ? { background: '#444', color: '#aaa', position: 'absolute', bottom: '12px', left: '12px' }
                                      : { background: 'var(--brand-green-light)', color: 'var(--brand-text-green)', position: 'absolute', bottom: '12px', left: '12px' }
                                    }
                                  >
                                    {isPast ? '🔴 Closed' : '🟢 Upcoming'}
                                  </span>
                                </div>

                                <div className="event-card-content">
                                  <h4 className="event-card-title">{event.title}</h4>
                                  <p className="event-card-desc">{event.description}</p>
                                  <div className="event-card-info-row">
                                    <div className="event-card-info-item"><span>📅</span> {formatEventDateRange(event)}</div>
                                    <div className="event-card-info-item"><span>📍</span> {event.venue || event.location || 'Main Campus'}</div>
                                    <div className="event-card-info-item"><span>👥</span> Capacity: {event.capacity} seats</div>
                                  </div>
                                  {/* Interactive Action Strip */}
                                  <div className="event-interaction-strip" style={{ display: 'flex', gap: '10px', marginBottom: '14px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                                    <button
                                      onClick={() => handleLikeEvent(event._id)}
                                      className={`interaction-icon-btn ${likedEvents.includes(event._id) ? 'liked' : ''}`}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s' }}
                                    >
                                      {likedEvents.includes(event._id) ? '❤️' : '🤍'}
                                      <span style={{ fontSize: '11px', color: '#6b7280' }}>Like</span>
                                    </button>
                                    <button
                                      onClick={() => handleSaveEvent(event._id)}
                                      className={`interaction-icon-btn ${savedEvents.includes(event._id) ? 'saved' : ''}`}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s' }}
                                    >
                                      {savedEvents.includes(event._id) ? '🔖' : '📁'}
                                      <span style={{ fontSize: '11px', color: '#6b7280' }}>Save</span>
                                    </button>
                                    <button
                                      onClick={() => handleShareEvent(event)}
                                      className="interaction-icon-btn"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s' }}
                                    >
                                      🔗
                                      <span style={{ fontSize: '11px', color: '#6b7280' }}>Share</span>
                                    </button>
                                  </div>

                                  <div className="event-card-action-row">
                                    <button
                                      onClick={() => handleViewEventDetails(event)}
                                      className="dash-btn dash-btn-secondary"
                                    >
                                      Details
                                    </button>
                                    <button
                                      disabled={isRegistered || isPast || (event.registrationsCount >= event.maxParticipants)}
                                      onClick={() => (isRegistered || isPast || (event.registrationsCount >= event.maxParticipants)) ? null : navigate(`/register?eventId=${event._id}`)}
                                      className="dash-btn dash-btn-primary"
                                      style={(event.registrationsCount >= event.maxParticipants && !isRegistered && !isPast) ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                                    >
                                      {isPast ? 'Closed' : isRegistered ? '✓ Registered' : (event.registrationsCount >= event.maxParticipants) ? 'Event Full' : 'Register Now'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Student My Registrations Tab */}
                {currentTab === 'registrations' && (
                  <div>
                    <div className="section-header">
                      <h3>My Registered Events</h3>
                    </div>

                    <div className="dash-table-container">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Event Title</th>
                            <th>Date & Time</th>
                            <th>Registration Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentRegistrations.map((reg) => (
                            <tr key={reg.id}>
                              <td
                                style={{ fontWeight: 'bold', color: 'var(--ace-primary, #10b981)', cursor: 'pointer' }}
                                onClick={() => {
                                  const matchingEvent = events.find(e => e._id === reg.eventId || e.title === reg.eventTitle);
                                  if (matchingEvent) {
                                    setSelectedEvent(matchingEvent);
                                    setIsEventDetailModalOpen(true);
                                  } else {
                                    setSelectedEvent({
                                      title: reg.eventTitle,
                                      description: "Detailed description is synced in the system database.",
                                      clubName: "Registered Campus Club",
                                      date: eventsMap.get(reg.eventId)?.date || reg.date,
                                      location: "Campus Venue",
                                      capacity: "N/A"
                                    });
                                    setIsEventDetailModalOpen(true);
                                  }
                                }}
                              >
                                {reg.eventTitle}
                              </td>
                              <td>
                                {formatDate(eventsMap.get(reg.eventId)?.date)}
                              </td>
                              <td>{new Date(reg.date).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${reg.status === 'Approved' || reg.status === 'Registered' || reg.status === 'Checked-in' ? 'badge-success' :
                                  reg.status === 'Rejected' || reg.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                                  }`}>
                                  {reg.status === 'Approved' || reg.status === 'Registered' ? 'Registration Completed' : reg.status === 'Pending' ? 'Pending Registration Confirmation' : reg.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {studentRegistrations.length === 0 && (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                You have not registered for any events yet. Click "Browse Events" to start.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Student My Attendance Tab */}
                {currentTab === 'attendance' && (
                  <div>
                    <div className="section-header">
                      <h3>My Event Attendance & QR Entry</h3>
                    </div>

                    <div className="profile-layout">
                      <div className="profile-card" style={{ padding: '24px', textAlign: 'center' }}>
                        <h3>📷 Scan Event QR Code</h3>
                        <p style={{ fontSize: '13px', color: 'var(--dash-text-muted)', marginBottom: '16px' }}>
                          Use your device camera to scan the organizer's event QR code and log your attendance.
                        </p>

                        <div className="dash-form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Event to Scan</label>
                          <select
                            value={qrScanEventId}
                            onChange={(e) => setQrScanEventId(e.target.value)}
                            className="dash-select"
                            disabled={isScanning}
                          >
                            <option value="">-- Choose Registered Event --</option>
                            {approvedRegistrations.map(reg => (
                              <option key={reg.eventId} value={reg.eventId}>{reg.eventTitle}</option>
                            ))}
                          </select>
                        </div>

                        {isScanning ? (
                          <div style={{ position: 'relative', width: '100%', maxWidth: '320px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--brand-green-light)' }}>
                            <video
                              ref={videoRef}
                              style={{ width: '100%', display: 'block', background: '#000' }}
                              playsInline
                            />
                            <button
                              type="button"
                              onClick={stopScanning}
                              className="dash-btn"
                              style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Stop Scanner
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={startScanning}
                            className="dash-btn dash-btn-primary"
                            style={{ margin: '10px 0' }}
                          >
                            📷 Start Camera Scanner
                          </button>
                        )}

                        {scanStatus && (
                          <div style={{ marginTop: '16px', fontSize: '14px', fontWeight: '500', color: 'var(--brand-green-light)' }}>
                            {scanStatus}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3>Attendance Log</h3>
                        <div className="dash-table-container" style={{ marginTop: '16px' }}>
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Event Title</th>
                                <th>Check-in Status</th>
                                <th>Time logged</th>
                              </tr>
                            </thead>
                            <tbody>
                              {approvedRegistrations.map((reg) => (
                                <tr key={reg.id}>
                                  <td style={{ fontWeight: 'bold' }}>{reg.eventTitle}</td>
                                  <td>
                                    <span className={`badge ${reg.checkedIn ? 'badge-success' : 'badge-warning'}`}>
                                      {reg.checkedIn ? 'Present ✓' : 'Absent / Pending Scan'}
                                    </span>
                                  </td>
                                  <td>
                                    {reg.checkedIn ? formatDate(reg.checkInTime) : '--'}
                                  </td>
                                </tr>
                              ))}
                              {approvedRegistrations.length === 0 && (
                                <tr>
                                  <td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                    No approved registrations found. Attendance is loggable only for approved events.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Student My Certificates Tab */}
                {currentTab === 'certificates' && (
                  <div>
                    <div className="section-header">
                      <h3>Participation & Winners Certificates</h3>
                    </div>

                    <div className="event-grid">
                      {attendedRegistrations.map((reg) => {
                        const hasWinnerResult = Object.entries(results).find(([eventId, val]) => {
                          return eventId === reg.eventId && (val.firstPlace.toLowerCase() === user.name.toLowerCase() || val.secondPlace.toLowerCase() === user.name.toLowerCase() || val.thirdPlace.toLowerCase() === user.name.toLowerCase());
                        });

                        return (
                          <div key={reg.id} className="dash-event-card" style={{ borderLeft: '4px solid var(--brand-green-light)' }}>
                            <div className="event-card-content" style={{ padding: '24px' }}>
                              <span style={{ fontSize: '32px' }}>🏆</span>
                              <h4 className="event-card-title" style={{ marginTop: '10px' }}>{reg.eventTitle}</h4>
                              <p className="event-card-desc">Verified Certificate of Participation</p>
                              {hasWinnerResult && (
                                <span className="badge badge-success" style={{ width: 'fit-content', marginTop: '6px' }}>
                                  Winner Placement Awarded!
                                </span>
                              )}
                              <div style={{ marginTop: '20px' }}>
                                <button
                                  onClick={() => setSelectedCertificate({
                                    eventTitle: reg.eventTitle,
                                    date: eventsMap.get(reg.eventId)?.date || reg.checkInTime,
                                    clubName: eventsMap.get(reg.eventId)?.clubName || 'College Events Club',
                                    isWinner: !!hasWinnerResult
                                  })}
                                  className="dash-btn dash-btn-primary"
                                >
                                  View Certificate
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {attendedRegistrations.length === 0 && (
                        <div style={{ width: '100%', gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'var(--dash-card-bg)', border: '1px dashed var(--dash-border)', borderRadius: '12px' }}>
                          <span style={{ fontSize: '48px' }}>🎓</span>
                          <h4 style={{ color: '#fff', marginTop: '16px' }}>No Certificates Earned Yet</h4>
                          <p style={{ color: 'var(--dash-text-muted)', fontSize: '14px', maxWidth: '400px', margin: '8px auto 0 auto' }}>
                            Certificates are automatically generated after you register, attend, and are checked in at the event venue by the organizer.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Student Announcements Tab */}
                {currentTab === 'announcements' && (
                  <div>
                    <div className="section-header">
                      <h3>Campus & Club Announcements</h3>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      {announcements.map((ann) => (
                        <div key={ann.id} className="announcement-card">
                          <div className="announcement-header">
                            <span className="announcement-title">{ann.title}</span>
                            <span className="announcement-date">{formatDate(ann.date)}</span>
                          </div>
                          <p className="announcement-body">{ann.body}</p>
                          <div className="announcement-author">Posted by: {ann.author}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* -------------------- ORGANIZER DASHBOARD FLOWS -------------------- */}
            {isOrganizer && (
              <>
                {/* 1. Organizer Home Tab */}
                {currentTab === 'home' && (() => {
                  const myCreatedEvents = events.filter(e => String(e.createdBy?._id || e.createdBy) === String(user._id));
                  const myEventRegistrations = registrations.filter(r => myCreatedEvents.some(e => String(e._id) === String(r.eventId)));
                  const myPendingStudentRegistrations = myEventRegistrations.filter(r => r.status === 'Pending');
                  const campusUpcomingEvents = events.filter(e => new Date(e.date || e.dateTime) >= new Date() && e.status === 'Approved');

                  return (
                    <div>
                      <div className="dashboard-summary-banner">
                        <div className="banner-text">
                          <h2>Manage Events & Club Registrations</h2>
                          <p>Organize club events, check student payment screenshots, review registrations, publish results, and track attendee check-ins.</p>
                        </div>
                      </div>

                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-icon">📅</div>
                          <div className="stat-info">
                            <span className="stat-value">{myCreatedEvents.length}</span>
                            <span className="stat-label">My Events Proposed</span>
                          </div>
                        </div>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('registrations')}>
                          <div className="stat-icon">👥</div>
                          <div className="stat-info">
                            <span className="stat-value">{myEventRegistrations.length}</span>
                            <span className="stat-label">Event Registrations</span>
                          </div>
                        </div>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('registrations')}>
                          <div className="stat-icon">⏳</div>
                          <div className="stat-info">
                            <span className="stat-value">{myPendingStudentRegistrations.length}</span>
                            <span className="stat-label">Pending Reviews</span>
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-icon">🏢</div>
                          <div className="stat-info">
                            <span className="stat-value" style={{ fontSize: '15px', wordBreak: 'break-all' }}>{user.clubName || 'General Club'}</span>
                            <span className="stat-label">My Organized Club</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 1: My Proposed Events */}
                      <div className="section-header" style={{ marginTop: '30px' }}>
                        <h3>My Event Proposals</h3>
                      </div>
                      <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                        {myCreatedEvents.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px', background: 'var(--dash-card-bg)', borderRadius: '10px', color: 'var(--dash-text-muted)', border: '1px dashed var(--dash-border)' }}>
                            No events proposed by you yet. Click "Plan New Event" to begin.
                          </div>
                        ) : (
                          <div className="event-grid">
                            {myCreatedEvents.map((event) => {
                              const isPast = new Date(event.date) < new Date();
                              const eventImg = getEventImage(event);
                              return (
                                <div key={event._id} className="dash-event-card">
                                  <div
                                    className="event-card-header"
                                    style={{
                                      backgroundImage: `url(${eventImg})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      filter: isPast ? 'grayscale(80%)' : 'none'
                                    }}
                                  >
                                    <span className="event-card-club">{event.clubName || 'College Club'}</span>
                                    <span
                                      className="event-card-tag"
                                      style={
                                        event.status === 'Approved'
                                          ? { background: 'var(--brand-green-light)', color: 'var(--brand-text-green)', position: 'absolute', bottom: '12px', left: '12px' }
                                          : event.status === 'Denied' || event.status === 'Rejected'
                                            ? { background: '#ef4444', color: '#fff', position: 'absolute', bottom: '12px', left: '12px' }
                                            : event.status === 'Deleted'
                                              ? { background: '#7f1d1d', color: '#fff', position: 'absolute', bottom: '12px', left: '12px' }
                                              : { background: '#f59e0b', color: '#fff', position: 'absolute', bottom: '12px', left: '12px' }
                                      }
                                    >
                                      {event.status || 'Pending Review'}
                                    </span>
                                  </div>
                                  <div className="event-card-content">
                                    <h4 className="event-card-title">{event.title}</h4>
                                    <p className="event-card-desc">{event.description}</p>
                                    <div className="event-card-info-row">
                                      <div className="event-card-info-item">
                                        <span>📅</span> {formatEventDateRange(event)}
                                      </div>
                                      <div className="event-card-info-item">
                                        <span>📍</span> {event.venue || event.location || 'Main Campus'}
                                      </div>
                                      <div className="event-card-info-item">
                                        <span>👥</span> Capacity: {event.capacity} seats
                                      </div>
                                    </div>
                                    {(event.status === 'Rejected' || event.coordinationStatus === 'Denied') && event.rejectedBy && (
                                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                                        ⚠️ Rejected by: {event.rejectedBy.name ? `${event.rejectedBy.name} (${event.rejectedBy.email || 'N/A'})` : 'Faculty'}
                                      </div>
                                    )}
                                    {event.status === 'Deleted' && event.deletedBy && (
                                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                                        🗑️ Deleted by: {event.deletedBy.name ? `${event.deletedBy.name} (${event.deletedBy.email || 'N/A'})` : 'Faculty'}
                                      </div>
                                    )}
                                    <div className="event-card-action-row">
                                      <button
                                        onClick={() => {
                                          setSelectedEvent(event);
                                          setIsEventDetailModalOpen(true);
                                        }}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ flex: 1 }}
                                      >
                                        Details
                                      </button>
                                      <button
                                        onClick={() => setCurrentTab('registrations')}
                                        className="dash-btn dash-btn-primary"
                                        style={{ flex: 1 }}
                                      >
                                        Registrations
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Active / Upcoming Campus Events */}
                      <div className="section-header" style={{ marginTop: '30px' }}>
                        <h3>Upcoming Campus Events</h3>
                      </div>
                      <div style={{ marginTop: '16px', marginBottom: '20px' }}>
                        {campusUpcomingEvents.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px', background: 'var(--dash-card-bg)', borderRadius: '10px', color: 'var(--dash-text-muted)', border: '1px dashed var(--dash-border)' }}>
                            No upcoming approved campus events at the moment.
                          </div>
                        ) : (
                          <div className="event-grid">
                            {campusUpcomingEvents.map((event) => {
                              const eventImg = getEventImage(event);
                              return (
                                <div key={event._id} className="dash-event-card">
                                  <div
                                    className="event-card-header"
                                    style={{
                                      backgroundImage: `url(${eventImg})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                    }}
                                  >
                                    <span className="event-card-club">{event.clubName || 'College Club'}</span>
                                    <span
                                      className="event-card-tag"
                                      style={{ background: 'var(--brand-green-light)', color: 'var(--brand-text-green)', position: 'absolute', bottom: '12px', left: '12px' }}
                                    >
                                      🟢 Active
                                    </span>
                                  </div>
                                  <div className="event-card-content">
                                    <h4 className="event-card-title">{event.title}</h4>
                                    <p className="event-card-desc">{event.description}</p>
                                    <div className="event-card-info-row">
                                      <div className="event-card-info-item">
                                        <span>📅</span> {formatEventDateRange(event)}
                                      </div>
                                      <div className="event-card-info-item">
                                        <span>📍</span> {event.venue || event.location || 'Main Campus'}
                                      </div>
                                    </div>
                                    <div className="event-card-action-row">
                                      <button
                                        onClick={() => {
                                          setSelectedEvent(event);
                                          setIsEventDetailModalOpen(true);
                                        }}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ flex: 1 }}
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button onClick={() => setCurrentTab('event-plan')} className="dash-btn dash-btn-primary">
                          + Plan New Event
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* 2. Organizer Event Plan Form Tab */}
            {currentTab === 'event-plan' && (isOrganizer || isFaculty) && (
              <div>
                    <div className="section-header">
                      <h3>Plan & Publish College Event</h3>
                    </div>

                    <div className="dash-table-container" style={{ padding: '30px' }}>
                      <form onSubmit={handleCreateEvent} className="dash-form">
                        <div className="dash-form-group">
                          <label>Event Title *</label>
                          <input
                            type="text"
                            value={eventForm.title}
                            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (!val.trim()) {
                                e.target.setCustomValidity("Event title is required");
                              } else if (val.length >= 50) {
                                e.target.setCustomValidity("Event title must be less than 50 characters.");
                              } else if (/^\d+$/.test(val)) {
                                e.target.setCustomValidity("Event title cannot contain only numbers.");
                              } else {
                                e.target.setCustomValidity("");
                              }
                              e.target.reportValidity();
                            }}
                            className="dash-input"
                            placeholder="Enter event name (e.g. Codeathon 2026)"
                            required
                          />
                        </div>
                        <div className="dash-form-group">
                          <label>Organizing Club *</label>
                          <input
                            type="text"
                            value={eventForm.clubName}
                            onChange={(e) => setEventForm({ ...eventForm, clubName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (!val.trim()) {
                                e.target.setCustomValidity("Organizing Club is required");
                              } else if (/\d/.test(val)) {
                                e.target.setCustomValidity("Club name cannot contain numbers.");
                              } else {
                                e.target.setCustomValidity("");
                              }
                              e.target.reportValidity();
                            }}
                            className="dash-input"
                            placeholder="e.g. Coding Club"
                            pattern="^[a-zA-Z\s]+$"
                            title="Club name must contain only alphabets and spaces."
                            required
                          />
                        </div>

                        <div className="dash-form-group">
                          <label>Event Description *</label>
                          <textarea
                            value={eventForm.description}
                            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                e.target.setCustomValidity("Event description is required");
                              } else {
                                e.target.setCustomValidity("");
                              }
                              e.target.reportValidity();
                            }}
                            className="dash-textarea"
                            placeholder="Detail event schedule, constraints, criteria, and prize pools..."
                            required
                          ></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div className="dash-form-group" style={{ position: 'relative' }}>
                            <label>From Date & Time *</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="dash-btn dash-btn-outline"
                                onClick={() => {
                                  setIsFromDatePickerOpen(!isFromDatePickerOpen);
                                  setIsToDatePickerOpen(false);
                                }}
                                style={{ flex: 1, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '42px', padding: '0 12px', border: '1px solid var(--dash-border)', borderRadius: '8px', background: 'transparent', color: 'var(--dash-text)' }}
                              >
                                <span>{eventForm.fromDate ? new Date(eventForm.fromDate).toLocaleDateString() : 'Select Date 📅'}</span>
                              </button>
                              <input
                                type="time"
                                value={eventForm.fromTime || ''}
                                onChange={(e) => {
                                  const timeVal = e.target.value;
                                  const dateObj = eventForm.fromDate ? new Date(eventForm.fromDate) : new Date();
                                  if (timeVal) {
                                    const [h, m] = timeVal.split(':');
                                    dateObj.setHours(parseInt(h), parseInt(m), 0, 0);
                                  }
                                  setEventForm({ ...eventForm, fromDate: dateObj.toISOString(), fromTime: timeVal });
                                }}
                                className="dash-input"
                                style={{ width: '120px', height: '42px' }}
                                required
                              />
                            </div>
                            {isFromDatePickerOpen && (
                              <div style={{ position: 'absolute', top: '70px', left: 0, zIndex: 1000, background: '#fff', border: '1.5px solid var(--brand-green-light)', borderRadius: '8px', padding: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', color: '#000' }}>
                                <DayPicker
                                  mode="single"
                                  selected={eventForm.fromDate ? new Date(eventForm.fromDate) : undefined}
                                  onSelect={(day) => {
                                    if (day) {
                                      const dateObj = new Date(day);
                                      if (eventForm.fromTime) {
                                        const [h, m] = eventForm.fromTime.split(':');
                                        dateObj.setHours(parseInt(h), parseInt(m), 0, 0);
                                      } else {
                                        dateObj.setHours(9, 0, 0, 0);
                                      }
                                      setEventForm({ ...eventForm, fromDate: dateObj.toISOString() });
                                    }
                                    setIsFromDatePickerOpen(false);
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="dash-form-group" style={{ position: 'relative' }}>
                            <label>To Date & Time *</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="dash-btn dash-btn-outline"
                                onClick={() => {
                                  setIsToDatePickerOpen(!isToDatePickerOpen);
                                  setIsFromDatePickerOpen(false);
                                }}
                                style={{ flex: 1, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '42px', padding: '0 12px', border: '1px solid var(--dash-border)', borderRadius: '8px', background: 'transparent', color: 'var(--dash-text)' }}
                              >
                                <span>{eventForm.toDate ? new Date(eventForm.toDate).toLocaleDateString() : 'Select Date 📅'}</span>
                              </button>
                              <input
                                type="time"
                                value={eventForm.toTime || ''}
                                onChange={(e) => {
                                  const timeVal = e.target.value;
                                  const dateObj = eventForm.toDate ? new Date(eventForm.toDate) : new Date();
                                  if (timeVal) {
                                    const [h, m] = timeVal.split(':');
                                    dateObj.setHours(parseInt(h), parseInt(m), 0, 0);
                                  }
                                  setEventForm({ ...eventForm, toDate: dateObj.toISOString(), toTime: timeVal });
                                }}
                                className="dash-input"
                                style={{ width: '120px', height: '42px' }}
                                required
                              />
                            </div>
                            {isToDatePickerOpen && (
                              <div style={{ position: 'absolute', top: '70px', left: 0, zIndex: 1000, background: '#fff', border: '1.5px solid var(--brand-green-light)', borderRadius: '8px', padding: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', color: '#000' }}>
                                <DayPicker
                                  mode="single"
                                  selected={eventForm.toDate ? new Date(eventForm.toDate) : undefined}
                                  onSelect={(day) => {
                                    if (day) {
                                      const dateObj = new Date(day);
                                      if (eventForm.toTime) {
                                        const [h, m] = eventForm.toTime.split(':');
                                        dateObj.setHours(parseInt(h), parseInt(m), 0, 0);
                                      } else {
                                        dateObj.setHours(17, 0, 0, 0);
                                      }
                                      setEventForm({ ...eventForm, toDate: dateObj.toISOString() });
                                    }
                                    setIsToDatePickerOpen(false);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          <div className="dash-form-group">
                            <label>Event Mode *</label>
                            <select
                              value={eventForm.mode}
                              onChange={(e) => setEventForm({ ...eventForm, mode: e.target.value })}
                              className="dash-select"
                              required
                            >
                              <option value="offline">Offline / In-Person</option>
                              <option value="online">Online / Virtual</option>
                            </select>
                          </div>
                          <div className="dash-form-group">
                            <label>Registration Type *</label>
                            <select
                              value={eventForm.registrationType}
                              onChange={(e) => setEventForm({ ...eventForm, registrationType: e.target.value })}
                              className="dash-select"
                              required
                            >
                              <option value="solo">Solo Participant</option>
                              <option value="team">Team Registration</option>
                            </select>
                          </div>
                          <div className="dash-form-group">
                            <label>Pricing Type *</label>
                            <select
                              value={eventForm.priceType}
                              onChange={(e) => setEventForm({ ...eventForm, priceType: e.target.value })}
                              className="dash-select"
                              required
                            >
                              <option value="free">Free Entry</option>
                              <option value="paid">Paid Entry</option>
                            </select>
                          </div>
                        </div>

                        {eventForm.priceType === 'paid' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="dash-form-group">
                              <label>UPI ID/Number for Payment *</label>
                              <input
                                type="text"
                                value={eventForm.upiNumber}
                                onChange={(e) => setEventForm({ ...eventForm, upiNumber: e.target.value })}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  const isUpiIdValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val);
                                  const isUpiPhoneValid = /^\d{10}$/.test(val);
                                  if (!val) {
                                    e.target.setCustomValidity("UPI ID or Number is required");
                                  } else if (!isUpiIdValid && !isUpiPhoneValid) {
                                    e.target.setCustomValidity("Please provide a valid UPI ID (e.g., username@bank) or a 10-digit phone number.");
                                  } else {
                                    e.target.setCustomValidity("");
                                  }
                                  e.target.reportValidity();
                                }}
                                className="dash-input"
                                placeholder="UPI ID or 10-digit number"
                                required
                              />
                            </div>
                            <div className="dash-form-group">
                              <label>Entry Fee (Amount per person) *</label>
                              <input
                                type="text"
                                pattern="\d*"
                                value={eventForm.entryFee === 0 ? '' : eventForm.entryFee}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d+$/.test(val)) {
                                    setEventForm({ ...eventForm, entryFee: val === '' ? 0 : parseInt(val, 10) });
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (isNaN(val) || val <= 0) {
                                    e.target.setCustomValidity("Entry fee must be greater than zero for paid events.");
                                  } else {
                                    e.target.setCustomValidity("");
                                  }
                                  e.target.reportValidity();
                                }}
                                className="dash-input"
                                placeholder="Amount in ₹"
                                required
                              />
                            </div>
                          </div>
                        )}

                        <div className="dash-form-group">
                          <label>Venue Location *</label>
                          <input
                            type="text"
                            value={eventForm.location}
                            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                            className="dash-input"
                            placeholder="e.g. Main Auditorium"
                            required
                          />
                        </div>
                        <div className="dash-form-group">
                          <label>Capacity Limit (Attendees) *</label>
                          <input
                            type="number"
                            value={eventForm.capacity}
                            onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (isNaN(val) || val < 1 || val > 1000) {
                                e.target.setCustomValidity("Capacity Limit must be between 1 and 1000 seats.");
                              } else {
                                e.target.setCustomValidity("");
                              }
                              e.target.reportValidity();
                            }}
                            className="dash-input"
                            min="1"
                            max="1000"
                            required
                          />
                        </div>
                        {isOrganizer && (
                          <div className="dash-form-group">
                            <label>Requested Faculty Coordinator (Optional)</label>
                            <select
                              value={eventForm.requestedFaculty}
                              onChange={(e) => setEventForm({ ...eventForm, requestedFaculty: e.target.value })}
                              className="dash-select"
                            >
                              <option value="">-- No Coordinator Request --</option>
                              {facultyList.map((fac) => (
                                <option key={fac._id} value={fac._id}>
                                  {fac.name} ({fac.email})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="dash-form-group">
                          <label>Event Poster Image (Upload or Select Preset Theme)</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEventForm(prev => ({ ...prev, posterUrl: reader.result }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="dash-input"
                            style={{ padding: '8px' }}
                          />
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--dash-text-muted)' }}>
                            Or choose a default design preset design below:
                          </div>
                          <select
                            value={eventForm.imageTheme}
                            onChange={(e) => setEventForm({ ...eventForm, imageTheme: e.target.value, posterUrl: '' })}
                            className="dash-select"
                            style={{ marginTop: '6px' }}
                          >
                            <option value="default">General / Default Poster</option>
                            <option value="hackathon">Coding / Hackathon Theme</option>
                            <option value="robotics">Robotics / Tech Theme</option>
                            <option value="cultural">Cultural / Arts Theme</option>
                            <option value="workshop">Workshop / Seminar Theme</option>
                          </select>
                          {eventForm.posterUrl && (
                            <div style={{ marginTop: '12px' }}>
                              <img
                                src={eventForm.posterUrl}
                                alt="Poster Preview"
                                style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', border: '1px solid var(--dash-border)' }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Dynamic Student Coordinators sub-form */}
                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--dash-border)', paddingTop: '20px', marginBottom: '20px' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--dash-text)' }}>Student Coordinators (Optional)</h4>
                          {studentCoordinators.map((coordinator, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                              <input
                                type="text"
                                value={coordinator.name}
                                onChange={(e) => handleCoordinatorChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                placeholder="Student Name"
                                className="dash-input"
                                style={{ padding: '8px 12px' }}
                                pattern="^[a-zA-Z\s]+$"
                                title="Name must contain only letters and spaces"
                              />
                              <input
                                type="text"
                                value={coordinator.regNo}
                                onChange={(e) => handleCoordinatorChange(idx, 'regNo', e.target.value.replace(/\D/g, ''))}
                                placeholder="Registration No"
                                className="dash-input"
                                style={{ padding: '8px 12px' }}
                                pattern="^\d+$"
                                title="Registration number must contain only numbers"
                              />
                              <select
                                value={coordinator.dept}
                                onChange={(e) => handleCoordinatorChange(idx, 'dept', e.target.value)}
                                className="dash-select"
                                style={{ padding: '8px 12px', fontSize: '13px', background: 'var(--dash-input-bg)', border: '1px solid var(--dash-border)', borderRadius: '8px', width: '100%' }}
                              >
                                <option value="">-- Dept --</option>
                                {DEPARTMENTS.map((dept) => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={coordinator.phone}
                                onChange={(e) => handleCoordinatorChange(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Phone Number"
                                className="dash-input"
                                style={{ padding: '8px 12px' }}
                                pattern="^\d{10}$"
                                maxLength="10"
                                title="Phone number must be exactly 10 digits"
                              />
                              {studentCoordinators.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCoordinator(idx)}
                                  className="dash-btn"
                                  style={{ padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddCoordinator}
                            className="dash-btn"
                            style={{ padding: '8px 14px', background: 'var(--brand-green-light)', color: 'var(--brand-text-green)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                          >
                            + Add Coordinator
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                          <button type="submit" className="dash-btn dash-btn-primary">
                            Publish Event Listing
                          </button>
                          <button type="button" onClick={() => setCurrentTab('home')} className="dash-btn dash-btn-secondary">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

            {isOrganizer && (
              <>
                {/* 3. Organizer Registrations Approval Tab */}
                {currentTab === 'registrations' && (() => {
                  const myCreatedEvents = events.filter(e => String(e.createdBy?._id || e.createdBy) === String(user._id));
                  const myEventRegs = registrations.filter(r => {
                    const matchUserEvent = myCreatedEvents.some(e => String(e._id) === String(getRegEventId(r)));
                    if (!matchUserEvent) return false;
                    if (organizerRegEventId) {
                      return String(getRegEventId(r)) === String(organizerRegEventId);
                    }
                    return true;
                  });

                  return (
                    <div>
                      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <h3>Review Student Registrations</h3>
                        <div className="dash-form-group" style={{ margin: 0, minWidth: '220px' }}>
                          <select
                            value={organizerRegEventId}
                            onChange={(e) => setOrganizerRegEventId(e.target.value)}
                            className="dash-select"
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--dash-border)', background: 'var(--dash-card-bg)', color: 'var(--dash-text)' }}
                          >
                            <option value="">-- All My Events --</option>
                            {myCreatedEvents.map(e => (
                              <option key={e._id} value={e._id}>{e.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="dash-table-container">
                        <table className="dash-table">
                          <thead>
                            <tr>
                              <th>Student Name</th>
                              <th>Reg Number</th>
                              <th>Event Applied</th>
                              <th>Date Applied</th>
                              <th>Payment Status</th>
                              <th>Current Status</th>
                              <th>Attendance</th>
                              <th>Certificate</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myEventRegs.map((reg) => {
                              const ev = events.find(e => e._id === reg.eventId);
                              const priceType = ev ? ev.priceType : 'free';
                              const isPaid = priceType === 'paid';
                              const isVerified = reg.status === 'Registered' || reg.status === 'Checked-in' || reg.paymentVerified;

                              return (
                                <tr key={reg.id}>
                                  <td style={{ fontWeight: 'bold' }}>{reg.studentName}</td>
                                  <td>{reg.studentReg}</td>
                                  <td>{reg.eventTitle}</td>
                                  <td>{new Date(reg.date).toLocaleDateString()}</td>
                                  <td>
                                    {isPaid ? (
                                      <span className={`badge ${isVerified ? 'badge-success' : 'badge-danger'}`}>
                                        {isVerified ? '💰 Paid' : '❌ Not Paid'}
                                      </span>
                                    ) : (
                                      <span className="badge badge-secondary">🆓 Free</span>
                                    )}
                                  </td>
                                  <td>
                                    <span className={`badge ${reg.status === 'Approved' || reg.status === 'Registered' || reg.status === 'Checked-in' ? 'badge-success' :
                                      reg.status === 'Rejected' || reg.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                                      }`}>
                                      {reg.status}
                                    </span>
                                  </td>
                                  <td>
                                    {reg.status === 'Checked-in' ? (
                                      <span className="badge badge-success" style={{ fontWeight: 'bold' }}>
                                        ✅ Attended {reg.checkInTime ? `at ${new Date(reg.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                      </span>
                                    ) : (
                                      <span className="badge badge-secondary" style={{ opacity: 0.7 }}>
                                        ❌ Absent
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input
                                        type="checkbox"
                                        checked={!!reg.certificateApproved}
                                        disabled={reg.status !== 'Checked-in'}
                                        onChange={() => handleToggleCertificateApproval(reg.id)}
                                        style={{ width: '16px', height: '16px', cursor: reg.status === 'Checked-in' ? 'pointer' : 'not-allowed' }}
                                        title={reg.status === 'Checked-in' ? "Approve certificate" : "Student must be checked-in first"}
                                      />
                                      <span style={{ fontSize: '12px', color: reg.status === 'Checked-in' ? 'var(--dash-text)' : 'var(--dash-text-muted)' }}>
                                        {reg.certificateApproved ? 'Approved' : 'Pending'}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      {reg.paymentScreenshot && (
                                        <button
                                          onClick={() => setSelectedScreenshotReg(reg)}
                                          className="dash-btn dash-btn-outline"
                                          style={{ padding: '4px 8px', fontSize: '11px', flex: 'none' }}
                                          title="View payment transaction slip"
                                        >
                                          🔍 View Slip
                                        </button>
                                      )}
                                      {reg.status === 'Pending' ? (
                                        <>
                                          <button
                                            onClick={() => handleUpdateRegistrationStatus(reg.id, 'Registered')}
                                            className="dash-btn dash-btn-primary"
                                            style={{ padding: '4px 8px', fontSize: '11px', flex: 'none' }}
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleUpdateRegistrationStatus(reg.id, 'Rejected')}
                                            className="dash-btn dash-btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '11px', flex: 'none', color: '#ff6b6b' }}
                                          >
                                            Reject
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleUpdateRegistrationStatus(reg.id, 'Pending')}
                                          className="dash-btn dash-btn-outline"
                                          style={{ padding: '4px 8px', fontSize: '11px', flex: 'none' }}
                                        >
                                          Reset
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {myEventRegs.length === 0 && (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                  No student registrations found for your events.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Organizer Approve Events Panel */}
                {currentTab === 'approve-events' && (
                  <div>
                    <div className="section-header">
                      <h3>Approve Proposed Events</h3>
                    </div>

                    <div className="dash-table-container" style={{ padding: '24px' }}>
                      <div className="badge badge-info" style={{ width: '100%', padding: '16px', display: 'flex', borderRadius: '8px', marginBottom: '20px' }}>
                        ℹ️ This admin module manages proposals submitted by minor student chapters before they go public.
                      </div>

                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Proposing Club</th>
                            <th>Proposed Event</th>
                            <th>Proposed Venue</th>
                            <th>Estimated Cost</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Astronomy Club</td>
                            <td>Star Gazing Night 2026</td>
                            <td>Academic Block C Terrace</td>
                            <td>$150</td>
                            <td>
                              <button onClick={() => setActionSuccess('Approved astronomy event proposed.')} className="dash-btn dash-btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                Approve
                              </button>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Gaming League</td>
                            <td>VALORANT Campus Cup</td>
                            <td>CSE Seminar Hall</td>
                            <td>$400</td>
                            <td>
                              <button onClick={() => setActionSuccess('Approved gaming league proposal.')} className="dash-btn dash-btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                Approve
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. Organizer Announcements Creation Tab */}
                {currentTab === 'announcements' && (
                  <div>
                    <div className="section-header">
                      <h3>Announcements Broadcast Feed</h3>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      {announcements.map((ann) => (
                        <div key={ann.id} className="announcement-card">
                          <div className="announcement-header">
                            <span className="announcement-title">{ann.title}</span>
                            <span className="announcement-date">{formatDate(ann.date)}</span>
                          </div>
                          <p className="announcement-body">{ann.body}</p>
                          <div className="announcement-author">Published by: {ann.author}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button onClick={() => setIsCreateAnnouncementModalOpen(true)} className="dash-btn dash-btn-primary">
                        + Post Announcement
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Organizer Staff Tab */}
                {currentTab === 'staff' && (
                  <div>
                    <div className="section-header">
                      <h3>Staff & Volunteer Roster</h3>
                    </div>

                    <div className="dash-table-container" style={{ marginTop: '20px' }}>
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Staff Name</th>
                            <th>Department</th>
                            <th>System Role</th>
                            <th>Contact Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staff.map((s) => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                              <td>{s.dept}</td>
                              <td>
                                <span className={`badge ${s.role.includes('Faculty') || s.role.includes('Coordinator') ? 'badge-success' : 'badge-info'}`}>
                                  {s.role}
                                </span>
                              </td>
                              <td>{s.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button onClick={() => setIsAddStaffModalOpen(true)} className="dash-btn dash-btn-primary">
                        + Add Staff/Volunteer
                      </button>
                    </div>
                  </div>
                )}



                {/* 8. Organizer QR Attendance Simulation Tab */}
                {currentTab === 'attendance' && (
                  <div>
                    <div className="section-header">
                      <h3>QR Code Attendance Scanning</h3>
                    </div>

                    <div className="profile-layout">
                      <div className="profile-card">
                        <h3>Mock QR Scanner</h3>
                        <div className="qr-scanner-camera-feed" style={{ marginTop: '20px' }}>
                          <div className="scanner-laser"></div>
                          <span style={{ fontSize: '32px' }}>📷</span>
                          <span className="viewfinder-text">Position QR ticket code within grid...</span>
                        </div>
                      </div>

                      <div className="dash-table-container" style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>Scan Input Simulator</h3>

                        <div className="dash-form">
                          <div className="dash-form-group">
                            <label>1. Select Event</label>
                            <select
                              value={qrScanEventId}
                              onChange={(e) => setQrScanEventId(e.target.value)}
                              className="dash-select"
                            >
                              <option value="">-- Choose Event --</option>
                              {events.map(ev => (
                                <option key={ev._id} value={ev._id}>{ev.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="dash-form-group">
                            <label>2. Scan Registration Number / Name</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                value={qrScanStudentReg}
                                onChange={(e) => setQrScanStudentReg(e.target.value)}
                                className="dash-input"
                                placeholder="Scan/Type Reg. No (e.g. 21CSR01) or Name"
                              />
                              <button
                                onClick={() => handleCheckInSimulate()}
                                className="dash-btn dash-btn-primary"
                                style={{ flex: 'none', width: 'auto' }}
                              >
                                Trigger Scan
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Scanner Simulated Quick Action Toggles */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--dash-border)', paddingTop: '16px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--dash-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                            Quick Simulation Profiles:
                          </span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {registrations.filter(r => r.eventId === qrScanEventId && !r.checkedIn).map(reg => (
                              <button
                                key={reg.id}
                                onClick={() => handleCheckInSimulate(reg.studentReg, qrScanEventId)}
                                className="dash-btn dash-btn-outline"
                                style={{ padding: '6px 12px', fontSize: '11px', width: 'auto', flex: 'none' }}
                              >
                                Scan ticket: {reg.studentName} ({reg.studentReg})
                              </button>
                            ))}
                            {registrations.filter(r => r.eventId === qrScanEventId && !r.checkedIn).length === 0 && (
                              <p style={{ fontSize: '12px', color: 'var(--dash-text-muted)', margin: 0 }}>
                                (Select an event with pending approved registrations to view quick profiles)
                              </p>
                            )}
                          </div>
                        </div>

                        {qrScanResult && (
                          <div className={qrScanResult.success ? 'scan-success' : 'scan-error'} style={{ marginTop: '20px', color: '#fff' }}>
                            <h4 style={{ margin: '0 0 6px 0' }}>{qrScanResult.success ? '✓ Scan Accepted' : '❌ Scan Error'}</h4>
                            <p style={{ margin: 0, fontSize: '13px' }}>{qrScanResult.message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Organizer Attendance Checklist Tab */}
                {currentTab === 'attendance-list' && (
                  <div>
                    <div className="section-header">
                      <h3>Manual Attendance Checklist</h3>
                    </div>

                    <div className="dash-table-container" style={{ padding: '24px' }}>
                      <div className="dash-form-group" style={{ maxWidth: '400px', marginBottom: '20px' }}>
                        <label>Select Event Roster</label>
                        <select
                          value={qrScanEventId}
                          onChange={(e) => setQrScanEventId(e.target.value)}
                          className="dash-select"
                        >
                          <option value="">-- Select Event --</option>
                          {events.map(ev => (
                            <option key={ev._id} value={ev._id}>{ev.title}</option>
                          ))}
                        </select>
                      </div>

                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Reg. Number</th>
                            <th>Email</th>
                            <th>Attendance Checked</th>
                            <th>Timestamp Logged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.filter(r => r.eventId === qrScanEventId).map((reg) => (
                            <tr key={reg.id}>
                              <td style={{ fontWeight: 'bold' }}>{reg.studentName}</td>
                              <td>{reg.studentReg}</td>
                              <td>{reg.studentEmail}</td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={reg.checkedIn}
                                  onChange={() => handleToggleAttendanceCheck(reg.id)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ marginLeft: '8px', fontSize: '12px', verticalAlign: 'super' }}>
                                  {reg.checkedIn ? 'Present' : 'Absent'}
                                </span>
                              </td>
                              <td>{reg.checkedIn ? formatDate(reg.checkInTime) : '--'}</td>
                            </tr>
                          ))}
                          {(!qrScanEventId) && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                Please select an event to view its attendee checklist.
                              </td>
                            </tr>
                          )}
                          {qrScanEventId && registrations.filter(r => r.eventId === qrScanEventId).length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                No student registrations approved for this event.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 10. Organizer Result Entry Tab */}
                {currentTab === 'result-entry' && (
                  <div>
                    <div className="section-header">
                      <h3>Announce Competition Winners</h3>
                    </div>

                    <div className="dash-table-container" style={{ marginTop: '20px' }}>
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Event Name</th>
                            <th>🥇 1st Place</th>
                            <th>🥈 2nd Place</th>
                            <th>🥉 3rd Place</th>
                            <th>Date Published</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(results).map(([eventId, val]) => (
                            <tr key={eventId}>
                              <td style={{ fontWeight: 'bold' }}>
                                {events.find(e => e._id === eventId)?.title || 'Hackathon / Event'}
                              </td>
                              <td><span style={{ fontSize: '14px' }}>🥇</span> {val.firstPlace}</td>
                              <td><span style={{ fontSize: '14px' }}>🥈</span> {val.secondPlace}</td>
                              <td><span style={{ fontSize: '14px' }}>🥉</span> {val.thirdPlace}</td>
                              <td>{new Date(val.datePublished).toLocaleDateString()}</td>
                            </tr>
                          ))}
                          {Object.keys(results).length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                No winners results announced yet. Click "Publish Winners Result" to begin.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button onClick={() => setIsResultEntryModalOpen(true)} className="dash-btn dash-btn-primary">
                        Publish Winners Result
                      </button>
                    </div>
                  </div>
                )}

                {/* 11. Organizer Report Menu Tab */}
                {currentTab === 'report-menu' && (() => {
                  const myCreatedEvents = events.filter(e => String(e.createdBy?._id || e.createdBy) === String(user._id));
                  const myEventRegs = registrations.filter(r => myCreatedEvents.some(e => String(e._id) === String(getRegEventId(r))));
                  const selectedEventId = qrScanEventId;
                  const currentEventRegs = selectedEventId
                    ? registrations.filter(r => getRegEventId(r) === selectedEventId)
                    : myEventRegs;
                  const attended = currentEventRegs.filter(r => r.checkedIn).length;
                  const rate = currentEventRegs.length > 0 ? Math.round((attended / currentEventRegs.length) * 100) : 0;
                  const pending = currentEventRegs.filter(r => r.status === 'Pending').length;

                  return (
                    <div>
                      <div className="section-header">
                        <h3>Event Reports & Analytics</h3>
                      </div>

                      <div className="profile-layout">
                        <div className="profile-card">
                          <h3>Report Filters</h3>

                          <div className="dash-form" style={{ marginTop: '16px' }}>
                            <div className="dash-form-group">
                              <label>Select Event</label>
                              <select
                                value={qrScanEventId}
                                onChange={(e) => setQrScanEventId(e.target.value)}
                                className="dash-select"
                              >
                                <option value="">-- All My Events --</option>
                                {myCreatedEvents.map(ev => (
                                  <option key={ev._id} value={ev._id}>{ev.title}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                              <button onClick={() => handleExportReport('xlsx')} className="dash-btn dash-btn-primary">
                                📊 Export Excel
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="dash-table-container" style={{ padding: '24px', flexGrow: 1 }}>
                          <h3>Report Metrics</h3>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                            <div
                              onClick={() => setCurrentTab('registrations')}
                              style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Total Registrations</span>
                              <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                                {currentEventRegs.filter(r => r.status !== 'Pending' && r.status !== 'Cancelled' && r.status !== 'Rejected').length}
                              </h4>
                            </div>
                            <div
                              onClick={() => setCurrentTab('registrations')}
                              style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Attendance Count</span>
                              <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                                {attended}
                              </h4>
                            </div>
                            <div
                              onClick={() => setCurrentTab('registrations')}
                              style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Attendance Rate</span>
                              <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                                {rate}%
                              </h4>
                            </div>
                            <div
                              onClick={() => setCurrentTab('registrations')}
                              style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Pending Approvals</span>
                              <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                                {pending}
                              </h4>
                            </div>
                          </div>

                          <div className="dash-table-container" style={{ marginTop: '24px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px 0' }}>Event Details</h4>
                            <table className="dash-table">
                              <thead>
                                <tr>
                                  <th>Event Name</th>
                                  <th>Date</th>
                                  <th>Total Regs</th>
                                  <th>Attended</th>
                                  <th>Attend %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedEventId ? myCreatedEvents.filter(e => e._id === selectedEventId) : myCreatedEvents).map((event) => {
                                  const evRegs = registrations.filter(r => r.eventId === event._id);
                                  const att = evRegs.filter(r => r.checkedIn).length;
                                  const pct = evRegs.length > 0 ? Math.round((att / evRegs.length) * 100) : 0;
                                  return (
                                    <tr key={event._id}>
                                      <td style={{ fontWeight: 'bold' }}>{event.title}</td>
                                      <td>{formatDate(event.date).split(' at')[0]}</td>
                                      <td>{evRegs.length}</td>
                                      <td>{att}</td>
                                      <td>{pct}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* -------------------- FACULTY DASHBOARD FLOWS -------------------- */}
            {isFaculty && (
              <>
                {/* 1. Faculty Home Tab */}
                {currentTab === 'home' && (
                  <div>
                    <div className="faculty-summary-banner">
                      <div className="banner-text">
                        <h2>{user.role === 'admin' ? 'Admin' : 'Faculty'} Event Management Dashboard</h2>
                        <p>Oversee student participation, manage events, monitor attendance, and generate comprehensive reports.</p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="stats-grid">
                      <div className="stat-card faculty-stat-card" onClick={() => setCurrentTab('faculty-events')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon">📅</div>
                        <div className="stat-info">
                          <span className="stat-value">{events.filter(e => e.status === 'Approved' && new Date(e.dateTime || e.date) >= new Date()).length}</span>
                          <span className="stat-label">Active Events</span>
                        </div>
                      </div>
                      <div className="stat-card faculty-stat-card" onClick={() => setCurrentTab('faculty-registrations')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                          <span className="stat-value">{registrations.length}</span>
                          <span className="stat-label">Total Registrations</span>
                        </div>
                      </div>
                      {user.role === 'admin' ? (
                        <div className="stat-card faculty-stat-card" onClick={() => setCurrentTab('manage-faculty')} style={{ cursor: 'pointer' }}>
                          <div className="stat-icon">🎓</div>
                          <div className="stat-info">
                            <span className="stat-value">{facultyList.length}</span>
                            <span className="stat-label">Faculty Accounts</span>
                          </div>
                        </div>
                      ) : (
                        <div className="stat-card faculty-stat-card" style={{ opacity: 0.5, cursor: 'default' }}>
                          <div className="stat-icon">🛡️</div>
                          <div className="stat-info">
                            <span className="stat-value">0</span>
                            <span className="stat-label">No Approvals Needed</span>
                          </div>
                        </div>
                      )}
                      <div className="stat-card faculty-stat-card" onClick={() => setCurrentTab('faculty-registrations')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                          <span className="stat-value">
                            {registrations.filter(r => r.checkedIn).length}
                          </span>
                          <span className="stat-label">Checked In</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Approvals Card */}
                    {/* Current Events List */}
                    <div className="section-header" style={{ marginTop: '32px', marginBottom: '20px' }}>
                      <h3>Current Events</h3>
                    </div>

                    <div className="dash-table-container">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Event Name</th>
                            <th>Club</th>
                            <th>Date</th>
                            <th>Venue</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.filter(e => e.status === 'Approved').slice(0, 5).map((event) => (
                            <tr key={event._id}>
                              <td style={{ fontWeight: 'bold' }}>{event.title}</td>
                              <td>{event.clubName}</td>
                              <td>{formatDate(event.date)}</td>
                              <td>{event.venue || event.location || 'Main Campus'}</td>
                              <td>
                                <span className="badge badge-success">🟢 Active</span>
                              </td>
                            </tr>
                          ))}
                          {events.filter(e => e.status === 'Approved').length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                No active events found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. Faculty Event Page Tab */}
                {currentTab === 'faculty-events' && (() => {
                  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
                  const closedEvents = events.filter(e => new Date(e.date) < new Date());
                  const filteredEvents =
                    browseFilter === 'upcoming' ? upcomingEvents :
                      browseFilter === 'closed' ? closedEvents : events;

                  const sortedEvents = [...filteredEvents].sort((a, b) => {
                    const aDeleted = a.status === 'Deleted' ? 1 : 0;
                    const bDeleted = b.status === 'Deleted' ? 1 : 0;
                    if (aDeleted !== bDeleted) {
                      return aDeleted - bDeleted;
                    }
                    return new Date(b.date) - new Date(a.date);
                  });

                  return (
                    <div>
                      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <h3>College Events</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className={`filter-btn ${browseFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('all')}
                          >
                            All Events ({events.length})
                          </button>
                          <button
                            className={`filter-btn ${browseFilter === 'upcoming' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('upcoming')}
                          >
                            🟢 Upcoming ({upcomingEvents.length})
                          </button>
                          <button
                            className={`filter-btn ${browseFilter === 'closed' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('closed')}
                          >
                            🔴 Closed ({closedEvents.length})
                          </button>
                        </div>
                      </div>

                      <div className="event-grid" style={{ marginTop: '20px' }}>
                        {sortedEvents.map((event) => {
                          const isPast = new Date(event.date) < new Date();
                          const eventRegs = registrations.filter(r => r.eventId === event._id);
                          const eventImg = getEventImage(event);
                          return (
                            <div key={event._id} className="dash-event-card faculty-event-card">
                              <div
                                className="event-card-header"
                                style={{
                                  backgroundImage: `url("${eventImg}")`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  filter: isPast ? 'grayscale(80%)' : 'none'
                                }}
                              >
                                <span className="event-card-club">{event.clubName}</span>
                                <span
                                  className="event-card-tag"
                                  style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '12px',
                                    background: event.status === 'Approved' ? 'var(--brand-green-light)' : event.status === 'Rejected' ? '#fee2e2' : event.status === 'Deleted' ? '#f3f4f6' : '#fef3c7',
                                    color: event.status === 'Approved' ? 'var(--brand-text-green)' : event.status === 'Rejected' ? '#ef4444' : event.status === 'Deleted' ? '#4b5563' : '#b45309'
                                  }}
                                >
                                  {event.status === 'Approved' ? '🟢 Approved' : event.status === 'Rejected' ? '🔴 Rejected' : event.status === 'Deleted' ? `🗑️ Deleted by ${event.deletedBy?.name || 'Staff'}` : '⏳ Pending'}
                                </span>
                              </div>

                              <div className="event-card-content">
                                <h4 className="event-card-title">{event.title}</h4>
                                <p className="event-card-desc">{event.description}</p>
                                <div className="event-card-info-row">
                                  <div className="event-card-info-item"><span>📅</span> {formatEventDateRange(event)}</div>
                                  <div className="event-card-info-item"><span>📍</span> {event.venue || event.location || 'Main Campus'}</div>
                                  <div className="event-card-info-item"><span>👥</span> {eventRegs.length} registered</div>
                                </div>
                                <div style={{ fontSize: '12.5px', color: 'var(--dash-text-muted)', marginTop: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>👤</span> <strong>Created by:</strong> {event.createdBy?.name || 'Staff'} ({event.createdBy?.role || 'faculty'})
                                </div>
                                <div className="event-card-action-row" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <button
                                    onClick={() => { setSelectedEvent(event); setIsEventDetailModalOpen(true); }}
                                    className="dash-btn dash-btn-secondary"
                                    style={{ flex: 1 }}
                                  >
                                    View Details
                                  </button>
                                  {(isAdmin || String(event.createdBy?._id || event.createdBy) === String(user?._id)) && (
                                    event.status === 'Deleted' ? (
                                      <button
                                        onClick={() => handlePermanentDeleteEvent(event._id)}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ flex: 'none', color: '#ff4d4d', backgroundColor: '#ffe6e6', border: '1px solid #ff4d4d' }}
                                      >
                                        Permanent Delete
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleDeleteEvent(event._id)}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ flex: 'none', color: '#ff6b6b', border: '1px solid #ff6b6b' }}
                                      >
                                        Delete
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Faculty Student Registrations Tab */}
                {currentTab === 'faculty-registrations' && (
                  <div>
                    <div className="section-header">
                      <h3>Student Event Registrations</h3>
                    </div>

                    <div className="dash-table-container" style={{ marginBottom: '20px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                      <div className="dash-form-group" style={{ maxWidth: '400px', flex: 1, margin: 0 }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Filter by Event</label>
                        <select
                          value={qrScanEventId}
                          onChange={(e) => setQrScanEventId(e.target.value)}
                          className="dash-select"
                        >
                          <option value="">-- All Events --</option>
                          {events.map(ev => (
                            <option key={ev._id} value={ev._id}>{ev.title}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentTab('faculty-reports');
                        }}
                        className="dash-btn dash-btn-primary"
                        style={{ height: '42px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        📊 Generate Report
                      </button>
                    </div>

                    {/* Stats for selected event or all events combined */}
                    <div className="stats-grid" style={{ marginBottom: '24px' }}>
                      <div className="stat-card faculty-stat-card">
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                          <span className="stat-value">
                            {qrScanEventId
                              ? registrations.filter(r => r.eventId === qrScanEventId).length
                              : registrations.length}
                          </span>
                          <span className="stat-label">Total Registered</span>
                        </div>
                      </div>
                      <div className="stat-card faculty-stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                          <span className="stat-value">
                            {qrScanEventId
                              ? registrations.filter(r => r.eventId === qrScanEventId && r.checkedIn).length
                              : registrations.filter(r => r.checkedIn).length}
                          </span>
                          <span className="stat-label">Attended</span>
                        </div>
                      </div>
                      <div className="stat-card faculty-stat-card">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-info">
                          <span className="stat-value">
                            {qrScanEventId
                              ? registrations.filter(r => r.eventId === qrScanEventId && r.status === 'Pending').length
                              : registrations.filter(r => r.status === 'Pending').length}
                          </span>
                          <span className="stat-label">Pending Approval</span>
                        </div>
                      </div>
                    </div>

                    <div className="dash-table-container">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Reg. Number</th>
                            <th>Email</th>
                            <th>Event</th>
                            <th>Payment</th>
                            <th>Status</th>
                            <th>Attended</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(qrScanEventId
                            ? registrations.filter(r => r.eventId === qrScanEventId)
                            : registrations).map((reg) => {
                              const ev = events.find(e => e._id === reg.eventId);
                              const priceType = ev ? ev.priceType : 'free';
                              const isPaid = priceType === 'paid';
                              const isVerified = reg.status === 'Registered' || reg.status === 'Checked-in' || reg.paymentVerified;

                              return (
                                <tr key={reg.id}>
                                  <td style={{ fontWeight: 'bold' }}>{reg.studentName}</td>
                                  <td>{reg.studentReg}</td>
                                  <td>{reg.studentEmail}</td>
                                  <td
                                    style={{ fontWeight: 'bold', color: 'var(--ace-primary, #10b981)', cursor: 'pointer' }}
                                    onClick={() => {
                                      const matchingEvent = events.find(e => e._id === reg.eventId || e.title === reg.eventTitle);
                                      if (matchingEvent) {
                                        setSelectedEvent(matchingEvent);
                                        setIsEventDetailModalOpen(true);
                                      } else {
                                        setSelectedEvent({
                                          title: reg.eventTitle,
                                          description: "Detailed description is synced in the database.",
                                          clubName: "Campus Club",
                                          date: reg.date,
                                          location: "Campus Venue",
                                          capacity: "N/A"
                                        });
                                        setIsEventDetailModalOpen(true);
                                      }
                                    }}
                                  >
                                    {reg.eventTitle}
                                  </td>
                                  <td>
                                    {isPaid ? (
                                      <span className={`badge ${isVerified ? 'badge-success' : 'badge-danger'}`}>
                                        {isVerified ? '💰 Paid' : '❌ Not Paid'}
                                      </span>
                                    ) : (
                                      <span className="badge badge-secondary">🆓 Free</span>
                                    )}
                                  </td>
                                  <td>
                                    <span className={`badge ${reg.status === 'Approved' || reg.status === 'Registered' || reg.status === 'Checked-in' ? 'badge-success' :
                                      reg.status === 'Rejected' || reg.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                                      }`}>
                                      {reg.status}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <input
                                        type="checkbox"
                                        checked={reg.checkedIn}
                                        onChange={() => handleToggleAttendanceCheck(reg.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        title="Mark attendance"
                                      />
                                      {reg.paymentScreenshot && (
                                        <button
                                          onClick={() => setSelectedScreenshotReg(reg)}
                                          className="dash-btn dash-btn-outline"
                                          style={{ padding: '2px 6px', fontSize: '10px', flex: 'none' }}
                                          title="View payment transaction slip"
                                        >
                                          🔍 View Slip
                                        </button>
                                      )}
                                      {isAdmin && (
                                        <button
                                          onClick={() => setSelectedStudentDetail(reg)}
                                          className="dash-btn dash-btn-outline"
                                          style={{ padding: '2px 6px', fontSize: '10px', flex: 'none', borderColor: '#3b82f6', color: '#3b82f6' }}
                                          title="View full student profile details"
                                        >
                                          👤 View Info
                                        </button>
                                      )}
                                      {reg.status === 'Pending' ? (
                                        <>
                                          <button
                                            onClick={() => handleUpdateRegistrationStatus(reg.id, 'Registered')}
                                            className="dash-btn dash-btn-primary"
                                            style={{ padding: '2px 6px', fontSize: '10px', flex: 'none' }}
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleUpdateRegistrationStatus(reg.id, 'Rejected')}
                                            className="dash-btn"
                                            style={{ padding: '2px 6px', fontSize: '10px', flex: 'none', color: '#ff6b6b', border: '1px solid #ff6b6b' }}
                                          >
                                            Reject
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleUpdateRegistrationStatus(reg.id, 'Pending')}
                                          className="dash-btn dash-btn-outline"
                                          style={{ padding: '2px 6px', fontSize: '10px', flex: 'none' }}
                                        >
                                          Reset
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteRegistration(reg.id)}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ padding: '2px 6px', fontSize: '10px', color: '#ff6b6b', border: '1px solid #ff6b6b', flex: 'none' }}
                                        title="Delete Registration"
                                      >
                                        Remove Reg
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(reg.studentId, 'student')}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ padding: '2px 6px', fontSize: '10px', color: '#dc2626', border: '1px solid #dc2626', flex: 'none' }}
                                        title="Delete Student Account"
                                      >
                                        Revoke Access
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {registrations.length === 0 && (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                No student registrations found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Faculty Approve Events Tab */}
                {currentTab === 'faculty-approve' && (
                  <div>
                    <div className="section-header">
                      <h3>Event Approval Panel</h3>
                    </div>
                    {/* Coordination Requests Section */}
                    {events.filter(e => String(e.requestedFaculty?._id || e.requestedFaculty) === String(user._id) && e.coordinationStatus === 'Pending').length > 0 && (
                      <div style={{ marginBottom: '30px' }}>
                        <div className="section-header" style={{ marginBottom: '14px' }}>
                          <h4 style={{ color: 'var(--brand-green-light)', fontSize: '16px', fontWeight: 'bold' }}>⚡ Coordination Requests Assigned to You</h4>
                        </div>
                        <div className="dash-table-container" style={{ border: '1.5px solid var(--brand-green-light)' }}>
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Event Name</th>
                                <th>Club/Dept</th>
                                <th>Organizer</th>
                                <th>Date & Time</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {events.filter(e => String(e.requestedFaculty?._id || e.requestedFaculty) === String(user._id) && e.coordinationStatus === 'Pending').map((event) => (
                                <tr key={event._id}>
                                  <td
                                    style={{ fontWeight: 'bold', color: 'var(--brand-green-light)', cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={() => setSelectedApprovalEvent(event)}
                                  >
                                    {event.title}
                                  </td>
                                  <td>{event.clubName || event.category}</td>
                                  <td>
                                    <div>{event.createdBy?.name || 'N/A'}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)' }}>{event.createdBy?.email}</div>
                                  </td>
                                  <td>{formatDate(event.date || event.dateTime)}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        className="dash-btn dash-btn-primary"
                                        onClick={() => handleUpdateCoordination(event._id, 'Accepted')}
                                        style={{ padding: '4px 10px', fontSize: '11px' }}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        className="dash-btn"
                                        onClick={() => handleUpdateCoordination(event._id, 'Denied')}
                                        style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                                      >
                                        Deny
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="section-header" style={{ marginBottom: '14px' }}>
                      <h3>General Event Approvals</h3>
                    </div>

                    <div className="dash-table-container">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Event Name</th>
                            <th>Club</th>
                            <th>Date</th>
                            <th>Venue</th>
                            <th>Capacity</th>
                            <th>Coordination</th>
                            <th>Approval Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((event) => {
                            const currentStatus = event.status || 'Pending Review';
                            if (browseFilter !== 'all') {
                              if (browseFilter === 'pending' && currentStatus !== 'Pending Review' && currentStatus !== 'Pending') return null;
                              if (browseFilter === 'approved' && currentStatus !== 'Approved') return null;
                              if (browseFilter === 'rejected' && currentStatus !== 'Rejected') return null;
                            }

                            return (
                              <tr key={event._id}>
                                <td style={{ fontWeight: 'bold' }}>{event.title}</td>
                                <td>{event.clubName}</td>
                                <td>{formatDate(event.date)}</td>
                                <td>{event.location}</td>
                                <td>{event.capacity}</td>
                                <td>
                                  {event.requestedFaculty ? (
                                    <span className={`badge ${event.coordinationStatus === 'Accepted' ? 'badge-success' : event.coordinationStatus === 'Denied' ? 'badge-danger' : 'badge-warning'}`}>
                                      {String(event.requestedFaculty?._id || event.requestedFaculty) === String(user._id) ? 'You: ' : ''}
                                      {event.coordinationStatus || 'Pending'}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>None Requested</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${currentStatus === 'Approved' ? 'badge-success' :
                                    currentStatus === 'Rejected' ? 'badge-danger' : 'badge-warning'
                                    }`}>
                                    {currentStatus}
                                  </span>
                                </td>
                                <td style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => setSelectedApprovalEvent(event)}
                                    className="dash-btn dash-btn-outline"
                                    style={{ padding: '4px 8px', fontSize: '10px', flex: 'none' }}
                                  >
                                    Details
                                  </button>
                                  {(currentStatus === 'Pending Review' || currentStatus === 'Pending') && (
                                    <>
                                      <button
                                        onClick={() => handleApproveRejectEvent(event._id, 'Approved')}
                                        className="dash-btn dash-btn-primary"
                                        style={{ padding: '4px 8px', fontSize: '10px', flex: 'none' }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleApproveRejectEvent(event._id, 'Rejected')}
                                        className="dash-btn dash-btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '10px', flex: 'none', color: '#ff6b6b' }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Faculty Approve Organizers Tab */}
                {currentTab === 'faculty-approve-organizer' && (() => {
                  const pendingOrgs = organizers.filter(o => !o.isApproved);
                  const activeOrgs = organizers.filter(o => o.isApproved);
                  const filteredOrgs = browseFilter === 'pending' ? pendingOrgs : browseFilter === 'approved' ? activeOrgs : organizers;

                  return (
                    <div>
                      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <h3>Organizer Accounts Review</h3>
                        <div className="filter-tabs">
                          <button
                            className={`filter-btn ${browseFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('all')}
                          >
                            All ({organizers.length})
                          </button>
                          <button
                            className={`filter-btn ${browseFilter === 'pending' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('pending')}
                          >
                            ⏳ Pending ({pendingOrgs.length})
                          </button>
                          <button
                            className={`filter-btn ${browseFilter === 'approved' ? 'active' : ''}`}
                            onClick={() => setBrowseFilter('approved')}
                          >
                            ✅ Approved ({activeOrgs.length})
                          </button>
                        </div>
                      </div>

                      <div className="dash-table-container" style={{ marginTop: '20px' }}>
                        <table className="dash-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Club Name</th>
                              <th>Mobile</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrgs.map((org) => (
                              <tr key={org._id}>
                                <td>
                                  <button
                                    onClick={() => {
                                      setSelectedOrganizer(org);
                                      setIsOrganizerModalOpen(true);
                                    }}
                                    className="dash-link-btn"
                                    style={{ background: 'none', border: 'none', color: 'var(--brand-green-light)', cursor: 'pointer', padding: 0, fontWeight: 'bold', textDecoration: 'underline' }}
                                  >
                                    {org.name}
                                  </button>
                                </td>
                                <td>{org.email}</td>
                                <td>{org.clubName || 'N/A'}</td>
                                <td>{org.mobileNumber || 'N/A'}</td>
                                <td>
                                  <span className={`badge ${org.isApproved ? 'badge-success' : 'badge-warning'}`}>
                                    {org.isApproved ? 'Approved' : 'Pending Approval'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    {!org.isApproved && (
                                      <button
                                        onClick={() => handleApproveOrganizer(org._id)}
                                        className="dash-btn dash-btn-primary"
                                        style={{ padding: '4px 8px', fontSize: '11px', width: 'auto', flex: 'none' }}
                                      >
                                        Approve
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteUser(org._id, 'organizer')}
                                      className="dash-btn dash-btn-secondary"
                                      style={{ padding: '4px 8px', fontSize: '11px', color: '#ff6b6b', border: '1px solid #ff6b6b', flex: 'none' }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredOrgs.length === 0 && (
                              <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                  No organizer accounts found matching filter.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Faculty Announcements Tab */}
                {currentTab === 'faculty-announcements' && (
                  <div>
                    <div className="section-header">
                      <h3>Campus Announcements</h3>
                      <button onClick={() => setIsCreateAnnouncementModalOpen(true)} className="dash-btn dash-btn-primary" style={{ width: 'auto' }}>
                        + Create Announcement
                      </button>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      {announcements.map((ann) => (
                        <div key={ann.id} className="announcement-card">
                          <div className="announcement-header">
                            <span className="announcement-title">{ann.title}</span>
                            <span className="announcement-date">{formatDate(ann.date)}</span>
                          </div>
                          <p className="announcement-body">{ann.body}</p>
                          <div className="announcement-author">Posted by: {ann.author}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Faculty Attendance Tab */}
                {currentTab === 'faculty-attendance' && (
                  <div>
                    <div className="section-header">
                      <h3>QR Attendance Management</h3>
                    </div>

                    <div className="profile-layout">
                      <div className="profile-card">
                        <h3>QR Scanner</h3>
                        <div className="qr-scanner-camera-feed" style={{ marginTop: '20px' }}>
                          <div className="scanner-laser"></div>
                          <span style={{ fontSize: '32px' }}>📷</span>
                          <span className="viewfinder-text">Position QR code within grid...</span>
                        </div>
                      </div>

                      <div className="dash-table-container" style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>Mark Attendance</h3>

                        <div className="dash-form">
                          <div className="dash-form-group">
                            <label>Select Event</label>
                            <select
                              value={qrScanEventId}
                              onChange={(e) => setQrScanEventId(e.target.value)}
                              className="dash-select"
                            >
                              <option value="">-- Choose Event --</option>
                              {events.map(ev => (
                                <option key={ev._id} value={ev._id}>{ev.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="dash-form-group">
                            <label>Student Registration / Name</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                value={qrScanStudentReg}
                                onChange={(e) => setQrScanStudentReg(e.target.value)}
                                className="dash-input"
                                placeholder="Enter Reg. No or Student Name"
                              />
                              <button
                                onClick={() => handleCheckInSimulate()}
                                className="dash-btn dash-btn-primary"
                                style={{ flex: 'none', width: 'auto' }}
                              >
                                Scan
                              </button>
                            </div>
                          </div>
                        </div>

                        {qrScanResult && (
                          <div className={qrScanResult.success ? 'scan-success' : 'scan-error'} style={{ marginTop: '20px', color: '#fff', padding: '12px', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 6px 0' }}>{qrScanResult.success ? '✓ Check-in Successful' : '❌ Check-in Failed'}</h4>
                            <p style={{ margin: 0, fontSize: '13px' }}>{qrScanResult.message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Faculty Reports Tab */}
                {currentTab === 'faculty-reports' && (
                  <div>
                    <div className="section-header">
                      <h3>Event Reports & Analytics</h3>
                    </div>

                    <div className="profile-layout">
                      <div className="profile-card">
                        <h3>Report Filters</h3>

                        <div className="dash-form" style={{ marginTop: '16px' }}>
                          <div className="dash-form-group">
                            <label>Select Event</label>
                            <select
                              value={qrScanEventId}
                              onChange={(e) => setQrScanEventId(e.target.value)}
                              className="dash-select"
                            >
                              <option value="">-- All Events --</option>
                              {events.map(ev => (
                                <option key={ev._id} value={ev._id}>{ev.title}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => handleExportReport('xlsx')} className="dash-btn dash-btn-primary">
                              📊 Export Excel
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="dash-table-container" style={{ padding: '24px' }}>
                        <h3>Report Metrics</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                          <div
                            onClick={() => setCurrentTab('faculty-registrations')}
                            style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Total Registrations</span>
                            <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                              {qrScanEventId
                                ? registrations.filter(r => r.eventId === qrScanEventId).length
                                : registrations.length
                              }
                            </h4>
                          </div>
                          <div
                            onClick={() => setCurrentTab('faculty-registrations')}
                            style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Attendance Count</span>
                            <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                              {qrScanEventId
                                ? registrations.filter(r => r.eventId === qrScanEventId && r.checkedIn).length
                                : registrations.filter(r => r.checkedIn).length
                              }
                            </h4>
                          </div>
                          <div
                            onClick={() => setCurrentTab('faculty-registrations')}
                            style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Attendance Rate</span>
                            <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                              {qrScanEventId
                                ? registrations.filter(r => r.eventId === qrScanEventId).length > 0
                                  ? Math.round((registrations.filter(r => r.eventId === qrScanEventId && r.checkedIn).length / registrations.filter(r => r.eventId === qrScanEventId).length) * 100)
                                  : 0
                                : registrations.length > 0
                                  ? Math.round((registrations.filter(r => r.checkedIn).length / registrations.length) * 100)
                                  : 0
                              }%
                            </h4>
                          </div>
                          <div
                            onClick={() => setCurrentTab('faculty-registrations')}
                            style={{ padding: '16px', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '500' }}>Pending Approvals</span>
                            <h4 style={{ color: '#fff', fontSize: '20px', margin: '4px 0 0 0', fontWeight: '700' }}>
                              {registrations.filter(r => r.status === 'Pending').length}
                            </h4>
                          </div>
                        </div>

                        <div className="dash-table-container" style={{ marginTop: '24px', padding: '16px' }}>
                          <h4 style={{ margin: '0 0 12px 0' }}>Event Details</h4>
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Event Name</th>
                                <th>Date</th>
                                <th>Total Regs</th>
                                <th>Attended</th>
                                <th>Attend %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {events.map((event) => {
                                const eventRegs = registrations.filter(r => r.eventId === event._id);
                                const attended = eventRegs.filter(r => r.checkedIn).length;
                                const rate = eventRegs.length > 0 ? Math.round((attended / eventRegs.length) * 100) : 0;
                                return (
                                  <tr key={event._id}>
                                    <td style={{ fontWeight: 'bold' }}>{event.title}</td>
                                    <td>{formatDate(event.date).split(' at')[0]}</td>
                                    <td>{eventRegs.length}</td>
                                    <td>{attended}</td>
                                    <td>{rate}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Faculty Clubs Directory Tab */}
                {currentTab === 'clubs' && (
                  <div>
                    <div className="section-header">
                      <h3>Affiliated Clubs Directory</h3>
                    </div>

                    <div className="dash-table-container" style={{ marginTop: '20px' }}>
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Club Name</th>
                            <th>Department Scope</th>
                            <th>President Name</th>
                            <th>Description Summary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clubs.map((c) => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                              <td>{c.dept}</td>
                              <td>{c.president}</td>
                              <td style={{ color: 'var(--dash-text-muted)' }}>{c.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button onClick={() => setIsAddClubModalOpen(true)} className="dash-btn dash-btn-primary">
                        + Add New Club
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Manage Faculty Tab */}
                {currentTab === 'manage-faculty' && isAdmin && (
                  <div>
                    <div className="section-header">
                      <h3>Faculty Accounts Directory</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '20px' }}>
                      {/* Left: Create Faculty Form */}
                      <div className="dash-card" style={{ padding: '20px', background: 'var(--dash-bg-card)', border: '1.5px solid var(--dash-border)', borderRadius: '12px' }}>
                        <h4 style={{ marginBottom: '16px', color: 'var(--dash-text)' }}>Provision New Faculty Account</h4>
                        <form onSubmit={handleCreateFaculty} className="dash-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <div className="dash-form-group">
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dash-text-muted)', marginBottom: '6px', display: 'block' }}>Faculty Name</label>
                            <input
                              type="text"
                              value={facultyForm.name}
                              onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                              className="dash-input"
                              placeholder="e.g. Dr. A. Rajan"
                              required
                            />
                          </div>
                          <div className="dash-form-group">
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dash-text-muted)', marginBottom: '6px', display: 'block' }}>Email Address</label>
                            <input
                              type="email"
                              value={facultyForm.email}
                              onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                              className="dash-input"
                              placeholder="rajan@ksrce.ac.in"
                              required
                            />
                          </div>
                          <div className="dash-form-group">
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dash-text-muted)', marginBottom: '6px', display: 'block' }}>Access Password</label>
                            <input
                              type="password"
                              value={facultyForm.password}
                              onChange={(e) => setFacultyForm({ ...facultyForm, password: e.target.value })}
                              className="dash-input"
                              placeholder="Enter secure password"
                              required
                            />
                          </div>
                          <button type="submit" className="dash-btn dash-btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Faculty'}
                          </button>
                        </form>
                      </div>

                      {/* Right: Faculty Directory Table */}
                      <div className="dash-table-container" style={{ margin: 0 }}>
                        <table className="dash-table">
                          <thead>
                            <tr>
                              <th>Faculty Name</th>
                              <th>Email</th>
                              <th>Account Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facultyList.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--dash-text-muted)' }}>No faculty accounts found.</td>
                              </tr>
                            ) : (
                              facultyList.map((fac) => (
                                <tr key={fac._id}>
                                  <td style={{ fontWeight: 'bold', color: 'var(--dash-text)' }}>{fac.name}</td>
                                  <td>{fac.email}</td>
                                  <td>
                                    <span className="badge badge-success">Active</span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => handleDeleteFaculty(fac._id, fac.name)}
                                      className="dash-btn"
                                      style={{ padding: '6px 12px', background: '#ef4444', borderColor: '#ef4444', color: '#fff', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* -------------------- SHARED GENERAL PROFILE TAB -------------------- */}
            {currentTab === 'profile' && (
              <div>
                <div className="section-header">
                  <h3>My Account Profile</h3>
                </div>

                <div className="profile-layout">
                  <div className="profile-card">
                    <div className="profile-avatar-large">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <h3>{user.name}</h3>
                    <p style={{ margin: '4px 0 16px 0' }}>{user.email}</p>
                    <span className="profile-role-badge">{user.role}</span>
                  </div>

                  <div className="dash-table-container" style={{ padding: '30px' }}>
                    <h3 style={{ margin: '0 0 20px 0' }}>Personal Information Details</h3>

                    <div className="dash-form">
                      <div className="form-row">
                        <div className="dash-form-group">
                          <label>Full Name</label>
                          <input type="text" value={user.name} className="dash-input" disabled />
                        </div>
                        <div className="dash-form-group">
                          <label>Role Privilege</label>
                          <input type="text" value={user.role.toUpperCase()} className="dash-input" disabled />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="dash-form-group">
                          <label>Email Address</label>
                          <input type="email" value={user.email} className="dash-input" disabled />
                        </div>
                        {user.regNo && (
                          <div className="dash-form-group">
                            <label>Registration Number</label>
                            <input type="text" value={user.regNo} className="dash-input" disabled />
                          </div>
                        )}
                      </div>

                      {isStudent && user.deptYear && (
                        <div className="dash-form-group">
                          <label>Department / Year</label>
                          <input type="text" value={user.deptYear} className="dash-input" disabled />
                        </div>
                      )}

                      {isOrganizer && user.clubName && (
                        <div className="dash-form-group">
                          <label>Assigned Club Name</label>
                          <input type="text" value={user.clubName} className="dash-input" disabled />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ------------------------- DIALOG MODALS ------------------------- */}

      {/* Event Approval Details & Organizer Details Modal */}
      {selectedApprovalEvent && (() => {
        const organizer = selectedApprovalEvent.createdBy;
        const eventMode = (selectedApprovalEvent.mode || 'offline').toLowerCase() === 'online' ? 'Online' : 'Offline';
        const isOnline = eventMode === 'Online';
        return (
          <div className="modal-overlay" onClick={() => setSelectedApprovalEvent(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Review Event Proposal</h3>
                <button className="modal-close-btn" onClick={() => setSelectedApprovalEvent(null)}>×</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Event Details */}
                  <div style={{ borderBottom: '1px solid var(--dash-border)', paddingBottom: '16px' }}>
                    <h4 style={{ color: 'var(--dash-green)', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>Event Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                      <div><strong>Title:</strong> {selectedApprovalEvent.title}</div>
                      <div><strong>Description:</strong> {selectedApprovalEvent.description}</div>
                      <div><strong>Date & Time:</strong> {formatEventDateRange(selectedApprovalEvent)}</div>
                      <div><strong>Venue Location:</strong> {selectedApprovalEvent.location || selectedApprovalEvent.venue}</div>
                      <div><strong>Mode:</strong> <span className={`mode-badge ${eventMode.toLowerCase()}`} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isOnline ? '#10b981' : '#ef4444', marginLeft: '6px' }}>{eventMode}</span></div>
                      <div><strong>Capacity Limit:</strong> {selectedApprovalEvent.maxParticipants || selectedApprovalEvent.capacity || 'N/A'} seats</div>
                    </div>
                  </div>

                  {/* Organizer Details */}
                  <div style={{ borderBottom: '1px solid var(--dash-border)', paddingBottom: '16px' }}>
                    <h4 style={{ color: 'var(--dash-green)', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>Organizer Profile</h4>
                    {organizer ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                        <div><strong>Name:</strong> {organizer.name}</div>
                        <div><strong>Email:</strong> {organizer.email}</div>
                        <div><strong>Role:</strong> {organizer.role}</div>
                        <div><strong>Club / Dept:</strong> {organizer.clubName || selectedApprovalEvent.clubName || 'N/A'}</div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--dash-text-muted)', fontSize: '13px' }}>
                        No coordinator profile information attached to this event record.
                      </div>
                    )}
                  </div>

                  {/* Event QR Code (Only if approved) */}
                  {selectedApprovalEvent.status === 'Approved' && (
                    <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ color: 'var(--dash-green)', margin: '0 0 4px 0', fontSize: '13px', alignSelf: 'flex-start', fontWeight: 'bold' }}>Unique Event Entry QR Code</h4>
                      <img
                        src={selectedApprovalEvent.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedApprovalEvent._id)}`}
                        alt="Event QR Code"
                        style={{ width: '150px', height: '150px', border: '1px solid var(--dash-border)', padding: '6px', borderRadius: '8px', backgroundColor: '#fff' }}
                      />
                      <button
                        onClick={async () => {
                          const qrUrl = selectedApprovalEvent.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedApprovalEvent._id)}`;
                          try {
                            let blob;
                            if (qrUrl.startsWith('data:')) {
                              const res = await fetch(qrUrl);
                              blob = await res.blob();
                            } else {
                              const response = await fetch(qrUrl);
                              blob = await response.blob();
                            }
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${selectedApprovalEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qrcode.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Failed to download QR code', err);
                          }
                        }}
                        className="dash-btn dash-btn-outline"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        ⬇ Download QR Code Image
                      </button>
                    </div>
                  )}

                </div>
              </div>
              <div className="modal-footer">
                <button className="dash-btn dash-btn-secondary" onClick={() => setSelectedApprovalEvent(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* A. Event Detail Modal */}
      {isEventDetailModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setIsEventDetailModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedEvent.title}</h3>
              <button className="modal-close-btn" onClick={() => setIsEventDetailModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                <span className="badge badge-info">{selectedEvent.clubName || 'General'}</span>
                <span className="badge badge-success">Capacity: {selectedEvent.capacity} seats</span>
              </div>

              <h4 style={{ color: 'var(--brand-green-light)', margin: '0 0 8px 0' }}>Description</h4>
              <p style={{ color: 'var(--dash-text-muted)', lineHeight: '1.6', margin: '0 0 20px 0' }}>{selectedEvent.description}</p>

              <h4 style={{ color: 'var(--brand-green-light)', margin: '0 0 8px 0' }}>Venue & Time</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--dash-text)', fontSize: '14px', marginBottom: '20px' }}>
                <div>📍 <strong>Venue/Location:</strong> {selectedEvent.venue || selectedEvent.location || 'Main Campus'}</div>
                <div>📅 <strong>Date Range:</strong> {formatEventDateRange(selectedEvent)}</div>
              </div>

              {selectedEvent.organizer && (
                <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: '16px' }}>
                  <h4 style={{ color: 'var(--brand-green-light)', margin: '0 0 4px 0', fontSize: '13px' }}>Organizer Contacts</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--dash-text-muted)' }}>
                    Name: {selectedEvent.organizer.name} | Email: {selectedEvent.organizer.email}
                  </p>
                </div>
              )}

              {/* Unique Event QR Code download */}
              {(user.role === 'organizer' || user.role === 'faculty' || user.role === 'admin') && (
                <div style={{ borderTop: '1px solid var(--dash-border)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ color: 'var(--brand-green-light)', margin: '0 0 4px 0', fontSize: '13px', alignSelf: 'flex-start' }}>Unique Event Entry QR Code</h4>
                  <img
                    src={selectedEvent.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedEvent._id)}`}
                    alt="Event QR Code"
                    style={{ width: '150px', height: '150px', border: '1px solid var(--dash-border)', padding: '6px', borderRadius: '8px', backgroundColor: '#fff' }}
                  />
                  <button
                    onClick={async () => {
                      const qrUrl = selectedEvent.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedEvent._id)}`;
                      try {
                        let blob;
                        if (qrUrl.startsWith('data:')) {
                          const res = await fetch(qrUrl);
                          blob = await res.blob();
                        } else {
                          const response = await fetch(qrUrl);
                          blob = await response.blob();
                        }
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${selectedEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qrcode.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Failed to download QR code', err);
                      }
                    }}
                    className="dash-btn dash-btn-outline"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    ⬇ Download QR Code Image
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="dash-btn dash-btn-secondary" onClick={() => setIsEventDetailModalOpen(false)}>
                Close
              </button>
              {isStudent && (() => {
                const isReg = registeredEventIds.includes(selectedEvent._id);
                const isFull = selectedEvent.registrationsCount >= selectedEvent.maxParticipants;
                return (
                  <button
                    disabled={isReg || isFull}
                    onClick={() => (isReg || isFull) ? null : navigate(`/register?eventId=${selectedEvent._id}`)}
                    className="dash-btn dash-btn-primary"
                    style={(isFull && !isReg) ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                  >
                    {isReg ? 'Registered✓' : isFull ? 'Event Full' : 'Register Now'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* B. Add Staff Modal */}
      {isAddStaffModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddStaffModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddStaff}>
              <div className="modal-header">
                <h3>Add Staff / Volunteer</h3>
                <button type="button" className="modal-close-btn" onClick={() => setIsAddStaffModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="dash-form">
                  <div className="dash-form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. Dr. B. Anitha"
                      required
                    />
                  </div>
                  <div className="dash-form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      value={staffForm.dept}
                      onChange={(e) => setStaffForm({ ...staffForm, dept: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. CSE"
                      required
                    />
                  </div>
                  <div className="dash-form-group">
                    <label>System Role</label>
                    <input
                      type="text"
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. Coordinator / Volunteer"
                      required
                    />
                  </div>

                  <div className="dash-form-group">
                    <label>Email ID</label>
                    <input
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="dash-input"
                      placeholder="staff@college.edu"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="dash-btn dash-btn-secondary" onClick={() => setIsAddStaffModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dash-btn dash-btn-primary">
                  Save Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Add Club Modal */}
      {isAddClubModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddClubModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddClub}>
              <div className="modal-header">
                <h3>Add Affiliated Club</h3>
                <button type="button" className="modal-close-btn" onClick={() => setIsAddClubModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="dash-form">
                  <div className="dash-form-group">
                    <label>Club Name</label>
                    <input
                      type="text"
                      value={clubForm.name}
                      onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. Fine Arts Club"
                      required
                    />
                  </div>
                  <div className="dash-form-group">
                    <label>Department Scope</label>
                    <input
                      type="text"
                      value={clubForm.dept}
                      onChange={(e) => setClubForm({ ...clubForm, dept: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. ECE / MECH"
                      required
                    />
                  </div>

                  <div className="dash-form-group">
                    <label>President Name</label>
                    <input
                      type="text"
                      value={clubForm.president}
                      onChange={(e) => setClubForm({ ...clubForm, president: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. Arun Kumar"
                      required
                    />
                  </div>
                  <div className="dash-form-group">
                    <label>Brief Description</label>
                    <textarea
                      value={clubForm.desc}
                      onChange={(e) => setClubForm({ ...clubForm, desc: e.target.value })}
                      className="dash-textarea"
                      placeholder="Describe the club's focus..."
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="dash-btn dash-btn-secondary" onClick={() => setIsAddClubModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dash-btn dash-btn-primary">
                  Register Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Create Announcement Modal */}
      {isCreateAnnouncementModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateAnnouncementModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="modal-header">
                <h3>Publish New Announcement</h3>
                <button type="button" className="modal-close-btn" onClick={() => setIsCreateAnnouncementModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="dash-form">
                  <div className="dash-form-group">
                    <label>Title Headline</label>
                    <input
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      className="dash-input"
                      placeholder="e.g. Schedule adjustment notice"
                      required
                    />
                  </div>
                  <div className="dash-form-group">
                    <label>Message Content</label>
                    <textarea
                      value={announcementForm.body}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
                      className="dash-textarea"
                      placeholder="Type details for students..."
                      required
                    ></textarea>
                  </div>
                  <div className="dash-form-group">
                    <label>Publishing Author (Optional)</label>
                    <input
                      type="text"
                      value={announcementForm.author}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, author: e.target.value })}
                      className="dash-input"
                      placeholder={user.name}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="dash-btn dash-btn-secondary" onClick={() => setIsCreateAnnouncementModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dash-btn dash-btn-primary">
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E. Result Entry Modal */}
      {isResultEntryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResultEntryModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddResult}>
              <div className="modal-header">
                <h3>Publish Competition Results</h3>
                <button type="button" className="modal-close-btn" onClick={() => setIsResultEntryModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="dash-form">
                  <div className="dash-form-group">
                    <label>Select Event</label>
                    <select
                      value={resultForm.eventId}
                      onChange={(e) => setResultForm({ ...resultForm, eventId: e.target.value })}
                      className="dash-select"
                      required
                    >
                      <option value="">-- Choose Event --</option>
                      {events.map(ev => (
                        <option key={ev._id} value={ev._id}>{ev.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="dash-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label>🥇 First Place Winner Name *</label>
                      <input
                        type="text"
                        value={resultForm.firstPlaceName}
                        onChange={(e) => setResultForm({ ...resultForm, firstPlaceName: e.target.value })}
                        className="dash-input"
                        placeholder="Student full name"
                        required
                      />
                    </div>
                    <div>
                      <label>First Place Email *</label>
                      <input
                        type="email"
                        value={resultForm.firstPlaceEmail}
                        onChange={(e) => setResultForm({ ...resultForm, firstPlaceEmail: e.target.value })}
                        className="dash-input"
                        placeholder="student@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="dash-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label>🥈 Second Place Winner Name</label>
                      <input
                        type="text"
                        value={resultForm.secondPlaceName}
                        onChange={(e) => setResultForm({ ...resultForm, secondPlaceName: e.target.value })}
                        className="dash-input"
                        placeholder="Student full name"
                      />
                    </div>
                    <div>
                      <label>Second Place Email</label>
                      <input
                        type="email"
                        value={resultForm.secondPlaceEmail}
                        onChange={(e) => setResultForm({ ...resultForm, secondPlaceEmail: e.target.value })}
                        className="dash-input"
                        placeholder="student@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="dash-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label>🥉 Third Place Winner Name</label>
                      <input
                        type="text"
                        value={resultForm.thirdPlaceName}
                        onChange={(e) => setResultForm({ ...resultForm, thirdPlaceName: e.target.value })}
                        className="dash-input"
                        placeholder="Student full name"
                      />
                    </div>
                    <div>
                      <label>Third Place Email</label>
                      <input
                        type="email"
                        value={resultForm.thirdPlaceEmail}
                        onChange={(e) => setResultForm({ ...resultForm, thirdPlaceEmail: e.target.value })}
                        className="dash-input"
                        placeholder="student@gmail.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="dash-btn dash-btn-secondary" onClick={() => setIsResultEntryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="dash-btn dash-btn-primary">
                  Publish Winners
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Screenshot Verification Modal */}
      {selectedScreenshotReg && (
        <div className="modal-overlay" onClick={() => setSelectedScreenshotReg(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verify Payment Screenshot</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedScreenshotReg(null)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '16px', color: 'var(--dash-text-muted)', fontSize: '14px' }}>
                Please check the UPI transaction screenshot from <strong>{selectedScreenshotReg.studentName}</strong>:
              </p>
              <div style={{ borderRadius: '8px', border: '1px solid var(--dash-border)', padding: '10px', background: '#000', display: 'inline-block' }}>
                <img
                  src={selectedScreenshotReg.paymentScreenshot}
                  alt="UPI Slip Receipt"
                  style={{ maxWidth: '100%', maxHeight: '400px', display: 'block', borderRadius: '4px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="dash-btn dash-btn-secondary"
                onClick={() => setSelectedScreenshotReg(null)}
              >
                Cancel
              </button>
              {selectedScreenshotReg.status === 'Pending' && (
                <button
                  type="button"
                  className="dash-btn dash-btn-primary"
                  onClick={() => {
                    handleUpdateRegistrationStatus(selectedScreenshotReg.id, 'Registered');
                    setSelectedScreenshotReg(null);
                  }}
                >
                  Verify & Approve
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* G. Admin Student Details Modal */}
      {selectedStudentDetail && (
        <div className="modal-overlay" onClick={() => setSelectedStudentDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Student Profile Details</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedStudentDetail(null)}>×</button>
            </div>
            <div className="modal-body" style={{ color: 'var(--dash-text)', fontSize: '14px', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
                <div><strong>Full Name:</strong> {selectedStudentDetail.studentName}</div>
                <div><strong>Registration Number:</strong> {selectedStudentDetail.studentReg}</div>
                <div><strong>Email Address:</strong> {selectedStudentDetail.studentEmail}</div>
                <div><strong>Department / Year:</strong> {selectedStudentDetail.studentDept}</div>
                <div><strong>Mobile Number:</strong> {selectedStudentDetail.studentMobile}</div>
                <div><strong>College Name:</strong> {selectedStudentDetail.collegeName}</div>
                <div><strong>Team Details:</strong> {selectedStudentDetail.teamDetails}</div>
                <div><strong>Ticket ID:</strong> {selectedStudentDetail.ticketId}</div>
                <div><strong>Registration Status:</strong> {selectedStudentDetail.status}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* F. Certificate View Modal */}
      {selectedCertificate && (
        <div className="modal-overlay" onClick={() => setSelectedCertificate(null)}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verified Digital Certificate</h3>
              <button className="modal-close-btn" onClick={() => setSelectedCertificate(null)}>×</button>
            </div>
            <div className="modal-body" id="printable-certificate-area">
              <div className="certificate-preview-box">
                <div style={{ fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>
                  College Event Management System
                </div>
                <div className="cert-title">
                  Certificate of {selectedCertificate.isWinner ? 'Achievement' : 'Participation'}
                </div>
                <div className="cert-subtitle">This certificate is proudly presented to:</div>
                <div className="cert-name">{user.name}</div>
                <div className="cert-text">
                  for {selectedCertificate.isWinner ? 'securing a winning placement' : 'satisfactory participation'} in the campus event{' '}
                  <strong>"{selectedCertificate.eventTitle}"</strong> organized by the <strong>{selectedCertificate.clubName}</strong> held on{' '}
                  {new Date(selectedCertificate.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                </div>
                <div className="cert-signature-row">
                  <div className="cert-signature">
                    <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '15px', color: '#444' }}>
                      {selectedCertificate.clubName.split(' ')[0]} Head
                    </div>
                    Event Coordinator
                  </div>
                  <div className="cert-signature">
                    <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '15px', color: '#444' }}>
                      Dr. K. Sridhar
                    </div>
                    College Principal
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="dash-btn dash-btn-secondary" onClick={() => setSelectedCertificate(null)}>
                Close
              </button>
              <button
                onClick={() => {
                  const printContent = document.getElementById('printable-certificate-area').innerHTML;
                  const originalContent = document.body.innerHTML;
                  const styleContent = `
                    <style>
                      body { background: white !important; color: black !important; padding: 20px; }
                      .certificate-preview-box { border: 15px double #22c55e !important; background: white !important; box-shadow: none !important; }
                      .cert-title { color: #1a4d10 !important; }
                      .modal-header, .modal-footer { display: none !important; }
                    </style>
                  `;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write('<html><head><title>Print Certificate</title>' + styleContent + '</head><body>' + printContent + '</body></html>');
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                }}
                className="dash-btn dash-btn-primary"
              >
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Organizer Details Modal */}
      {isOrganizerModalOpen && selectedOrganizer && (
        <div className="modal-overlay" onClick={() => { setIsOrganizerModalOpen(false); setSelectedOrganizer(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Organizer Account Details</h3>
              <button className="modal-close-btn" onClick={() => { setIsOrganizerModalOpen(false); setSelectedOrganizer(null); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="profile-layout" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--dash-text)' }}>
                  <div>
                    <strong style={{ color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Full Name</strong>
                    <div style={{ color: 'var(--dash-text)', fontSize: '15px', marginTop: '4px', fontWeight: '600' }}>{selectedOrganizer.name}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Email Address</strong>
                    <div style={{ color: 'var(--dash-text)', fontSize: '15px', marginTop: '4px', fontWeight: '600' }}>{selectedOrganizer.email}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Registration Number / Staff ID</strong>
                    <div style={{ color: 'var(--dash-text)', fontSize: '15px', marginTop: '4px', fontWeight: '600' }}>{selectedOrganizer.regNo || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Club Name / Organizing Club</strong>
                    <div style={{ color: 'var(--dash-text)', fontSize: '15px', marginTop: '4px', fontWeight: '600' }}>{selectedOrganizer.clubName || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Mobile Number</strong>
                    <div style={{ color: 'var(--dash-text)', fontSize: '15px', marginTop: '4px', fontWeight: '600' }}>{selectedOrganizer.mobileNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Approval Status</strong>
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge ${selectedOrganizer.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {selectedOrganizer.isApproved ? 'Approved & Active' : 'Pending Review'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="dash-btn dash-btn-secondary" onClick={() => { setIsOrganizerModalOpen(false); setSelectedOrganizer(null); }}>
                Close
              </button>
              {!selectedOrganizer.isApproved && (
                <button
                  onClick={async () => {
                    await handleApproveOrganizer(selectedOrganizer._id);
                  }}
                  className="dash-btn dash-btn-primary"
                >
                  Approve Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Popup Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{confirmDialog.title}</h3>
              <button className="modal-close-btn" onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--dash-text-muted)', fontSize: '14.5px', lineHeight: '1.6', margin: 0 }}>
                {confirmDialog.message}
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="dash-btn dash-btn-secondary"
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
              >
                Cancel
              </button>
              <button
                className="dash-btn"
                style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                onClick={confirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

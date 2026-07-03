// ──────────────────────────────────────────────────────────────────────────────
// API Base URL
// Reads VITE_API_URL from .env (e.g. http://localhost:5000/api)
// Falls back to localhost:5000/api for local development.
// Automatically appends /api if the env value is just a base domain.
// ──────────────────────────────────────────────────────────────────────────────
let API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';
if (API_URL && !API_URL.endsWith('/api') && !API_URL.endsWith('/api/')) {
  API_URL = `${API_URL.replace(/\/$/, '')}/api`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Header builder — attaches JWT from localStorage on every request
// ──────────────────────────────────────────────────────────────────────────────
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Core request helper
// ──────────────────────────────────────────────────────────────────────────────
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

// ──────────────────────────────────────────────────────────────────────────────
// Auth Service  →  /api/auth/*
// Backend routes: POST /register/student, /register/organizer, /login,
//                 /google-login, /forgot-password, /verify-otp,
//                 /reset-password   GET /profile
// ──────────────────────────────────────────────────────────────────────────────
export const authService = {
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  googleLogin: (tokenData) =>
    apiRequest('/auth/google-login', {
      method: 'POST',
      body: JSON.stringify(tokenData),
    }),

  registerStudent: (userData) =>
    apiRequest('/auth/register/student', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  registerOrganizer: (userData) =>
    apiRequest('/auth/register/organizer', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  forgotPassword: (email) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email, otp) =>
    apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resetPassword: (email, otp, newPassword) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  /** GET /api/auth/profile — returns the logged-in user's profile */
  getProfile: () => apiRequest('/auth/profile'),

  /** PUT /api/auth/profile/stats — updates profile stats and awards/deducts points */
  updateStats: (type, action = 'increment') =>
    apiRequest('/auth/profile/stats', {
      method: 'PUT',
      body: JSON.stringify({ type, action }),
    }),

  /** GET /api/auth/leaderboard — returns the user ranking leaderboard */
  getLeaderboard: () => apiRequest('/auth/leaderboard'),

  /** PUT /api/auth/profile — updates profile settings */
  updateProfile: (profileData) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  /** PUT /api/auth/profile/password — changes user password */
  changePassword: (passwordData) =>
    apiRequest('/auth/profile/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    }),

  /** DELETE /api/auth/profile — deletes the user account */
  deleteAccount: () =>
    apiRequest('/auth/profile', {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Event Service  →  /api/events/*
// Backend routes: GET /, POST /,  GET /:id,  POST /:id/register
// ──────────────────────────────────────────────────────────────────────────────
export const eventService = {
  /** GET /api/events — returns all events (public) */
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/events${q ? `?${q}` : ''}`);
  },

  /** GET /api/events/:id — returns a single event (public) */
  getById: (id) => apiRequest(`/events/${id}`),

  /**
   * POST /api/events — create a new event
   * Requires: Bearer token (organizer or admin)
   * Body: { title, description, date, location, capacity }
   */
  create: (eventData) =>
    apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),

  /**
   * POST /api/events/:id/register — register the logged-in student for an event
   * Requires: Bearer token (student only)
   */
  register: (id, data) =>
    apiRequest(`/events/${id}/register`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  /** GET /api/events/:eventId/registrations — fetch registrations for an event */
  getRegistrations: (eventId) => apiRequest(`/events/${eventId}/registrations`),
};

// ──────────────────────────────────────────────────────────────────────────────
// Scan Service  →  /api/scan
// Backend route: POST / (organizer or admin)
// ──────────────────────────────────────────────────────────────────────────────
export const scanService = {
  /**
   * POST /api/scan — check-in an attendee by QR code data
   * Requires: Bearer token (organizer or admin)
   * Body: { qrCodeData: JSON.stringify({ userId, eventId }) }
   */
  checkIn: (qrCodeData) =>
    apiRequest('/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCodeData }),
    }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Admin Service  →  /api/admin/*
// Backend route: POST /create-faculty (admin only)
// ──────────────────────────────────────────────────────────────────────────────
export const adminService = {
  /**
   * POST /api/admin/create-faculty
   * Requires: Bearer token (admin only)
   * Body: { name, email, password }
   */
  createFaculty: (facultyData) =>
    apiRequest('/admin/create-faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData),
    }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Faculty Service  →  /api/faculty/*
// ──────────────────────────────────────────────────────────────────────────────
export const facultyService = {
  approveOrganizer: (userId) =>
    apiRequest(`/faculty/approve-organizer/${userId}`, {
      method: 'PUT',
    }),
  getOrganizers: () => apiRequest('/users?role=organizer'),
  getDashboard: () => apiRequest('/faculty/dashboard'),
  getPendingEvents: () => apiRequest('/faculty/events/pending'),
  updateEventStatus: (eventId, status) =>
    apiRequest(`/faculty/events/${eventId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getRegistrations: (eventId) =>
    apiRequest(`/faculty/events/${eventId}/registrations`),
  scanQR: (qrCodeId) =>
    apiRequest('/faculty/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCodeId }),
    }),
  createAnnouncement: (announcementData) =>
    apiRequest('/faculty/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    }),
  getReports: () => apiRequest('/faculty/reports'),
  deleteUser: (userId) =>
    apiRequest(`/faculty/users/${userId}`, {
      method: 'DELETE',
    }),
  deleteEvent: (eventId) =>
    apiRequest(`/faculty/events/${eventId}`, {
      method: 'DELETE',
    }),
  deleteRegistration: (regId) =>
    apiRequest(`/faculty/registrations/${regId}`, {
      method: 'DELETE',
    }),
  updateCoordinationStatus: (eventId, status) =>
    apiRequest(`/faculty/events/${eventId}/coordination`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getFacultyList: () => apiRequest('/users?role=faculty'),
};

// ──────────────────────────────────────────────────────────────────────────────
// Student Service  →  /api/student/*
// ──────────────────────────────────────────────────────────────────────────────
export const studentService = {
  getDashboard: () => apiRequest('/student/dashboard'),
  getEvents: () => apiRequest('/student/events'),
  register: (eventId) =>
    apiRequest(`/student/events/${eventId}/register`, {
      method: 'POST',
    }),
  getRegistrations: () => apiRequest('/student/registrations'),
  selfScan: (eventId) =>
    apiRequest('/student/attendance/self-scan', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }),
  getCertificates: () => apiRequest('/student/certificates'),
  getCalendar: () => apiRequest('/student/calendar'),
};

// ──────────────────────────────────────────────────────────────────────────────
// Announcement Service  →  /api/announcements/*
// ──────────────────────────────────────────────────────────────────────────────
export const announcementService = {
  getAll: () => apiRequest('/announcements'),
  create: (announcementData) =>
    apiRequest('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Registration Service  →  /api/registrations/*
// ──────────────────────────────────────────────────────────────────────────────
export const registrationService = {
  updateStatus: (id, status, points) =>
    apiRequest(`/registrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, points }),
    }),
};

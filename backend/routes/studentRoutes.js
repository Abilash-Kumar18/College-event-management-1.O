const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  getBrowseEvents,
  registerForEvent,
  getStudentRegistrations,
  selfScanAttendance,
  getCertificates,
  getCalendarEvents,
} = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all student routes
router.use(protect, authorizeRoles('student'));

router.get('/dashboard', getStudentDashboard);
router.get('/events', getBrowseEvents);
router.post('/events/:eventId/register', registerForEvent);
router.get('/registrations', getStudentRegistrations);
router.post('/attendance/self-scan', selfScanAttendance);
router.get('/certificates', getCertificates);
router.get('/calendar', getCalendarEvents);

module.exports = router;

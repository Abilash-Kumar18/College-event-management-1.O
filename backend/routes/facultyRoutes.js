const express = require('express');
const router = express.Router();
const {
  getFacultyDashboard,
  getPendingEvents,
  updateEventStatus,
  getEventRegistrations,
  getAllRegistrations,
  scanStudentQRPass,
  createAnnouncement,
  getFacultyReports,
  approveOrganizer,
  deleteUser,
  deleteEvent,
  deleteRegistration,
  updateEventCoordinationStatus,
} = require('../controllers/facultyController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all faculty routes
router.use(protect, authorizeRoles('faculty', 'admin'));

router.get('/dashboard', getFacultyDashboard);
router.get('/events/pending', getPendingEvents);
router.put('/events/:eventId/status', updateEventStatus);
router.get('/registrations', getAllRegistrations);
router.get('/events/:eventId/registrations', getEventRegistrations);
router.post('/attendance/scan', scanStudentQRPass);
router.post('/announcements', createAnnouncement);
router.get('/reports', getFacultyReports);
router.put('/approve-organizer/:id', approveOrganizer);
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);
router.delete('/events/:id', deleteEvent);
router.delete('/registrations/:id', deleteRegistration);
router.put('/events/:eventId/coordination', updateEventCoordinationStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  getPendingEvents,
  updateEventStatus,
  getEventRegistrations,
  getEventLeaderboard,
  finalizeEventAttendance,
} = require('../controllers/eventController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// GET  /api/events       — public (anyone can browse)
// POST /api/events       — organizer or admin only
router
  .route('/')
  .get(getEvents)
  .post(protect, authorizeRoles('faculty', 'admin', 'organizer'), createEvent);

// Define static routes before parameterized routes to avoid conflicts
router.route('/pending')
  .get(protect, authorizeRoles('faculty', 'admin'), getPendingEvents);

// GET /api/events/:id    — public
router.route('/:id').get(getEventById);

router.route('/:id/status')
  .put(protect, authorizeRoles('faculty', 'admin'), updateEventStatus);

router.route('/:id/register')
  .post(protect, authorizeRoles('student'), registerForEvent);

router.route('/:eventId/registrations')
  .get(protect, authorizeRoles('faculty', 'admin'), getEventRegistrations);

router.route('/:eventId/leaderboard')
  .get(getEventLeaderboard);

router.route('/:eventId/attendance/finalize')
  .post(protect, authorizeRoles('faculty', 'admin'), finalizeEventAttendance);

module.exports = router;

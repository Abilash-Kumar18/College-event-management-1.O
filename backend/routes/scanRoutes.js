const express = require('express');
const router = express.Router();
const { checkInAttendee } = require('../controllers/scanController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/scan  — organizers and admins can scan QR codes
router.post('/', protect, authorizeRoles('organizer', 'admin'), checkInAttendee);

module.exports = router;

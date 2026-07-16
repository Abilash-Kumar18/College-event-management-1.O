const express = require('express');
const router = express.Router();
const { checkInAttendee } = require('../controllers/scanController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/scan  — faculty and admins can scan QR codes
router.post('/', protect, authorizeRoles('faculty', 'admin', 'organizer'), checkInAttendee);

module.exports = router;

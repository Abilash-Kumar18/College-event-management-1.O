const express = require('express');
const router = express.Router();
const { scanAttendance } = require('../controllers/attendanceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/attendance/scan
router.post('/scan', protect, authorizeRoles('organizer', 'faculty', 'admin'), scanAttendance);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/reports/summary
router.get('/summary', protect, authorizeRoles('organizer', 'faculty', 'admin'), getSummary);

module.exports = router;

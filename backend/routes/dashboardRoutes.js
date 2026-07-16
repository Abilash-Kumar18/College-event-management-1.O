const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/dashboardController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/dashboard/stats
router.get('/stats', protect, authorizeRoles('faculty', 'admin'), getStats);

module.exports = router;

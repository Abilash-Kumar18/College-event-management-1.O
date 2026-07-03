const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements } = require('../controllers/announcementController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// /api/announcements
router.route('/')
  .post(protect, authorizeRoles('organizer', 'faculty', 'admin'), createAnnouncement)
  .get(protect, getAnnouncements);

module.exports = router;

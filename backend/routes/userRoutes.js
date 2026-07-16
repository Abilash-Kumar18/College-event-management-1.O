const express = require('express');
const router = express.Router();
const { getUsers, getProfile, updateProfile } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/users
router.get('/', protect, authorizeRoles('faculty', 'admin'), getUsers);

// GET /api/profile/me
router.get('/me', protect, getProfile);

// PUT /api/profile/me
router.put('/me', protect, updateProfile);

module.exports = router;

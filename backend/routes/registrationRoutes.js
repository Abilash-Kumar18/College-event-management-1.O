const express = require('express');
const router = express.Router();
const { updateRegistrationStatus } = require('../controllers/registrationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// PUT /api/registrations/:id
router.put('/:id', protect, authorizeRoles('faculty', 'admin'), updateRegistrationStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  registerStudent,
  registerOrganizer,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getUserProfile,
  updateProfileStats,
  getLeaderboard,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
  googleLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register/student', registerStudent);
router.post('/register/organizer', registerOrganizer);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getUserProfile);
router.put('/profile/stats', protect, updateProfileStats);
router.get('/leaderboard', protect, getLeaderboard);
router.put('/profile', protect, updateUserProfile);
router.put('/profile/password', protect, changeUserPassword);
router.delete('/profile', protect, deleteUserAccount);

module.exports = router;

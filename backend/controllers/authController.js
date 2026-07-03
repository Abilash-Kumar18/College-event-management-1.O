const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Simulated email sender utilizing nodemailer setup
const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
      pass: process.env.SMTP_PASS || 'ethereal.pass',
    },
  });

  const fromName = process.env.SMTP_FROM_NAME || 'College Event Management';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@collegeevents.com';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Password Reset OTP',
    text: `Your password reset OTP is ${otp}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">College Event Management</h2>
        <p>You requested a password reset. Please use the following One-Time Password (OTP) to reset your password:</p>
        <div style="font-size: 24px; font-weight: bold; padding: 10px; background-color: #f7f7f7; display: inline-block; letter-spacing: 2px;">
          ${otp}
        </div>
        <p style="color: #777; font-size: 12px; margin-top: 20px;">This OTP will expire in 10 minutes.</p>
      </div>
    `,
  };

  // Always log to console for development and test validation
  console.log(`\n--- [SIMULATED EMAIL SENT] ---`);
  console.log(`To: ${email}`);
  console.log(`OTP: ${otp}`);
  console.log(`-----------------------------\n`);

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`Nodemailer connection warning: ${error.message}. OTP logged to console.`);
    return { messageId: 'simulated-id' };
  }
};

// @desc    Register Student
// @route   POST /api/auth/register/student
// @access  Public
const registerStudent = async (req, res, next) => {
  let { name, regNo, deptYear, email, mobileNumber, password } = req.body;

  try {
    // 1. NoSQL Injection Prevention: Verify all inputs are strings
    if (
      (name !== undefined && typeof name !== 'string') ||
      (regNo !== undefined && typeof regNo !== 'string') ||
      (deptYear !== undefined && typeof deptYear !== 'string') ||
      (email !== undefined && typeof email !== 'string') ||
      (password !== undefined && typeof password !== 'string') ||
      (mobileNumber !== undefined && typeof mobileNumber !== 'string')
    ) {
      res.status(400);
      throw new Error('Invalid input types. All submitted fields must be strings.');
    }

    name = name ? name.trim() : '';
    regNo = regNo ? regNo.trim() : '';
    deptYear = deptYear ? deptYear.trim() : '';
    email = email ? email.trim().toLowerCase() : '';
    password = password ? password.trim() : '';
    mobileNumber = mobileNumber ? mobileNumber.trim() : '';

    // 2. Validation
    if (!name || !regNo || !deptYear || !email || !password) {
      res.status(400);
      throw new Error('Please fill in all required fields (name, regNo, deptYear, email, password)');
    }

    // Alphabet-only name validation
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name)) {
      res.status(400);
      throw new Error('Name must contain only alphabets and spaces.');
    }

    // Email format validation (@gmail.com or @ksrce.ac.in)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Email address must end with @gmail.com or @ksrce.ac.in.');
    }

    // Password constraints (advanced requirements)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
    }

    // Mobile number validation (10 digits with optional +91 prefix)
    let formattedMobile = mobileNumber;
    const plainMobileRegex = /^\d{10}$/;
    const prefixedMobileRegex = /^\+91\d{10}$/;

    if (plainMobileRegex.test(mobileNumber)) {
      formattedMobile = `+91${mobileNumber}`;
    } else if (prefixedMobileRegex.test(mobileNumber)) {
      formattedMobile = mobileNumber;
    } else if (mobileNumber) {
      res.status(400);
      throw new Error('Mobile number must be a valid 10-digit number with optional +91 prefix.');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      role: 'student',
      name,
      regNo,
      deptYear,
      email,
      mobileNumber: formattedMobile,
      password,
      isApproved: true, // students are automatically approved
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        regNo: user.regNo,
        deptYear: user.deptYear,
        isApproved: user.isApproved,
      },
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Organizer
// @route   POST /api/auth/register/organizer
// @access  Public
const registerOrganizer = async (req, res, next) => {
  let { name, regNo, email, mobileNumber, clubName, password } = req.body;

  try {
    // 1. NoSQL Injection Prevention
    if (
      (name !== undefined && typeof name !== 'string') ||
      (regNo !== undefined && typeof regNo !== 'string') ||
      (email !== undefined && typeof email !== 'string') ||
      (clubName !== undefined && typeof clubName !== 'string') ||
      (password !== undefined && typeof password !== 'string') ||
      (mobileNumber !== undefined && typeof mobileNumber !== 'string')
    ) {
      res.status(400);
      throw new Error('Invalid input types. All submitted fields must be strings.');
    }

    name = name ? name.trim() : '';
    regNo = regNo ? regNo.trim() : '';
    email = email ? email.trim().toLowerCase() : '';
    clubName = clubName ? clubName.trim() : '';
    password = password ? password.trim() : '';
    mobileNumber = mobileNumber ? mobileNumber.trim() : '';

    // 2. Validation
    if (!name || !regNo || !clubName || !email || !password) {
      res.status(400);
      throw new Error('Please fill in all required fields (name, regNo, clubName, email, password)');
    }

    // Alphabet-only name validation
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name)) {
      res.status(400);
      throw new Error('Organizer name must contain only alphabets and spaces.');
    }

    // Email format validation (@gmail.com or @ksrce.ac.in)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Email address must end with @gmail.com or @ksrce.ac.in.');
    }

    // Password constraints (advanced requirements)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
    }

    // Mobile number validation (10 digits with optional +91 prefix)
    let formattedMobile = mobileNumber;
    const plainMobileRegex = /^\d{10}$/;
    const prefixedMobileRegex = /^\+91\d{10}$/;

    if (plainMobileRegex.test(mobileNumber)) {
      formattedMobile = `+91${mobileNumber}`;
    } else if (prefixedMobileRegex.test(mobileNumber)) {
      formattedMobile = mobileNumber;
    } else if (mobileNumber) {
      res.status(400);
      throw new Error('Mobile number must be a valid 10-digit number with optional +91 prefix.');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      role: 'organizer',
      name,
      regNo,
      email,
      mobileNumber: formattedMobile,
      clubName,
      password,
      isApproved: false, // organizers must be approved by faculty
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for faculty approval.',
      user: {
        _id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        regNo: user.regNo,
        clubName: user.clubName,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unified Login
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  let { email, password, role, recaptchaToken } = req.body;

  try {
    // 1. NoSQL Injection Prevention
    if (
      (email !== undefined && typeof email !== 'string') ||
      (password !== undefined && typeof password !== 'string') ||
      (role !== undefined && typeof role !== 'string') ||
      (recaptchaToken !== undefined && typeof recaptchaToken !== 'string')
    ) {
      res.status(400);
      throw new Error('Invalid input types. All fields must be strings.');
    }

    email = email ? email.trim().toLowerCase() : '';
    password = password ? password.trim() : '';
    role = role ? role.trim() : '';
    recaptchaToken = recaptchaToken ? recaptchaToken.trim() : '';

    if (!email || !password || !role) {
      res.status(400);
      throw new Error('Please provide email, password, and role');
    }

    // Google reCAPTCHA Verification (only when SECRET_KEY is set in environment)
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (!recaptchaToken) {
        res.status(400);
        throw new Error('Please complete the reCAPTCHA challenge.');
      }

      try {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`;
        const response = await fetch(verificationUrl, { method: 'POST' });
        const verifyData = await response.json();

        if (!verifyData.success) {
          res.status(400);
          throw new Error('reCAPTCHA verification failed. Please try again.');
        }
      } catch (err) {
        res.status(400);
        throw new Error(err.message || 'reCAPTCHA verification system error.');
      }
    }

    // 2. Match timing logic: Use a dummy comparison if user is not found to prevent user enumeration
    const user = await User.findOne({ email, role });
    const dummyHash = '$2b$10$abcdefghijklmnopqrstuvwxyza12345678901234567890123456789';

    if (!user) {
      // Fake bcrypt comparison to match the time taken by successful/unsuccessful password hashes
      await bcrypt.compare(password, dummyHash);
      res.status(401);
      throw new Error('Invalid email, password, or role');
    }

    // Compare actual password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email, password, or role');
    }

    // 3. Organizer Approval Check
    if (role === 'organizer' && !user.isApproved) {
      res.status(403);
      throw new Error('Approval pending from faculty');
    }

    res.json({
      success: true,
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  let { email } = req.body;

  try {
    if (email !== undefined && typeof email !== 'string') {
      res.status(400);
      throw new Error('Invalid input types. Email must be a string.');
    }

    email = email ? email.trim().toLowerCase() : '';
    if (!email) {
      res.status(400);
      throw new Error('Please provide email');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('User not found with this email');
    }

    // Generate random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Save to user (valid for 10 minutes)
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Simulate sending email
    await sendOtpEmail(email, otp);

    res.json({
      success: true,
      message: 'Password reset OTP sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  let { email, otp } = req.body;

  try {
    if (
      (email !== undefined && typeof email !== 'string') ||
      (otp !== undefined && typeof otp !== 'string')
    ) {
      res.status(400);
      throw new Error('Invalid input types. Email and OTP must be strings.');
    }

    email = email ? email.trim().toLowerCase() : '';
    otp = otp ? otp.trim() : '';

    if (!email || !otp) {
      res.status(400);
      throw new Error('Please provide email and OTP');
    }

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    // Generate temporary token for reset auth (expires in 15 minutes)
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is missing');
    }
    const tempToken = jwt.sign({ email, type: 'reset' }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      tempToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  let { email, otp, newPassword } = req.body;

  try {
    if (
      (email !== undefined && typeof email !== 'string') ||
      (otp !== undefined && typeof otp !== 'string') ||
      (newPassword !== undefined && typeof newPassword !== 'string')
    ) {
      res.status(400);
      throw new Error('Invalid input types. All fields must be strings.');
    }

    email = email ? email.trim().toLowerCase() : '';
    otp = otp ? otp.trim() : '';
    newPassword = newPassword ? newPassword.trim() : '';

    if (!email || !otp || !newPassword) {
      res.status(400);
      throw new Error('Please provide email, OTP, and newPassword');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
    }

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    // Save the new password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        heartsCount: user.heartsCount || 0,
        savesCount: user.savesCount || 0,
        sharesCount: user.sharesCount || 0,
        eventViewsCount: user.eventViewsCount || 0,
        registrationsCount: user.registrationsCount || 0,
        mobileNumber: user.mobileNumber || '',
        dob: user.dob || null,
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile stats (interactions)
// @route   PUT /api/auth/profile/stats
// @access  Private
const updateProfileStats = async (req, res, next) => {
  const { type, action } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    let pointsDiff = 0;
    if (type === 'hearts') {
      if (action === 'decrement') {
        if (user.heartsCount > 0) {
          user.heartsCount -= 1;
          pointsDiff = -1;
        }
      } else {
        user.heartsCount += 1;
        pointsDiff = 1;
      }
    } else if (type === 'saves') {
      if (action === 'decrement') {
        if (user.savesCount > 0) {
          user.savesCount -= 1;
          pointsDiff = -1;
        }
      } else {
        user.savesCount += 1;
        pointsDiff = 1;
      }
    } else if (type === 'shares') {
      user.sharesCount += 1;
      pointsDiff = 2;
    } else if (type === 'eventViews') {
      user.eventViewsCount += 1;
      pointsDiff = 1;
    } else if (type === 'registrations') {
      if (action === 'decrement') {
        if (user.registrationsCount > 0) {
          user.registrationsCount -= 1;
          pointsDiff = -10;
        }
      } else {
        user.registrationsCount += 1;
        pointsDiff = 10;
      }
    }

    user.points = Math.max(0, (user.points || 0) + pointsDiff);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points,
      heartsCount: user.heartsCount,
      savesCount: user.savesCount,
      sharesCount: user.sharesCount,
      eventViewsCount: user.eventViewsCount,
      registrationsCount: user.registrationsCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard (top users by points)
// @route   GET /api/auth/leaderboard
// @access  Private
const getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'student' })
      .sort({ points: -1 })
      .select('name points role');

    const leaderboard = users.map((u, index) => ({
      _id: u._id,
      name: u.name,
      points: u.points || 0,
      rank: index + 1
    }));

    const userRankInfo = leaderboard.find(u => u._id.toString() === req.user._id.toString());
    const userRank = userRankInfo ? userRankInfo.rank : leaderboard.length + 1;

    res.json({
      leaderboard: leaderboard.slice(0, 10),
      userRank
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth Login
// @route   POST /api/auth/google-login
// @access  Public
const googleLogin = async (req, res, next) => {
  let { token, role } = req.body;

  try {
    if (token !== undefined && typeof token !== 'string') {
      res.status(400);
      throw new Error('Token must be a string.');
    }
    if (role !== undefined && typeof role !== 'string') {
      res.status(400);
      throw new Error('Role must be a string.');
    }

    token = token ? token.trim() : '';
    role = role ? role.trim() : '';

    if (!token || !role) {
      res.status(400);
      throw new Error('Please provide Google token and role');
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      res.status(400);
      throw new Error('Invalid Google token');
    }

    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      res.status(400);
      throw new Error('Google account email is missing');
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google details
      user = await User.create({
        role,
        email,
        name,
        // Create a random secure password for Google logins
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-8),
        isApproved: role === 'organizer' ? false : true, // organizers must be approved
      });
    } else {
      // Verify role matches
      if (user.role !== role) {
        res.status(400);
        throw new Error(`Account already exists with a different role: ${user.role}`);
      }
    }

    // Organizer approval check
    if (role === 'organizer' && !user.isApproved) {
      res.status(403);
      throw new Error('Approval pending from faculty');
    }

    res.json({
      success: true,
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  const { name, mobileNumber, dob, country, state, city } = req.body;
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = name || user.name;
      user.mobileNumber = mobileNumber !== undefined ? mobileNumber : user.mobileNumber;
      user.dob = dob !== undefined ? dob : user.dob;
      user.country = country !== undefined ? country : user.country;
      user.state = state !== undefined ? state : user.state;
      user.city = city !== undefined ? city : user.city;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        mobileNumber: updatedUser.mobileNumber || '',
        dob: updatedUser.dob || null,
        country: updatedUser.country || '',
        state: updatedUser.state || '',
        city: updatedUser.city || '',
        points: updatedUser.points || 0,
        heartsCount: updatedUser.heartsCount || 0,
        savesCount: updatedUser.savesCount || 0,
        sharesCount: updatedUser.sharesCount || 0,
        eventViewsCount: updatedUser.eventViewsCount || 0,
        registrationsCount: updatedUser.registrationsCount || 0,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/auth/profile/password
// @access  Private
const changeUserPassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        res.status(400);
        throw new Error('Incorrect current password');
      }

      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
const deleteUserAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const Registration = require('../models/Registration');
      await Registration.deleteMany({ user: user._id });

      await User.deleteOne({ _id: user._id });

      res.json({ success: true, message: 'Account deleted successfully' });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};


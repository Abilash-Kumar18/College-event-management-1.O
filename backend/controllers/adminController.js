const User = require('../models/User');

// @desc    Create Faculty Account
// @route   POST /api/admin/create-faculty
// @access  Private/Admin
const createFaculty = async (req, res, next) => {
  let { name, email, password } = req.body;

  try {
    // NoSQL Injection prevention
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400);
      throw new Error('Invalid input types. All fields must be strings.');
    }

    name = name.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please fill in all required fields (name, email, password)');
    }

    // Validation
    const nameRegex = /^[a-zA-Z\s.]+$/;
    if (!nameRegex.test(name)) {
      res.status(400);
      throw new Error('Faculty name must contain only alphabets, dots, and spaces.');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Email address must end with @gmail.com or @ksrce.ac.in.');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      role: 'faculty',
      name,
      email,
      password,
      isApproved: true,
    });

    // Send email to newly created faculty
    try {
      const { sendFacultyAccountEmail } = require('../utils/email');
      const frontendUrl = process.env.FRONTEND_URL || 'https://team2-event-management.vercel.app';
      const loginLink = `${frontendUrl}/login`;
      await sendFacultyAccountEmail(email, name, password, loginLink);
    } catch (emailErr) {
      console.error('Failed to send faculty account creation email:', emailErr.message);
    }

    res.status(201).json({
      success: true,
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

module.exports = {
  createFaculty,
};

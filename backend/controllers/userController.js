const User = require('../models/User');

// @desc    Fetch users filterable by role (Students, Staff, Clubs)
// @route   GET /api/users
// @access  Private/Faculty/Admin
const getUsers = async (req, res, next) => {
  const { role } = req.query;

  try {
    let query = {};

    if (role) {
      const roleLower = role.toLowerCase();
      if (roleLower === 'students' || roleLower === 'student') {
        query.role = 'student';
      } else if (roleLower === 'staff' || roleLower === 'faculty') {
        query.role = 'faculty';
      } else if (roleLower === 'clubs' || roleLower === 'organizer') {
        query.role = 'organizer';
      } else if (roleLower === 'admin') {
        query.role = 'admin';
      } else {
        query.role = role;
      }
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    // req.user is loaded in protect middleware
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's profile info (Name, Email, Mobile/Phone, Password)
// @route   PUT /api/profile/me
// @access  Private
const updateProfile = async (req, res, next) => {
  let { name, email, mobileNumber, password } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // NoSQL Injection Prevention: Verify all inputs are strings if provided
    if (
      (name !== undefined && typeof name !== 'string') ||
      (email !== undefined && typeof email !== 'string') ||
      (password !== undefined && typeof password !== 'string') ||
      (mobileNumber !== undefined && typeof mobileNumber !== 'string')
    ) {
      res.status(400);
      throw new Error('Invalid input types. Submitted fields must be strings.');
    }

    // Update name if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName) {
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(trimmedName)) {
          res.status(400);
          throw new Error('Name must contain only alphabets and spaces.');
        }
        user.name = trimmedName;
      } else {
        res.status(400);
        throw new Error('Name cannot be empty.');
      }
    }

    // Update email if provided
    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|ksrce\.ac\.in)$/;
        if (!emailRegex.test(trimmedEmail)) {
          res.status(400);
          throw new Error('Email address must end with @gmail.com or @ksrce.ac.in.');
        }

        // Check if email is already in use by another user
        if (trimmedEmail !== user.email) {
          const emailExists = await User.findOne({ email: trimmedEmail });
          if (emailExists) {
            res.status(400);
            throw new Error('Email is already in use by another user.');
          }
          user.email = trimmedEmail;
        }
      } else {
        res.status(400);
        throw new Error('Email cannot be empty.');
      }
    }

    // Update mobile/phone if provided
    if (mobileNumber !== undefined) {
      const trimmedMobile = mobileNumber.trim();
      if (trimmedMobile) {
        const plainMobileRegex = /^\d{10}$/;
        const prefixedMobileRegex = /^\+91\d{10}$/;

        if (plainMobileRegex.test(trimmedMobile)) {
          user.mobileNumber = `+91${trimmedMobile}`;
        } else if (prefixedMobileRegex.test(trimmedMobile)) {
          user.mobileNumber = trimmedMobile;
        } else {
          res.status(400);
          throw new Error('Mobile number must be a valid 10-digit number with optional +91 prefix.');
        }
      } else {
        user.mobileNumber = undefined;
      }
    }

    // Update password if provided
    if (password !== undefined) {
      const trimmedPassword = password.trim();
      if (trimmedPassword) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(trimmedPassword)) {
          res.status(400);
          throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).');
        }
        user.password = trimmedPassword; // This will trigger the pre-save bcrypt hook in User model
      }
    }

    const updatedUser = await user.save();
    
    // Convert to object and omit password
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getProfile,
  updateProfile,
};

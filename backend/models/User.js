const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin', 'organizer'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
    },
    regNo: {
      type: String,
      required: function() {
        return this.role === 'student';
      },
      trim: true,
    },
    deptYear: {
      type: String,
      required: function() {
        return this.role === 'student';
      },
      trim: true,
    },
    clubName: {
      type: String,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    resetPasswordOtp: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    points: {
      type: Number,
      default: 0,
    },
    heartsCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    eventViewsCount: {
      type: Number,
      default: 0,
    },
    registrationsCount: {
      type: Number,
      default: 0,
    },
    dob: {
      type: Date,
    },
    country: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to match passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

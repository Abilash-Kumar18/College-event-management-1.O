const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    status: {
      type: String,
      enum: ['Registered', 'Checked-in', 'Pending', 'Cancelled', 'Absent'],
      default: 'Registered',
    },
    qrCodeId: {
      type: String,
      required: true,
      unique: true,
    },
    sixDigitId: {
      type: String,
      required: true,
      unique: true,
    },
    scanTime: {
      type: Date,
    },
    points: {
      type: Number,
      default: 0,
    },
    collegeName: {
      type: String,
      trim: true,
      default: 'K.S.R. College Of Engineering',
    },
    teamDetails: {
      type: String,
      trim: true,
    },
    paymentScreenshot: {
      type: String, // Stored as base64 Data URL
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Registration', registrationSchema);

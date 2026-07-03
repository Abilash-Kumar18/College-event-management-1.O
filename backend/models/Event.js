const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    organizerDept: {
      type: String,
      required: true,
      trim: true,
    },
    clubName: {
      type: String,
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    maxParticipants: {
      type: Number,
      required: true,
    },
    posterUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Closed', 'Pending Review', 'Approved', 'Rejected', 'Deleted'],
      default: 'Pending Review',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    coordinationStatus: {
      type: String,
      enum: ['Pending', 'Accepted', 'Denied'],
      default: 'Pending',
    },
    qrCode: {
      type: String,
    },
    mode: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    registrationType: {
      type: String,
      enum: ['solo', 'team'],
      default: 'solo',
    },
    priceType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    upiNumber: {
      type: String,
      trim: true,
    },
    entryFee: {
      type: Number,
      default: 0,
    },
    fromDate: {
      type: Date,
    },
    toDate: {
      type: Date,
    },
    studentCoordinators: [
      {
        name: { type: String, trim: true },
        regNo: { type: String, trim: true },
        dept: { type: String, trim: true },
        phone: { type: String, trim: true }
      }
    ],
    facultyContact: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const { generateQRCode } = require('../utils/qrGenerator');

eventSchema.pre('save', async function (next) {
  if (!this.qrCode) {
    try {
      this.qrCode = await generateQRCode(this._id.toString());
    } catch (err) {
      console.error('Failed to pre-generate QR code for event:', err);
    }
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);

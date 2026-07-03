const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
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
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    type: {
      type: String,
      enum: ['Participation', 'Merit'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Certificate', certificateSchema);

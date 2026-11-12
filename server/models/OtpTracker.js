const mongoose = require('mongoose');

const OtpTrackerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true,
  },
  sendCount: {
    type: Number,
    default: 0,
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  adminFailedAttempts: {
    type: Number,
    default: 0,
  },
  adminLockUntil: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

OtpTrackerSchema.index({ email: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('OtpTracker', OtpTrackerSchema);


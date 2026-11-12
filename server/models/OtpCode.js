const mongoose = require('mongoose');

const OtpCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
  lastSentAt: {
    type: Date,
    required: true,
  },
}, { versionKey: false });

OtpCodeSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('OtpCode', OtpCodeSchema);


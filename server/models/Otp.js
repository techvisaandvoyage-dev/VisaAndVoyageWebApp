const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  identifier: { // Can be email or phone
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    default: ''
  },
  otpHash: {
    type: String,
    default: ''
  },
  channel: {
    type: String,
    enum: ['sms', 'whatsapp', 'email', 'legacy'],
    default: 'legacy'
  },
  purpose: {
    type: String,
    enum: ['signup', 'login', 'password_reset', 'popup-auth', 'auth', 'profile-phone'],
    default: 'signup'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Document expires 10 minutes after creation
    expires: 600
  }
});

module.exports = mongoose.model('Otp', OtpSchema);

const mongoose = require('mongoose');

const captchaSchema = new mongoose.Schema({
  captchaId: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Document automatically deleted after 5 minutes (300 seconds)
  }
});

module.exports = mongoose.model('Captcha', captchaSchema);

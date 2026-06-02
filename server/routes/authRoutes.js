const express = require('express');
const router = express.Router();
const { getOtpConfig, sendOtp, verifyOtp } = require('../controllers/authOtpController');

router.get('/otp-config', getOtpConfig);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;

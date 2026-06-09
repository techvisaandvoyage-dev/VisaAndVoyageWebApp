const express = require('express');
const router = express.Router();
const { getOtpConfig, checkPhone, sendOtp, verifyOtp } = require('../controllers/authOtpController');

router.get('/otp-config', getOtpConfig);
router.post('/check-phone', checkPhone);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
  sendAdminOtp,
  resendAdminOtp,
  verifyAdminOtp,
  getPublicAllowedAdminEmails,
  getAuthorizedAdminEmails,
  sendAddAdminOtp,
  resendAddAdminOtp,
  addAuthorizedAdminEmail,
  removeAuthorizedAdminEmail,
  getAdminSession,
} = require('../controllers/adminAuthController');

// Public routes for Admin Login with OTP
router.post('/send-otp', sendAdminOtp);
router.post('/resend-otp', resendAdminOtp);
router.post('/verify-otp', verifyAdminOtp);
router.get('/allowed-emails', getPublicAllowedAdminEmails);

// Protected routes for Authorized Admin Email Management
router.get('/emails', protect, requireAdmin, getAuthorizedAdminEmails);
router.post('/emails/send-otp', protect, requireAdmin, sendAddAdminOtp);
router.post('/emails/resend-otp', protect, requireAdmin, resendAddAdminOtp);
router.post('/emails', protect, requireAdmin, addAuthorizedAdminEmail);
router.delete('/emails', protect, requireAdmin, removeAuthorizedAdminEmail);

// Session check
router.get('/me', protect, requireAdmin, getAdminSession);

module.exports = router;


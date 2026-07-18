
const express = require('express');
const router = express.Router();
const { 
  signupUser, 
  verifyOtp, 
  verifyLoginOtp,
  sendLoginOtp,
  firebaseAuthLogin,
  firebaseGoogleLogin,
  loginUser,
  getUserProfile,
  updateUserProfile,
  completeUserProfile,
  requestProfilePhoneOtp,
  verifyProfilePhoneOtp,
  uploadProfileImage,
  resetPasswordRequest,
  requestForgotPasswordOtp,
  resetForgotPassword,
  changePassword,
  popupRequestOtp,
  popupVerifyOtp,
  popupCompleteSignup,
  deleteUserAccount,
  deleteAccountSendOtp,
  deleteAccountVerifyOtp,
  deleteAccountGenerateCaptcha,
  deleteAccountVerifyCaptcha
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/uploadConfig');
const { uploadOptimizer, processFiles, saveDocumentsToDisk } = require('../utils/uploadOptimizer');
const {
  submitApplication,
  createCheckoutDraft,
  updateUserApplication,
  appendApplicationDocuments,
  getUserApplicationById,
  getUserApplications,
} = require('../controllers/applicationController');
const { createOrder, verifyPayment, cancelPayment, failPayment, getMyTransactions } = require('../controllers/paymentController');

const handleDocumentUploadMiddleware = (req, res, next) => {
  uploadOptimizer.array('documents', 25)(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 300KB limit. Please upload a smaller file.',
      });
    }
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Could not process upload.',
    });
  });
};

// Auth routes
router.post('/signup', signupUser);
router.post('/verify-otp', verifyOtp);
router.post('/send-login-otp', sendLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/firebase-auth', firebaseAuthLogin);
router.post('/firebase-google', firebaseGoogleLogin);
router.post('/login', loginUser);
router.post('/forgot-password/request-otp', requestForgotPasswordOtp);
router.post('/forgot-password/reset', resetForgotPassword);
router.post('/popup/request-otp', popupRequestOtp);
router.post('/popup/verify-otp', popupVerifyOtp);
router.post('/popup/complete-signup', popupCompleteSignup);

// Profile routes
router.get('/profile', protect, getUserProfile);
router.put('/profile/update', protect, updateUserProfile);
router.put('/profile/complete', protect, completeUserProfile);
router.post('/profile/phone/request-otp', protect, requestProfilePhoneOtp);
router.post('/profile/phone/verify-otp', protect, verifyProfilePhoneOtp);
router.post('/profile/upload-image', protect, upload.single('profileImage'), uploadProfileImage);
router.post('/profile/reset-request', protect, resetPasswordRequest);
router.put('/change-password', protect, changePassword);

// Delete Account routes
const rateLimit = require('express-rate-limit');
const deleteAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});

router.post('/profile/delete/send-otp', protect, deleteAccountLimiter, deleteAccountSendOtp);
router.post('/profile/delete/verify-otp', protect, deleteAccountLimiter, deleteAccountVerifyOtp);
router.get('/profile/delete/security-check', protect, deleteAccountGenerateCaptcha);
router.post('/profile/delete/verify-security-check', protect, deleteAccountVerifyCaptcha);
router.delete('/profile', protect, deleteAccountLimiter, deleteUserAccount);

// Application routes
router.post('/application', protect, uploadOptimizer.array('documents', 5), processFiles, submitApplication);
router.post('/application/checkout-draft', protect, createCheckoutDraft);
router.put('/applications/:id', protect, updateUserApplication);
router.post(
  '/applications/:id/documents',
  protect,
  handleDocumentUploadMiddleware,
  saveDocumentsToDisk,
  appendApplicationDocuments
);
router.get('/applications/:id', protect, getUserApplicationById);
router.get('/applications', protect, getUserApplications);

// Payment Routes
router.post('/payments/create-order', protect, createOrder);
router.post('/payments/verify', protect, verifyPayment);
router.post('/payments/cancel', protect, cancelPayment);
router.post('/payments/fail', protect, failPayment);
router.get('/payments/my-transactions', protect, getMyTransactions);

module.exports = router;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const Settings = require('../models/Settings');
const {
  DEFAULT_ADMIN_EMAILS,
  getAllowedAdminEmails,
  isEmailAuthorized,
  checkUserLockout,
  sendOtp,
  resendOtp,
  verifyOtp,
} = require('../utils/adminOtpService');

const isDbConnected = () => {
  try {
    const mongoose = require('mongoose');
    return Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
  } catch {
    return false;
  }
};

/**
 * Generate standard admin JWT token
 */
const generateToken = (id, email) => {
  return jwt.sign(
    { id: String(id), email: String(email).toLowerCase(), role: 'admin' },
    process.env.JWT_SECRET || 'local_development_secret_key',
    { expiresIn: '7d' }
  );
};

/**
 * @desc    Send OTP to authorized admin email
 * @route   POST /api/admin/auth/send-otp
 * @access  Public (Strictly restricted to Whitelisted Admin Emails)
 */
exports.sendAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your administrator email address.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    // STRICT WHITELIST CHECK: Reject immediately if not in the authorized admin list
    const authorized = await isEmailAuthorized(cleanEmail);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This email is not authorized for Admin access. Only whitelisted administrators are permitted.',
      });
    }

    // Check if admin is locked out
    await checkUserLockout(cleanEmail, 'admin:login');

    const result = await sendOtp({
      email: cleanEmail,
      purpose: 'admin:login',
    });

    return res.status(200).json({
      success: true,
      message: result.message || 'Verification code sent to your email address.',
      cooldownSeconds: result.cooldownSeconds || 30,
      expiresInSeconds: result.expiresInSeconds || 120,
      devOtp: result.devOtp,
    });
  } catch (error) {
    console.error('sendAdminOtp error:', error);
    const status = error.status || (error.message.includes('wait') ? 429 : 400);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to send verification code. Please try again.',
      cooldownRemaining: error.cooldownRemaining,
    });
  }
};

/**
 * @desc    Resend OTP to authorized admin email
 * @route   POST /api/admin/auth/resend-otp
 * @access  Public (Strictly restricted to Whitelisted Admin Emails)
 */
exports.resendAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your administrator email address.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const authorized = await isEmailAuthorized(cleanEmail);

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This email is not authorized for Admin access.',
      });
    }

    // Check lockout
    await checkUserLockout(cleanEmail, 'admin:login');

    const result = await resendOtp({
      email: cleanEmail,
      purpose: 'admin:login',
    });

    return res.status(200).json({
      success: true,
      message: result.message || 'New verification code sent.',
      cooldownSeconds: result.cooldownSeconds || 30,
      expiresInSeconds: result.expiresInSeconds || 120,
      devOtp: result.devOtp,
    });
  } catch (error) {
    console.error('resendAdminOtp error:', error);
    const status = error.status || (error.message.includes('wait') ? 429 : 400);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to resend verification code. Please try again.',
      cooldownRemaining: error.cooldownRemaining,
    });
  }
};

/**
 * @desc    Verify OTP and generate Admin authentication token
 * @route   POST /api/admin/auth/verify-otp
 * @access  Public (Strictly restricted to Whitelisted Admin Emails)
 */
exports.verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are both required.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim().replace(/\D/g, '');

    const authorized = await isEmailAuthorized(cleanEmail);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This email is not authorized for Admin access.',
      });
    }

    // Verify OTP code
    await verifyOtp({
      email: cleanEmail,
      otp: cleanOtp,
      purpose: 'admin:login',
      consume: true,
    });

    // Ensure Admin document exists in MongoDB for this email so admin._id is a valid ObjectId
    let admin = null;
    if (isDbConnected()) {
      try {
        admin = await Admin.findOne({ email: cleanEmail });
        if (!admin) {
          const salt = await bcrypt.genSalt(10);
          const randomPass = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);
          admin = await Admin.create({
            email: cleanEmail,
            password: randomPass,
          });
        }
      } catch (dbErr) {
        console.warn('[AdminAuth] Admin record sync warning:', dbErr.message);
      }
    }

    const adminId = admin?._id || new (require('mongoose').Types.ObjectId)();
    const token = generateToken(adminId, cleanEmail);

    return res.status(200).json({
      success: true,
      message: 'Admin authentication successful.',
      token,
      admin: {
        id: String(adminId),
        email: cleanEmail,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('verifyAdminOtp error:', error);
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Invalid or expired verification code. Please check and try again.',
      remainingAttempts: error.remainingAttempts,
      isLocked: error.isLocked,
    });
  }
};

/**
 * @desc    Get allowed admin emails for public client pre-check
 * @route   GET /api/admin/auth/allowed-emails
 * @access  Public
 */
exports.getPublicAllowedAdminEmails = async (req, res) => {
  try {
    const emails = await getAllowedAdminEmails();
    return res.status(200).json({
      success: true,
      emails,
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      emails: DEFAULT_ADMIN_EMAILS,
    });
  }
};

/**
 * @desc    Get all authorized admin emails
 * @route   GET /api/admin/auth/emails
 * @access  Private (Admin only)
 */
exports.getAuthorizedAdminEmails = async (req, res) => {
  try {
    const emails = await getAllowedAdminEmails();
    return res.status(200).json({
      success: true,
      emails,
    });
  } catch (error) {
    console.error('getAuthorizedAdminEmails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch authorized admin emails.',
    });
  }
};

/**
 * @desc    Send verification OTP to an email before authorizing it as Admin
 * @route   POST /api/admin/auth/emails/send-otp
 * @access  Private (Admin only)
 */
exports.sendAddAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const currentList = await getAllowedAdminEmails();
    if (currentList.includes(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'This email is already in the authorized administrator list.',
      });
    }

    const result = await sendOtp({
      email: cleanEmail,
      purpose: 'admin:add-email',
    });

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please enter the code to confirm authorization.`,
      cooldownSeconds: result.cooldownSeconds || 30,
      expiresInSeconds: result.expiresInSeconds || 120,
      devOtp: result.devOtp,
    });
  } catch (error) {
    console.error('sendAddAdminOtp error:', error);
    const status = error.status || (error.message.includes('wait') ? 429 : 400);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to send verification code to this email.',
      cooldownRemaining: error.cooldownRemaining,
    });
  }
};

/**
 * @desc    Resend verification OTP for adding admin email
 * @route   POST /api/admin/auth/emails/resend-otp
 * @access  Private (Admin only)
 */
exports.resendAddAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const result = await resendOtp({
      email: cleanEmail,
      purpose: 'admin:add-email',
    });

    return res.status(200).json({
      success: true,
      message: `Verification code resent to ${cleanEmail}.`,
      cooldownSeconds: result.cooldownSeconds || 30,
      expiresInSeconds: result.expiresInSeconds || 120,
      devOtp: result.devOtp,
    });
  } catch (error) {
    console.error('resendAddAdminOtp error:', error);
    const status = error.status || (error.message.includes('wait') ? 429 : 400);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to resend verification code.',
      cooldownRemaining: error.cooldownRemaining,
    });
  }
};

/**
 * @desc    Verify OTP and Add a new authorized admin email
 * @route   POST /api/admin/auth/emails
 * @access  Private (Admin only)
 */
exports.addAuthorizedAdminEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required to authorize this email as Administrator.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Verify OTP code
    await verifyOtp({
      email: cleanEmail,
      otp: String(otp).trim(),
      purpose: 'admin:add-email',
      consume: true,
    });

    let settings = await Settings.findOne({ singleton: 'global' });
    if (!settings) {
      settings = await Settings.create({ singleton: 'global' });
    }

    let currentList = await getAllowedAdminEmails();

    if (currentList.includes(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'This email is already in the authorized administrator list.',
      });
    }

    currentList.push(cleanEmail);
    settings.authorizedAdminEmails = Array.from(new Set(currentList));
    await settings.save();

    return res.status(200).json({
      success: true,
      message: `${cleanEmail} verified and successfully added to authorized administrators.`,
      emails: settings.authorizedAdminEmails,
    });
  } catch (error) {
    console.error('addAuthorizedAdminEmail error:', error);
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Invalid or expired verification code. Failed to authorize admin email.',
    });
  }
};

/**
 * @desc    Remove an authorized admin email
 * @route   DELETE /api/admin/auth/emails
 * @access  Private (Admin only)
 */
exports.removeAuthorizedAdminEmail = async (req, res) => {
  try {
    const emailToRemove = req.body?.email || req.query?.email;
    if (!emailToRemove) {
      return res.status(400).json({
        success: false,
        message: 'Please specify the email to remove.',
      });
    }

    const cleanEmail = String(emailToRemove).trim().toLowerCase();

    let settings = await Settings.findOne({ singleton: 'global' });
    if (!settings) {
      settings = await Settings.create({ singleton: 'global' });
    }

    let currentList = await getAllowedAdminEmails();

    if (!currentList.includes(cleanEmail)) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in the authorized list.',
      });
    }

    if (currentList.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last remaining administrator email. At least one admin must exist.',
      });
    }

    currentList = currentList.filter((e) => e !== cleanEmail);
    settings.authorizedAdminEmails = currentList;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: `${cleanEmail} has been removed from authorized administrators.`,
      emails: settings.authorizedAdminEmails,
    });
  } catch (error) {
    console.error('removeAuthorizedAdminEmail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove authorized admin email.',
    });
  }
};

/**
 * @desc    Get current admin session details
 * @route   GET /api/admin/auth/me
 * @access  Private (Admin only)
 */
exports.getAdminSession = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.user || { role: 'admin' },
  });
};

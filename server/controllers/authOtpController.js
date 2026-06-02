const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  loadOtpSettings,
  publicOtpConfigFromSettings,
  sendConfiguredOtp,
  verifyStoredOtp,
  findUserForIdentifier,
  normalizeIdentifier,
} = require('../services/otpAuthService');

const generateToken = (id) => jwt.sign({ id: String(id), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });

const safeUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  isVerified: user.isVerified,
  profileImage: user.profileImage,
  hasPassword: Boolean(user.password),
  createdAt: user.createdAt,
});

const getOtpConfig = async (_req, res) => {
  const settings = await loadOtpSettings();
  res.json({ success: true, config: publicOtpConfigFromSettings(settings) });
};

const sendOtp = async (req, res) => {
  try {
    const result = await sendConfiguredOtp({
      rawIdentifier: req.body.identifier || req.body.phone || req.body.email,
      requestedChannel: req.body.channel || 'auto',
      purpose: req.body.purpose || 'auth',
    });
    res.json({
      success: true,
      channel: result.channel,
      otpLength: result.otpLength,
      message: `OTP sent via ${result.channel}`,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to send OTP',
      waitSeconds: error.waitSeconds,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.phone || req.body.email;
    const parsed = normalizeIdentifier(rawIdentifier);
    const consume = Boolean(req.body.profile || req.body.name || req.body.firstName || req.body.completeSignup);
    const verified = await verifyStoredOtp({
      rawIdentifier,
      otp: req.body.otp,
      purpose: req.body.purpose || 'auth',
      consume,
    });

    let user = await findUserForIdentifier(parsed);
    if (user) {
      user.isVerified = true;
      if (parsed.type === 'phone') user.phone = parsed.key;
      await user.save();
      if (!consume) {
        await verifyStoredOtp({
          rawIdentifier,
          otp: req.body.otp,
          purpose: req.body.purpose || 'auth',
          consume: true,
        }).catch(() => {});
      }
      const safe = await User.findById(user._id).select('-password').lean();
      return res.json({
        success: true,
        userExists: true,
        token: generateToken(user._id),
        user: safeUserPayload(safe),
      });
    }

    const profile = req.body.profile || {};
    const name = String(
      req.body.name ||
      profile.name ||
      `${req.body.firstName || profile.firstName || ''} ${req.body.lastName || profile.lastName || ''}`
    ).trim();
    const email = String(req.body.email || profile.email || '').trim().toLowerCase();
    const password = String(req.body.password || profile.password || '').trim();

    if (!consume || !name) {
      return res.json({ success: true, userExists: false, verified: true, message: 'OTP verified. Continue signup.' });
    }

    if (parsed.type === 'email' || email) {
      const emailToCheck = parsed.type === 'email' ? parsed.key : email;
      if (emailToCheck) {
        const emailTaken = await User.findOne({ email: emailToCheck });
        if (emailTaken) return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    const randomPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
    user = await User.create({
      name,
      ...(parsed.type === 'email' ? { email: parsed.key } : {}),
      ...(parsed.type === 'phone' ? { phone: parsed.key } : {}),
      ...(parsed.type === 'phone' && email ? { email } : {}),
      password: password || randomPassword,
      isVerified: true,
    });

    const safe = await User.findById(user._id).select('-password').lean();
    return res.json({
      success: true,
      userExists: false,
      token: generateToken(user._id),
      user: safeUserPayload(safe),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'OTP verification failed',
    });
  }
};

module.exports = { getOtpConfig, sendOtp, verifyOtp };

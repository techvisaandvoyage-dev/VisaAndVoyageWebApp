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
const { publicAuthControlsFromSettings } = require('./authSettingsController');

const generateToken = (id) => jwt.sign({ id: String(id), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });

const hasUserPassword = (user) => Boolean(user?.password && (user.passwordManuallySet || !user.phone));

const splitName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const isProfileComplete = (user) =>
  Boolean(user?.firstName && user?.lastName && (user?.email || user?.phone));

const safeUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  authProvider: user.authProvider,
  profileCompleted: Boolean(user.profileCompleted || isProfileComplete(user)),
  isVerified: user.isVerified,
  profileImage: user.profileImage,
  hasPassword: hasUserPassword(user),
  createdAt: user.createdAt,
});

const getOtpConfig = async (_req, res) => {
  const settings = await loadOtpSettings();
  res.json({
    success: true,
    config: publicOtpConfigFromSettings(settings),
    authControls: publicAuthControlsFromSettings(settings),
  });
};

const sendOtp = async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.phone || req.body.email;
    if (req.body.rejectExisting === true || req.body.rejectExisting === 'true') {
      const parsed = normalizeIdentifier(rawIdentifier);
      if (parsed.type !== 'invalid') {
        const existingUser = await findUserForIdentifier(parsed);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message:
              parsed.type === 'phone'
                ? 'User already exists with this phone number.'
                : 'User already exists with this email.',
          });
        }
      }
    }

    const result = await sendConfiguredOtp({
      rawIdentifier,
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
      if (!user.authProvider) user.authProvider = parsed.type === 'phone' ? 'phoneOtp' : 'emailOtp';
      await user.save();
      if (!consume) {
        await verifyStoredOtp({
          rawIdentifier,
          otp: req.body.otp,
          purpose: req.body.purpose || 'auth',
          consume: true,
        }).catch(() => {});
      }
      const safe = await User.findById(user._id).lean();
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
    const nameParts = splitName(name);

    if (!consume) {
      return res.json({ success: true, userExists: false, verified: true, message: 'OTP verified. Continue signup.' });
    }

    if (parsed.type === 'email' || email) {
      const emailToCheck = parsed.type === 'email' ? parsed.key : email;
      if (emailToCheck) {
        const emailTaken = await User.findOne({ email: emailToCheck });
        if (emailTaken) return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    user = await User.create({
      name,
      ...(parsed.type === 'email' ? { email: parsed.key } : {}),
      ...(parsed.type === 'phone' ? { phone: parsed.key } : {}),
      ...(parsed.type === 'phone' && email ? { email } : {}),
      ...(password ? { password, passwordManuallySet: true } : {}),
      firstName: nameParts.firstName || undefined,
      lastName: nameParts.lastName || undefined,
      authProvider: password ? 'password' : parsed.type === 'phone' ? 'phoneOtp' : 'emailOtp',
      profileCompleted: Boolean(password && nameParts.firstName && nameParts.lastName),
      isVerified: true,
    });

    const safe = await User.findById(user._id).lean();
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

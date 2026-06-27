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

const checkDuplicateUser = async (email, phone) => {
  const emailToCheck = email ? String(email).trim().toLowerCase() : null;
  
  let phoneToCheck = null;
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length >= 10) {
      phoneToCheck = digits.slice(-10);
    }
  }

  if (!emailToCheck && !phoneToCheck) return null;

  let emailMatchedUser = null;
  let phoneMatchedUser = null;

  if (emailToCheck) {
    emailMatchedUser = await User.findOne({ email: emailToCheck });
  }
  if (phoneToCheck) {
    phoneMatchedUser = await User.findOne({
      $or: [
        { phone: phoneToCheck },
        { phone: `91${phoneToCheck}` },
        { phone: `+91${phoneToCheck}` }
      ]
    });
  }

  if (emailMatchedUser && phoneMatchedUser) {
    return {
      message: "User already exists. Login to continue.",
      field: "both"
    };
  } else if (emailMatchedUser) {
    return {
      message: "User already exists. Login to continue.",
      field: "email"
    };
  } else if (phoneMatchedUser) {
    return {
      message: "User already exists. Login to continue.",
      field: "phone"
    };
  }
  return null;
};

const checkPhone = async (req, res) => {
  try {
    const parsed = normalizeIdentifier(req.body.phone);
    if (parsed.type !== 'phone') {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    const existingUser = await findUserForIdentifier(parsed);
    return res.json({ exists: Boolean(existingUser) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not check phone number' });
  }
};

const sendOtp = async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.phone || req.body.email;
    const purpose = req.body.purpose || 'auth';
    const parsed = normalizeIdentifier(rawIdentifier);
    const rejectExisting = req.body.rejectExisting === true || req.body.rejectExisting === 'true';
    const popupFlow = req.body.popupFlow === true || req.body.popupFlow === 'true';

    if (parsed.type === 'invalid') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address or 10-digit mobile number',
      });
    }

    if (purpose === 'auth' && !rejectExisting && !popupFlow) {
      const existingUser = await findUserForIdentifier(parsed);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message:
            parsed.type === 'phone'
              ? 'This mobile number is not registered. Please sign up first.'
              : 'This email is not registered. Please sign up first.',
        });
      }

      if (!existingUser.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Account not verified. Please complete signup first.',
        });
      }
    }

    if (rejectExisting) {
      if (parsed.type !== 'invalid') {
        const dup = await checkDuplicateUser(
          parsed.type === 'email' ? parsed.key : null,
          parsed.type === 'phone' ? parsed.key : null
        );
        if (dup) {
          return res.status(400).json({
            success: false,
            message: dup.message,
            field: dup.field
          });
        }
      }
    }

    const result = await sendConfiguredOtp({
      rawIdentifier,
      requestedChannel: req.body.channel || 'auto',
      purpose,
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
    
    // Always verify without consuming first, so we don't delete the OTP if subsequent checks fail
    const verified = await verifyStoredOtp({
      rawIdentifier,
      otp: req.body.otp,
      purpose: req.body.purpose || 'auth',
      consume: false,
    });

    let user = await findUserForIdentifier(parsed);
    if (user) {
      user.isVerified = true;
      if (parsed.type === 'phone') user.phone = parsed.key;
      if (!user.authProvider) user.authProvider = parsed.type === 'phone' ? 'phoneOtp' : 'emailOtp';
      await user.save();
      
      // Existing user -> we definitely want to consume now
      await verifyStoredOtp({
        rawIdentifier,
        otp: req.body.otp,
        purpose: req.body.purpose || 'auth',
        consume: true,
      }).catch(() => {});
      
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
      const emailToCheck = parsed.type === 'email' ? parsed.key : null;
      const phoneToCheck = parsed.type === 'phone' ? parsed.key : null;
      const dup = await checkDuplicateUser(emailToCheck, phoneToCheck);
      if (dup) {
        return res.status(400).json({
          success: false,
          message: dup.message,
          field: dup.field
        });
      }
      return res.json({ success: true, userExists: false, verified: true, message: 'OTP verified. Continue signup.' });
    }

    const emailToCheck = parsed.type === 'email' ? parsed.key : email;
    const phoneToCheck = parsed.type === 'phone' ? parsed.key : (req.body.phone || req.body.profile?.phone);
    const dup = await checkDuplicateUser(emailToCheck, phoneToCheck);
    if (dup) {
      return res.status(400).json({
        success: false,
        message: dup.message,
        field: dup.field
      });
    }

    // All checks passed and consume is true, delete the OTP
    await verifyStoredOtp({
      rawIdentifier,
      otp: req.body.otp,
      purpose: req.body.purpose || 'auth',
      consume: true,
    }).catch(() => {});

    const profileCompleted =
      Boolean(
        nameParts.firstName &&
        nameParts.lastName &&
        (
          (parsed.type === 'phone' && email) ||
          parsed.type === 'email' ||
          password
        )
      );

    user = await User.create({
      name,
      ...(parsed.type === 'email' ? { email: parsed.key } : {}),
      ...(parsed.type === 'phone' ? { phone: parsed.key } : {}),
      ...(parsed.type === 'phone' && email ? { email } : {}),
      ...(password ? { password, passwordManuallySet: true } : {}),
      firstName: nameParts.firstName || undefined,
      lastName: nameParts.lastName || undefined,
      authProvider: password ? 'password' : parsed.type === 'phone' ? 'phoneOtp' : 'emailOtp',
      profileCompleted,
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

module.exports = { getOtpConfig, checkPhone, sendOtp, verifyOtp };

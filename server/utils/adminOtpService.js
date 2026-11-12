const crypto = require('crypto');
const nodemailer = require('nodemailer');
const OtpCode = require('../models/OtpCode');
const OtpTracker = require('../models/OtpTracker');
const Settings = require('../models/Settings');
const sendEmail = require('./sendEmail');

// Fallback baseline of authorized Administrator emails
const DEFAULT_ADMIN_EMAILS = [
  'yashrajsingh28359@gmail.com',
  'gauravajm@gmail.com',
  'merakimovies@gmail.com',
  'tech.visaandvoyage@gmail.com',
];

const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN || 30);
const MAX_ADMIN_FAILED_ATTEMPTS = 3;
const OTP_LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours lock
const OTP_EXPIRY_MINUTES = 2; // Exactly 2 minutes validity

// In-memory fallback stores
const otpStore = new Map();
const lockStore = new Map();

const isDbConnected = () => {
  try {
    const mongoose = require('mongoose');
    return Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
  } catch {
    return false;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getStoreKey = (email, purpose = 'admin:login') => `${purpose}:${normalizeEmail(email)}`;

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
};

const generateOtp = (length = 4) => {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
};

const getTodayDateStr = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
};

const formatLockUntil = (date) => {
  const d = new Date(date);
  return (
    d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' IST'
  );
};

/**
 * Get dynamic list of allowed admin emails from Settings or env or defaults
 */
const getAllowedAdminEmails = async () => {
  if (isDbConnected()) {
    try {
      const settings = await Settings.findOne({ singleton: 'global' }).select('authorizedAdminEmails').lean();
      if (settings && Array.isArray(settings.authorizedAdminEmails) && settings.authorizedAdminEmails.length > 0) {
        const dbEmails = settings.authorizedAdminEmails
          .map((e) => String(e).trim().toLowerCase())
          .filter(Boolean);
        if (dbEmails.length > 0) {
          return Array.from(new Set(dbEmails));
        }
      }
    } catch (err) {
      console.warn('[AdminAuth] Error fetching authorizedAdminEmails from db:', err.message);
    }
  }

  const envList = (process.env.ALLOWED_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return envList.length > 0 ? Array.from(new Set(envList)) : DEFAULT_ADMIN_EMAILS;
};

/**
 * Check if email is in the authorized admin whitelist
 */
const isEmailAuthorized = async (email) => {
  if (!email) return false;
  const clean = normalizeEmail(email);
  const allowed = await getAllowedAdminEmails();
  return allowed.includes(clean);
};

/**
 * Check if administrator account is locked out after 3 wrong OTP attempts
 */
const checkUserLockout = async (email, purpose = 'admin:login') => {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;

  const lockKey = `admin:${cleanEmail}`;
  const now = Date.now();
  let lockUntil = null;

  // 1. Check in-memory store
  const mem = lockStore.get(lockKey);
  if (mem && mem.lockUntil) {
    lockUntil = new Date(mem.lockUntil);
  }

  // 2. Check DB OtpTracker if connected
  if (isDbConnected()) {
    try {
      const dbRecord = await OtpTracker.findOne({
        email: cleanEmail,
        adminLockUntil: { $gt: new Date(now) },
      }).sort({ adminLockUntil: -1 });

      if (dbRecord && dbRecord.adminLockUntil) {
        lockUntil = dbRecord.adminLockUntil;
        lockStore.set(lockKey, {
          failedAttempts: dbRecord.adminFailedAttempts || MAX_ADMIN_FAILED_ATTEMPTS,
          lockUntil: new Date(lockUntil).getTime(),
        });
      }
    } catch (dbErr) {
      console.warn('[OtpTracker] Admin lock check error:', dbErr.message);
    }
  }

  if (lockUntil && new Date(lockUntil).getTime() > now) {
    const lockTimeStr = formatLockUntil(lockUntil);
    const err = new Error(
      `Too many failed attempts. Admin OTP login is locked for 24 hours. Try again after ${lockTimeStr}.`
    );
    err.status = 429;
    err.isLocked = true;
    err.lockUntil = lockUntil;
    err.remainingAttempts = 0;
    throw err;
  }

  // Auto-unlock after lockUntil has passed
  if (lockUntil && new Date(lockUntil).getTime() <= now) {
    await resetFailedAttempts(cleanEmail, purpose);
  }
};

/**
 * Record a failed attempt. Locks out if 3 attempts are reached.
 */
const recordFailedAttempt = async (email, purpose = 'admin:login') => {
  const cleanEmail = normalizeEmail(email);
  const lockKey = `admin:${cleanEmail}`;
  const now = Date.now();
  const dateStr = getTodayDateStr();

  let failedAttempts = 0;
  const mem = lockStore.get(lockKey);
  if (mem && typeof mem.failedAttempts === 'number') {
    failedAttempts = mem.failedAttempts;
  } else if (isDbConnected()) {
    try {
      const tracker = await OtpTracker.findOne({ email: cleanEmail, date: dateStr });
      if (tracker && typeof tracker.adminFailedAttempts === 'number') {
        failedAttempts = tracker.adminFailedAttempts;
      }
    } catch (_) {}
  }

  failedAttempts += 1;

  if (failedAttempts >= MAX_ADMIN_FAILED_ATTEMPTS) {
    const lockUntil = new Date(now + OTP_LOCKOUT_MS);
    lockStore.set(lockKey, {
      failedAttempts,
      lockUntil: lockUntil.getTime(),
    });

    if (isDbConnected()) {
      try {
        await OtpTracker.findOneAndUpdate(
          { email: cleanEmail, date: dateStr },
          { $set: { adminFailedAttempts: failedAttempts, adminLockUntil: lockUntil } },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (dbErr) {
        console.warn('[OtpTracker] Admin lock update error:', dbErr.message);
      }
    }

    const lockTimeStr = formatLockUntil(lockUntil);
    const err = new Error(
      `Too many failed attempts. Admin OTP login is locked for 24 hours. Try again after ${lockTimeStr}.`
    );
    err.status = 429;
    err.isLocked = true;
    err.lockUntil = lockUntil;
    err.remainingAttempts = 0;
    throw err;
  } else {
    lockStore.set(lockKey, {
      failedAttempts,
      lockUntil: null,
    });

    if (isDbConnected()) {
      try {
        await OtpTracker.findOneAndUpdate(
          { email: cleanEmail, date: dateStr },
          { $set: { adminFailedAttempts: failedAttempts } },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (dbErr) {
        console.warn('[OtpTracker] Admin failed attempt increment error:', dbErr.message);
      }
    }

    const remaining = MAX_ADMIN_FAILED_ATTEMPTS - failedAttempts;
    const err = new Error(
      `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before 24-hour lockout.`
    );
    err.status = 400;
    err.remainingAttempts = remaining;
    throw err;
  }
};

/**
 * Reset failed attempts upon successful login
 */
const resetFailedAttempts = async (email, _purpose = 'admin:login') => {
  const cleanEmail = normalizeEmail(email);
  const lockKey = `admin:${cleanEmail}`;
  lockStore.delete(lockKey);

  if (isDbConnected()) {
    try {
      const dateStr = getTodayDateStr();
      await OtpTracker.findOneAndUpdate(
        { email: cleanEmail, date: dateStr },
        { $set: { adminFailedAttempts: 0, adminLockUntil: null } }
      );
    } catch (_) {}
  }
};

const saveOtp = async (email, otp, expiryMinutes = OTP_EXPIRY_MINUTES, purpose = 'admin:login') => {
  const key = getStoreKey(email, purpose);
  const record = {
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
    lastSentAt: Date.now(),
  };
  otpStore.set(key, record);

  if (isDbConnected()) {
    try {
      await OtpCode.findOneAndUpdate(
        { email: normalizeEmail(email), purpose },
        {
          $set: {
            otpHash: record.otpHash,
            expiresAt: new Date(record.expiresAt),
            lastSentAt: new Date(record.lastSentAt),
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.warn('[OtpCode] DB save warning:', err.message);
    }
  }
};

const getStoredOtpRecord = async (email, purpose, key) => {
  if (isDbConnected()) {
    try {
      const record = await OtpCode.findOne({
        email: normalizeEmail(email),
        purpose,
      }).lean();
      if (record) {
        return {
          otpHash: record.otpHash,
          expiresAt: new Date(record.expiresAt).getTime(),
          lastSentAt: new Date(record.lastSentAt).getTime(),
          source: 'database',
        };
      }
    } catch (_) {}
  }
  const mem = otpStore.get(key);
  return mem ? { ...mem, source: 'memory' } : null;
};

const deleteStoredOtp = async (email, purpose, key) => {
  otpStore.delete(key);
  if (isDbConnected()) {
    try {
      await OtpCode.deleteOne({ email: normalizeEmail(email), purpose });
    } catch (_) {}
  }
};

const getRemainingCooldownForOtp = async (email, purpose, key) => {
  const record = await getStoredOtpRecord(email, purpose, key);
  if (!record?.lastSentAt) return 0;
  const elapsedMs = Date.now() - record.lastSentAt;
  const cooldownMs = OTP_COOLDOWN_SECONDS * 1000;
  return elapsedMs < cooldownMs ? Math.ceil((cooldownMs - elapsedMs) / 1000) : 0;
};

/**
 * Dispatch OTP email with Visa & Voyage luxury branding
 */
const dispatchEmail = async ({ toEmail, otp, purpose }) => {
  const companyName = 'Visa & Voyage';
  const isAdminAddEmail = purpose === 'admin:add-email';

  const subject = isAdminAddEmail
    ? `${otp} is your Admin Authorization verification code - ${companyName}`
    : `${otp} is your Admin Portal login code - ${companyName}`;

  const otpDigitsHtml = String(otp || '')
    .split('')
    .map(
      (digit) => `
        <td style="padding: 0 5px;">
          <div style="width: 52px; height: 60px; line-height: 60px; text-align: center; background: #eff6ff; border: 2px solid #0252D5; border-radius: 12px; color: #0252D5; font-size: 30px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 12px rgba(2, 82, 213, 0.12);">
            ${digit}
          </div>
        </td>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <!-- Hidden Preheader -->
      <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">
        ${otp} is your Visa &amp; Voyage verification code. Valid for 2 minutes.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
              
              <!-- Top Accent Brand Bar -->
              <tr>
                <td style="height: 5px; background: linear-gradient(90deg, #0252D5 0%, #38bdf8 50%, #d97706 100%); line-height: 5px; font-size: 5px;">&nbsp;</td>
              </tr>

              <!-- Brand Header -->
              <tr>
                <td style="background-color: #ffffff; padding: 36px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                  <!-- Official Logo Image with text fallback -->
                  <div style="margin-bottom: 12px;">
                    <img src="https://visavo.in/images/visa-voyage-logo.webp" alt="Visa &amp; Voyage" height="44" style="height: 44px; max-width: 220px; width: auto; border: 0; display: block; margin: 0 auto;" />
                  </div>
                  <div style="font-size: 22px; font-weight: 800; color: #0252D5; letter-spacing: -0.5px; margin: 0;">
                    Visa &amp; <span style="color: #d97706;">Voyage</span>
                  </div>
                  <div style="font-size: 12px; font-weight: 600; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px;">
                    Your Journey, Our Priority
                  </div>

                  <!-- Security Badge -->
                  <div style="margin-top: 16px;">
                    <span style="display: inline-block; padding: 6px 16px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 9999px; color: #b45309; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                      🛡️ ${isAdminAddEmail ? 'Admin Privilege Authorization' : 'Admin Security Portal'}
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 32px 36px; background-color: #ffffff;">
                  <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.3;">
                    ${isAdminAddEmail ? 'Confirm Admin Access' : 'Sign-in Verification'}
                  </h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                    ${
                      isAdminAddEmail
                        ? `A request was made to authorize administrator privileges for <strong style="color: #0252D5;">${toEmail}</strong> on the Visa &amp; Voyage Admin Portal.`
                        : `A sign-in request was initiated for your administrator account <strong style="color: #0252D5;">${toEmail}</strong> on the Visa &amp; Voyage Admin Portal.`
                    }
                    Use the secure one-time passcode below to verify your identity:
                  </p>

                  <!-- Modern Digit Boxes -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 24px auto 14px auto;">
                    <tr>
                      ${otpDigitsHtml}
                    </tr>
                  </table>

                  <!-- Expiry notice -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569;">
                      ⏱️ Valid for <strong>2 minutes</strong> &bull; Single-use verification code
                    </span>
                  </div>

                  <!-- Security Warning Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; margin-top: 16px;">
                    <tr>
                      <td style="padding: 14px 18px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="24" valign="top" style="font-size: 16px; line-height: 1; padding-top: 2px;">⚠️</td>
                            <td style="padding-left: 10px; font-size: 12px; line-height: 1.5; color: #92400e;">
                              <strong>Security Notice:</strong> Never share this verification code with anyone. Visa &amp; Voyage administrators will never ask for your code. If you did not make this request, please review your account immediately.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Trust Features Bar -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                    <tr>
                      <td align="center" width="33.33%" style="padding: 4px;">
                        <div style="font-size: 12px; font-weight: 700; color: #0252D5;">🔒 Encrypted</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">End-to-end secure</div>
                      </td>
                      <td align="center" width="33.33%" style="padding: 4px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                        <div style="font-size: 12px; font-weight: 700; color: #d97706;">⚡ Instant OTP</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Password-free sign in</div>
                      </td>
                      <td align="center" width="33.33%" style="padding: 4px;">
                        <div style="font-size: 12px; font-weight: 700; color: #0252D5;">🛡️ Whitelisted</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Authorized staff only</div>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 22px 28px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0; font-weight: 500;">
                    &copy; ${new Date().getFullYear()} <strong style="color: #0f172a;">Visa &amp; Voyage</strong> (<a href="https://visavo.in" style="color: #0252D5; text-decoration: none; font-weight: 600;">visavo.in</a>). All rights reserved.
                  </p>
                  <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                    Your trusted partner for seamless visa applications worldwide.<br/>
                    Strictly restricted to authorized administrative personnel.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // 1. Try Resend API if configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || `Visa & Voyage <noreply@visavo.in>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject,
          html,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const resendData = await res.json().catch(() => ({}));

      if (res.ok) {
        console.log(`[Resend] Admin OTP email dispatched successfully to ${toEmail} (ID: ${resendData?.id})`);
        return true;
      }

      console.warn(`[Resend] API returned status ${res.status}:`, resendData);

      // If custom domain is not yet verified in Resend, retry with Resend testing domain
      if (res.status === 403 && !fromEmail.includes('onboarding@resend.dev')) {
        try {
          const fallbackRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Visa & Voyage <onboarding@resend.dev>',
              to: [toEmail],
              subject,
              html,
            }),
            signal: AbortSignal.timeout(8000),
          });
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackRes.ok) {
            console.log(`[Resend Fallback] Admin OTP dispatched with onboarding@resend.dev to ${toEmail} (ID: ${fallbackData?.id})`);
            return true;
          }
          console.warn('[Resend Fallback] Fallback status:', fallbackRes.status, fallbackData);
        } catch (_) {}
      }
    } catch (resendErr) {
      console.warn('[Resend] Warning:', resendErr.message);
    }
  }

  // 2. Try Nodemailer sendEmail
  try {
    const sent = await sendEmail({
      email: toEmail,
      subject,
      message: `Your Visa & Voyage Admin OTP is ${otp}. Valid for 2 minutes.`,
      html,
    });
    if (sent) {
      console.log(`[SMTP] Admin OTP email dispatched to ${toEmail}`);
      return true;
    }
  } catch (emailErr) {
    console.warn('[SMTP] Warning:', emailErr.message);
  }

  return false;
};

/**
 * Send Admin OTP
 */
const sendOtp = async ({ email, purpose = 'admin:login' }) => {
  const toEmail = normalizeEmail(email);
  if (!toEmail) {
    const err = new Error('Admin email address is required.');
    err.status = 400;
    throw err;
  }

  // 1. Lockout check
  await checkUserLockout(toEmail, purpose);

  // 2. Cooldown check
  const key = getStoreKey(toEmail, purpose);
  const remainingCooldown = await getRemainingCooldownForOtp(toEmail, purpose, key);
  if (remainingCooldown > 0) {
    const err = new Error(`Please wait ${remainingCooldown}s before requesting a new OTP.`);
    err.status = 429;
    err.cooldownRemaining = remainingCooldown;
    throw err;
  }

  // 3. Generate 4-digit OTP
  const otp = generateOtp(4);
  await saveOtp(toEmail, otp, OTP_EXPIRY_MINUTES, purpose);

  // Always log to terminal/console for dev & verification visibility
  console.log(`\n========================================`);
  console.log(`⚡ [ADMIN OTP DISPATCHED] Purpose: ${purpose}`);
  console.log(`Recipient: ${toEmail} | Code: ${otp}`);
  console.log(`Expires in: ${OTP_EXPIRY_MINUTES}m (120s) | Cooldown: ${OTP_COOLDOWN_SECONDS}s`);
  console.log(`========================================\n`);

  // 4. Dispatch Email
  await dispatchEmail({ toEmail, otp, purpose });

  return {
    success: true,
    message: `Verification code sent to ${toEmail}.`,
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
  };
};

/**
 * Resend Admin OTP
 */
const resendOtp = async ({ email, purpose = 'admin:login' }) => {
  return sendOtp({ email, purpose });
};

/**
 * Verify OTP
 */
const verifyOtp = async ({ email, otp, purpose = 'admin:login', consume = true }) => {
  const cleanEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').trim().replace(/\D/g, '');

  if (!cleanEmail || !cleanOtp) {
    const err = new Error('Email and verification code are required.');
    err.status = 400;
    throw err;
  }

  // 1. Check lockout
  await checkUserLockout(cleanEmail, purpose);

  const key = getStoreKey(cleanEmail, purpose);
  const record = await getStoredOtpRecord(cleanEmail, purpose, key);

  if (!record) {
    const err = new Error('OTP not found or expired. Please request a new OTP.');
    err.status = 400;
    throw err;
  }

  // 2. Check expiration
  if (Date.now() > record.expiresAt) {
    await deleteStoredOtp(cleanEmail, purpose, key);
    const err = new Error('OTP has expired. Please request a new one.');
    err.status = 400;
    throw err;
  }

  // 3. Verify match
  const match = hashOtp(cleanOtp) === record.otpHash;
  if (!match) {
    await recordFailedAttempt(cleanEmail, purpose);
  }

  // Reset failed attempts upon successful verification
  await resetFailedAttempts(cleanEmail, purpose);

  if (consume) {
    await deleteStoredOtp(cleanEmail, purpose, key);
  }

  return true;
};

module.exports = {
  DEFAULT_ADMIN_EMAILS,
  getAllowedAdminEmails,
  isEmailAuthorized,
  checkUserLockout,
  sendOtp,
  resendOtp,
  verifyOtp,
  resetFailedAttempts,
};

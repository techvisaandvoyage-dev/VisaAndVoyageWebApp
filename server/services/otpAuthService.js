const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Otp = require('../models/Otp');
const Settings = require('../models/Settings');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { sendLoginOtpSms } = require('./smsService');

const OTP_TTL_MS = 10 * 60 * 1000;
const CHANNELS = ['whatsapp', 'sms', 'email'];

const isOtpTestingMode = (settings) =>
  settings?.otpTestingEnabled === true && process.env.OTP_PROVIDER_REQUIRED !== 'true';

const normalizeOtpLength = (value, fallback = '6') => {
  const next = String(value || fallback).trim();
  return next === '4' ? 4 : 6;
};

const normalizeChannel = (value, fallback = 'none') => {
  const next = String(value || fallback).trim().toLowerCase();
  return [...CHANNELS, 'none'].includes(next) ? next : fallback;
};

const normalizePhoneDigits = (raw) => {
  const s = String(raw || '').trim();
  const digits = s.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const normalizeIdentifier = (raw) => {
  const trimmed = String(raw || '').trim();
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    return isValidEmail(email) ? { type: 'email', key: email, raw: email } : { type: 'invalid' };
  }
  const phone = normalizePhoneDigits(trimmed);
  return phone ? { type: 'phone', key: phone, raw: trimmed } : { type: 'invalid' };
};

const findUserForIdentifier = async ({ type, key }) => {
  if (type === 'email') return User.findOne({ email: key });
  return User.findOne({
    $or: [{ phone: key }, { phone: `91${key}` }, { phone: `+91${key}` }],
  });
};

const maskSecret = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  const last = str.slice(-4);
  return `${'*'.repeat(Math.max(8, str.length - 4))}${last}`;
};

const loadOtpSettings = async () => {
  let settings = await Settings.findOne({ singleton: 'global' });
  if (!settings) settings = await Settings.create({ singleton: 'global' });
  return settings;
};

const channelConfigured = (settings, channel) => {
  if (channel === 'sms') {
    return Boolean(
      settings?.smsOtpEnabled &&
      String(settings?.sms91AuthKey || process.env.SMS91_AUTHKEY || '').trim() &&
      String(settings?.sms91TemplateId || process.env.SMS91_TEMPLATE_ID || '').trim()
    );
  }
  if (channel === 'whatsapp') {
    return Boolean(
      settings?.whatsappOtpEnabled &&
      String(settings?.whatsappOtpAuthKey || '').trim() &&
      String(settings?.whatsappOtpTemplateId || '').trim() &&
      String(settings?.whatsappBusinessNumber || '').trim()
    );
  }
  if (channel === 'email') {
    const provider = String(settings?.emailOtpProvider || '').trim().toLowerCase();
    const smtpReady = Boolean(
      String(settings?.smtpEmailUser || process.env.EMAIL_USER || process.env.BREVO_SMTP_USER || '').trim() &&
      String(settings?.smtpEmailPass || process.env.EMAIL_PASS || process.env.BREVO_SMTP_KEY || '').trim()
    );
    const brevoReady = Boolean(
      provider === 'brevo' &&
      String(settings?.emailOtpApiKey || '').trim() &&
      String(settings?.emailOtpSenderEmail || settings?.smtpFromEmail || '').trim()
    );
    const msg91Ready = Boolean(
      provider === 'msg91 email' &&
      String(settings?.emailOtpApiKey || '').trim() &&
      String(settings?.emailOtpSenderEmail || settings?.smtpFromEmail || '').trim()
    );
    return Boolean(settings?.emailOtpEnabled && (smtpReady || brevoReady || msg91Ready));
  }
  return false;
};

const publicOtpConfigFromSettings = (settings) => {
  const channels = {
    whatsapp: {
      enabled: Boolean(settings?.whatsappOtpEnabled),
      configured: channelConfigured(settings, 'whatsapp'),
      otpLength: normalizeOtpLength(settings?.whatsappOtpLength),
    },
    sms: {
      enabled: Boolean(settings?.smsOtpEnabled),
      configured: channelConfigured(settings, 'sms'),
      otpLength: normalizeOtpLength(settings?.sms91OtpLength),
    },
    email: {
      enabled: Boolean(settings?.emailOtpEnabled),
      configured: channelConfigured(settings, 'email'),
      otpLength: normalizeOtpLength(settings?.emailOtpLength),
    },
  };
  return {
    channels,
    testing: {
      enabled: settings?.otpTestingEnabled === true,
      autofillEnabled: settings?.otpTestingAutofillEnabled !== false,
    },
    priority: {
      primary: normalizeChannel(settings?.otpPrimaryChannel, 'sms'),
      fallback1: normalizeChannel(settings?.otpFallbackChannel1, 'email'),
      fallback2: normalizeChannel(settings?.otpFallbackChannel2, 'none'),
    },
  };
};

const getChannelLength = (settings, channel) => {
  if (channel === 'whatsapp') return normalizeOtpLength(settings?.whatsappOtpLength);
  if (channel === 'sms') return normalizeOtpLength(settings?.sms91OtpLength);
  return normalizeOtpLength(settings?.emailOtpLength);
};

const getCompatiblePriority = (settings, identifierType, requestedChannel) => {
  const base = [];
  
  if (requestedChannel && requestedChannel !== 'auto') {
    base.push(normalizeChannel(requestedChannel));
  } else {
    const p = normalizeChannel(settings?.otpPrimaryChannel, 'none');
    const f1 = normalizeChannel(settings?.otpFallbackChannel1, 'none');
    const f2 = normalizeChannel(settings?.otpFallbackChannel2, 'none');
    
    if (p !== 'none') base.push(p);
    if (f1 !== 'none') base.push(f1);
    if (f2 !== 'none') base.push(f2);
    
    if (settings?.whatsappOtpEnabled && !base.includes('whatsapp')) base.push('whatsapp');
    if (settings?.smsOtpEnabled && !base.includes('sms')) base.push('sms');
    if (settings?.emailOtpEnabled && !base.includes('email')) base.push('email');
  }

  const compatible = identifierType === 'email' ? ['email'] : ['whatsapp', 'sms'];
  return [...new Set(base)]
    .filter((channel) => channel !== 'none')
    .filter((channel) => compatible.includes(channel))
    .filter((channel) => {
       if (channel === 'whatsapp') return settings?.whatsappOtpEnabled === true;
       if (channel === 'sms') return settings?.smsOtpEnabled === true;
       if (channel === 'email') return settings?.emailOtpEnabled === true;
       return false;
    });
};

const generateOtp = (length) => {
  const digits = normalizeOtpLength(length);
  const min = digits === 4 ? 1000 : 100000;
  const max = digits === 4 ? 9000 : 900000;
  return String(Math.floor(min + Math.random() * max));
};

const sendWhatsappOtp = async (phoneKey, otp, settings) => {
  if (!channelConfigured(settings, 'whatsapp')) {
    return { sent: false, skipped: true, message: 'WhatsApp OTP is not enabled' };
  }
  let mobile = String(phoneKey || '').replace(/\D/g, '');
  if (mobile.length === 10) mobile = `91${mobile}`;
  const authkey = String(settings.whatsappOtpAuthKey || '').trim();
  const integratedNumber = String(settings.whatsappBusinessNumber || '').replace(/\D/g, '');
  const templateName = String(settings.whatsappOtpTemplateId || '').trim();
  const languageCode = String(process.env.MSG91_WHATSAPP_LANGUAGE || 'en').trim();

  try {
    const requestBody = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: mobile,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: String(otp),
                }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                {
                  type: 'text',
                  text: String(otp),
                }
              ]
            }
          ]
        }
      }
    };

    console.log('[MSG91 WhatsApp] Sending request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authkey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const bodyText = await response.text();
    let json;
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = { raw: bodyText };
    }
    
    console.log('[MSG91 WhatsApp] Response:', response.status, bodyText);

    const ok = response.ok && (json.type === 'success' || json.status === 'success' || json.request_id || json.message_id || json.hasError === false);
    if (ok) return { sent: true };
    console.error('[MSG91 WhatsApp] OTP send failed', response.status, bodyText);
    
    // Extract the actual error message from MSG91 if possible
    const errorMessage = json.message || json.error || json.errors || 'Failed to send WhatsApp message (Check server logs)';
    return { sent: false, skipped: false, message: errorMessage };
  } catch (error) {
    console.error('[MSG91 WhatsApp] OTP send error', error.message || error);
    return { sent: false, skipped: false, message: 'Internal error while sending WhatsApp OTP' };
  }
};

const sendEmailOtp = async (email, otp, settings) => {
  if (!channelConfigured(settings, 'email')) {
    return { sent: false, skipped: true, message: 'Email OTP is not configured' };
  }
  const senderName = String(settings?.emailOtpSenderName || 'Visa & Voyage Security').trim();
  const provider = String(settings?.emailOtpProvider || '').trim().toLowerCase();
  const brevoKey = String(settings?.emailOtpApiKey || '').trim();
  const msg91Key = String(settings?.emailOtpApiKey || '').trim();
  const senderEmail = String(settings?.emailOtpSenderEmail || settings?.smtpFromEmail || '').trim();
  
  if (provider === 'brevo' && brevoKey && senderEmail && typeof fetch === 'function') {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName },
          to: [{ email }],
          subject: 'Visa & Voyage - OTP Verification',
          htmlContent: `
            <div style="font-family:Arial,sans-serif;padding:24px;background:#f7fbff;color:#0f172a">
              <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dbe5f4;border-radius:20px;padding:28px">
                <p style="margin:0 0 8px;color:#2563eb;font-weight:700">${senderName}</p>
                <h1 style="margin:0 0 12px;font-size:28px">Your OTP Code</h1>
                <p style="margin:0 0 24px;color:#475569">Use this code to continue. It expires in 10 minutes.</p>
                <div style="font-size:36px;letter-spacing:10px;font-weight:800;color:#0757f9">${otp}</div>
              </div>
            </div>
          `,
        }),
      });
      if (response.ok) return { sent: true };
      const text = await response.text();
      console.error('[Brevo OTP] Send failed:', text);
      return { sent: false, skipped: false, message: 'Email OTP is not configured' };
    } catch (error) {
      console.error('[Brevo OTP] Send error:', error.message || error);
      return { sent: false, skipped: false, message: 'Email OTP is not configured' };
    }
  }
  
  if (provider === 'msg91 email' && msg91Key && senderEmail && typeof fetch === 'function') {
    try {
      const templateId = String(settings?.emailOtpTemplateId || '').trim();
      if (!templateId) {
        console.error('[MSG91 Email OTP] Template ID is required but not set');
        return { sent: false, skipped: true, message: 'Email OTP is not configured' };
      }

      // Extract domain from sender email (e.g., "no-reply@yashrajtech.online" → "yashrajtech.online")
      const domain = senderEmail.includes('@') 
        ? senderEmail.split('@')[1] 
        : senderEmail;

      const companyName = String(settings?.companyName || 'YashRajTech').trim();

      console.log("[MSG91 Email OTP] Variables attached:", {
        hasCompanyName: true,
        hasOtp: !!otp,
        otpLength: String(otp).length
      });

      const body = {
        recipients: [
          {
            to: [
              {
                email: email,
              }
            ],
            variables: {
              company_name: companyName,
              otp: String(otp)
            }
          }
        ],
        from: {
          email: senderEmail,
          name: senderName
        },
        domain: domain,
        template_id: templateId
      };

      const response = await fetch('https://control.msg91.com/api/v5/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'authkey': msg91Key
        },
        body: JSON.stringify(body)
      });

      const bodyText = await response.text();
      let json;
      try {
        json = JSON.parse(bodyText);
      } catch {
        json = { raw: bodyText };
      }

      const result = json;
      const isSuccess = result.status === "success" || result.hasError === false;
      const isFailed = result.status === "fail" || result.hasError === true;

      if (isSuccess && !isFailed) {
        const uniqueId = result.data?.unique_id;
        console.log(`[MSG91 Email OTP] Queued successfully: ${uniqueId}`);
        return {
          sent: true,
          success: true,
          message: "OTP sent successfully. Please check your email.",
          uniqueId: uniqueId
        };
      } else {
        console.error('[MSG91 Email OTP] Send failed:', result);
        return {
          sent: false,
          success: false,
          skipped: false,
          message: result.message || 'Email OTP is not configured'
        };
      }
    } catch (error) {
      console.error('[MSG91 Email OTP] Send error:', error.message || error);
      return { sent: false, success: false, skipped: false, message: 'Email OTP is not configured' };
    }
  }
  
  const ok = await sendEmail({
    email,
    subject: 'Visa & Voyage - OTP Verification',
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#f7fbff;color:#0f172a">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dbe5f4;border-radius:20px;padding:28px">
          <p style="margin:0 0 8px;color:#2563eb;font-weight:700">${senderName}</p>
          <h1 style="margin:0 0 12px;font-size:28px">Your OTP Code</h1>
          <p style="margin:0 0 24px;color:#475569">Use this code to continue. It expires in 10 minutes.</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:800;color:#0757f9">${otp}</div>
        </div>
      </div>
    `,
  });
  return ok ? { sent: true } : { sent: false, skipped: false, message: 'Email OTP is not configured' };
};

const deliverOtp = async ({ identifier, otp, channel, settings }) => {
  if (channel === 'sms') {
    if (!channelConfigured(settings, 'sms')) {
      return { sent: false, skipped: true, message: 'SMS OTP is not configured' };
    }
    return sendLoginOtpSms(identifier.key, otp);
  }
  if (channel === 'whatsapp') return sendWhatsappOtp(identifier.key, otp, settings);
  if (channel === 'email') return sendEmailOtp(identifier.key, otp, settings);
  return { sent: false, skipped: true, message: 'OTP channel is not configured' };
};

const otpSendAttempts = new Map();
const checkOtpRateLimit = (key) => {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const cooldownMs = 30 * 1000;
  const recent = (otpSendAttempts.get(key) || []).filter((ts) => now - ts < windowMs);
  const last = recent[recent.length - 1] || 0;
  if (now - last < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (now - last)) / 1000);
    return { allowed: false, waitSeconds, message: `Please wait ${waitSeconds}s before resending OTP` };
  }
  if (recent.length >= 5) {
    return { allowed: false, waitSeconds: 600, message: 'Too many OTP requests. Please try again later.' };
  }
  recent.push(now);
  otpSendAttempts.set(key, recent);
  return { allowed: true };
};

const sendConfiguredOtp = async ({ rawIdentifier, requestedChannel = 'auto', purpose = 'auth' }) => {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (identifier.type === 'invalid') {
    const err = new Error('Please enter a valid email address or mobile number');
    err.statusCode = 400;
    throw err;
  }

  const rate = checkOtpRateLimit(`${identifier.type}:${identifier.key}:${purpose}`);
  if (!rate.allowed) {
    const err = new Error(rate.message);
    err.statusCode = 429;
    err.waitSeconds = rate.waitSeconds;
    throw err;
  }

  const settings = await loadOtpSettings();
  const testingMode = isOtpTestingMode(settings);
  let channels = getCompatiblePriority(settings, identifier.type, requestedChannel);
  if (!channels.length && testingMode) {
    if (identifier.type === 'email') {
      channels = ['email'];
    } else {
      channels = settings?.whatsappOtpEnabled ? ['whatsapp'] : ['sms'];
    }
  }
  if (!channels.length) {
    const err = new Error(identifier.type === 'email' ? 'Email OTP is not configured' : 'SMS OTP is not configured');
    err.statusCode = 400;
    throw err;
  }

  const failures = [];
  for (const channel of channels) {
    if (!channelConfigured(settings, channel)) {
      if (testingMode) {
        const length = getChannelLength(settings, channel);
        const otp = generateOtp(length);
        const otpHash = await bcrypt.hash(otp, 10);
        await Otp.deleteMany({ identifier: identifier.key, purpose });
        await Otp.create({
          identifier: identifier.key,
          otp: '',
          otpHash,
          channel,
          purpose,
          createdAt: new Date(),
        });
        console.log(`\n[OTP TEST MODE] ${otp} (${length} digits) channel=${channel} identifier=${identifier.key}\n`);
        return {
          success: true,
          identifier,
          channel,
          otpLength: length,
          devOtp: settings.otpTestingAutofillEnabled !== false ? otp : undefined,
        };
      }
      failures.push(channel === 'whatsapp' ? 'WhatsApp OTP is not enabled' : channel === 'sms' ? 'SMS OTP is not configured' : 'Email OTP is not configured');
      continue;
    }
    const length = getChannelLength(settings, channel);
    const otp = generateOtp(length);
    const result = await deliverOtp({ identifier, otp, channel, settings });
    if (!result.sent && !result.skipped) {
      failures.push(result.message || `${channel} OTP failed`);
      continue;
    }
    if (result.skipped && !testingMode) {
      failures.push(result.message || `${channel} OTP is not configured`);
      continue;
    }

    const otpHash = await bcrypt.hash(otp, 10);
    await Otp.deleteMany({ identifier: identifier.key, purpose });
    await Otp.create({
      identifier: identifier.key,
      otp: '',
      otpHash,
      channel,
      purpose,
      createdAt: new Date(),
    });

    if (process.env.SUPPRESS_LOGIN_OTP_LOG !== 'true') {
      console.log(`\n[OTP] ${otp} (${length} digits) channel=${channel} identifier=${identifier.key}\n`);
    }

    return {
      success: true,
      identifier,
      channel,
      otpLength: length,
      devOtp: testingMode && settings.otpTestingAutofillEnabled !== false ? otp : undefined,
    };
  }

  const err = new Error(failures[0] || 'OTP is not configured');
  err.statusCode = 400;
  err.failures = failures;
  throw err;
};

const verifyStoredOtp = async ({ rawIdentifier, otp, purpose = 'auth', consume = true }) => {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (identifier.type === 'invalid') {
    const err = new Error('Please enter a valid email address or mobile number');
    err.statusCode = 400;
    throw err;
  }
  const record = await Otp.findOne({ identifier: identifier.key, purpose }).sort({ createdAt: -1 });
  if (!record) {
    const err = new Error('Invalid OTP');
    err.statusCode = 400;
    throw err;
  }
  if (Date.now() - new Date(record.createdAt).getTime() > OTP_TTL_MS) {
    await Otp.deleteOne({ _id: record._id });
    const err = new Error('OTP expired');
    err.statusCode = 400;
    throw err;
  }
  const input = String(otp || '').trim();
  const ok = record.otpHash
    ? await bcrypt.compare(input, record.otpHash)
    : input === String(record.otp || '').trim();
  if (!ok) {
    const err = new Error('Invalid OTP');
    err.statusCode = 400;
    throw err;
  }
  if (consume) await Otp.deleteOne({ _id: record._id });
  return { identifier, record };
};

module.exports = {
  CHANNELS,
  maskSecret,
  normalizeOtpLength,
  normalizeChannel,
  normalizeIdentifier,
  findUserForIdentifier,
  loadOtpSettings,
  publicOtpConfigFromSettings,
  channelConfigured,
  sendConfiguredOtp,
  verifyStoredOtp,
};

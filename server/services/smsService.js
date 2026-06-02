/**
 * SMS91 (India) — login OTP delivery.
 *
 * Set in server `.env` when going live:
 *   SMS91_AUTHKEY       — API auth key from MSG91 panel
 *   SMS91_TEMPLATE_ID   — OTP / DLT-approved template id
 * Optional: SMS91_OTP_LENGTH (default 6)
 *
 * Without authkey + template_id, sends are skipped (development: OTP is logged;
 * client may receive devOtp when NODE_ENV !== production).
 *
 * @see https://docs.msg91.com/panel/apis/send-sms/otp-sms-apis
 */

async function sendLoginOtpSms(phoneKey10, otp) {
  let settings = null;
  try {
    const Settings = require('../models/Settings');
    settings = await Settings.findOne({ singleton: 'global' }).lean();
  } catch {
    settings = null;
  }

  const authkey = settings?.sms91AuthKey || process.env.SMS91_AUTHKEY;
  const templateId = settings?.sms91TemplateId || process.env.SMS91_TEMPLATE_ID;

  if (!authkey || !templateId) {
    return { sent: false, skipped: true };
  }

  let mobile = phoneKey10;
  if (!mobile.startsWith('+') && mobile.length === 10) {
    mobile = `91${mobile}`;
  } else if (mobile.startsWith('+')) {
    mobile = mobile.slice(1);
  }
  const otpLen = settings?.sms91OtpLength || process.env.SMS91_OTP_LENGTH || String(otp.length);

  try {
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('authkey', authkey);
    url.searchParams.set('template_id', templateId);
    url.searchParams.set('mobile', mobile);
    url.searchParams.set('otp', otp);
    url.searchParams.set('otp_length', String(otpLen));

    const res = await fetch(url.toString(), { method: 'GET' });
    const bodyText = await res.text();
    let json;
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = { raw: bodyText };
    }

    const ok =
      res.ok &&
      (json.type === 'success' ||
        json.message === 'success' ||
        json.request_id ||
        json.msg === 'OTP generated successfully');

    if (ok) {
      return { sent: true };
    }

    console.error('[SMS91] OTP send failed', res.status, bodyText);
    return { sent: false, skipped: false, error: bodyText };
  } catch (err) {
    console.error('[SMS91] OTP send error', err);
    return { sent: false, skipped: false, error: err.message };
  }
}

module.exports = { sendLoginOtpSms };

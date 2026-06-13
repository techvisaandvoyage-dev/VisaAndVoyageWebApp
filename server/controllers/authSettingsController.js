const {
  loadOtpSettings,
  maskSecret,
  normalizeOtpLength,
  normalizeChannel,
  publicOtpConfigFromSettings,
} = require('../services/otpAuthService');
const {
  normalizeCountryCodeSettings,
  publicCountryCodeSettings,
} = require('../utils/countryCodeSettings');

const boolFromBody = (value) => value === true || value === 'true' || value === 1 || value === '1';
const str = (value) => String(value ?? '').trim();

const publicAuthControlsFromSettings = (settings) => ({
  passwordEnabled: settings?.authPasswordEnabled !== false,
  googleEnabled: settings?.authGoogleEnabled !== false,
  facebookEnabled: settings?.authFacebookEnabled === true,
  phoneOtpEnabled: settings?.authPhoneOtpEnabled !== false,
  emailOtpEnabled: settings?.authEmailOtpEnabled !== false,
});

const emailSenderReady = (settings, provider, apiKey, senderEmail) => {
  const selectedProvider = str(provider || settings.emailOtpProvider || 'Custom SMTP').toLowerCase();
  const hasBrevoApi = Boolean(
    selectedProvider === 'brevo' &&
    str(apiKey || settings.emailOtpApiKey) &&
    str(senderEmail || settings.emailOtpSenderEmail || settings.smtpFromEmail)
  );
  const hasMsg91Email = Boolean(
    selectedProvider === 'msg91 email' &&
    str(apiKey || settings.emailOtpApiKey) &&
    str(senderEmail || settings.emailOtpSenderEmail || settings.smtpFromEmail)
  );
  const hasSmtp = Boolean(
    str(settings.smtpEmailUser || process.env.EMAIL_USER || process.env.BREVO_SMTP_USER) &&
    str(settings.smtpEmailPass || process.env.EMAIL_PASS || process.env.BREVO_SMTP_KEY)
  );
  const hasGmailOauth = Boolean(
    str(settings.smtpEmailUser || process.env.EMAIL_USER) &&
    str(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) &&
    String(settings.smtpEmailService || process.env.EMAIL_SERVICE || '').toLowerCase() === 'gmail-oauth'
  );
  return Boolean(hasBrevoApi || hasMsg91Email || hasSmtp || hasGmailOauth);
};

const withMaskedSecrets = (settings) => ({
  sms: {
    enabled: settings.smsOtpEnabled === true,
    provider: settings.smsOtpProvider || 'MSG91',
    authKey: maskSecret(settings.sms91AuthKey),
    templateId: settings.sms91TemplateId || '',
    otpLength: String(normalizeOtpLength(settings.sms91OtpLength)),
    configured: Boolean(str(settings.sms91AuthKey) && str(settings.sms91TemplateId)),
  },
  whatsapp: {
    enabled: settings.whatsappOtpEnabled === true,
    provider: settings.whatsappOtpProvider || 'MSG91 WhatsApp',
    authKey: maskSecret(settings.whatsappOtpAuthKey),
    templateId: settings.whatsappOtpTemplateId || '',
    businessNumber: settings.whatsappBusinessNumber || '',
    otpLength: String(normalizeOtpLength(settings.whatsappOtpLength)),
    configured: Boolean(str(settings.whatsappOtpAuthKey) && str(settings.whatsappOtpTemplateId) && str(settings.whatsappBusinessNumber)),
  },
  email: {
    enabled: settings.emailOtpEnabled !== false,
    provider: settings.emailOtpProvider || 'Custom SMTP',
    apiKey: maskSecret(settings.emailOtpApiKey),
    senderEmail: settings.emailOtpSenderEmail || settings.smtpFromEmail || '',
    senderName: settings.emailOtpSenderName || '',
    templateId: settings.emailOtpTemplateId || '',
    otpLength: String(normalizeOtpLength(settings.emailOtpLength)),
    configured: emailSenderReady(settings),
  },
  priority: {
    primary: normalizeChannel(settings.otpPrimaryChannel, 'sms'),
    fallback1: normalizeChannel(settings.otpFallbackChannel1, 'email'),
    fallback2: normalizeChannel(settings.otpFallbackChannel2, 'none'),
  },
  testing: {
    enabled: settings.otpTestingEnabled === true,
    autofillEnabled: settings.otpTestingAutofillEnabled !== false,
  },
  authControls: publicAuthControlsFromSettings(settings),
  countryCodeSettings: normalizeCountryCodeSettings(settings.countryCodeSettings),
  publicConfig: publicOtpConfigFromSettings(settings),
});

const validateChannelEnable = (enabled, pairs, label) => {
  if (!enabled) return null;
  const missing = pairs.filter(([, value]) => !str(value)).map(([name]) => name);
  return missing.length ? `${label}: ${missing.join(', ')} required before enabling.` : null;
};

const getAuthSettings = async (_req, res) => {
  const settings = await loadOtpSettings();
  res.json({ success: true, settings: withMaskedSecrets(settings) });
};

const updateSmsSettings = async (req, res) => {
  const settings = await loadOtpSettings();
  const enabled = boolFromBody(req.body.enabled);
  const authKey = str(req.body.authKey);
  const templateId = str(req.body.templateId);
  const error = validateChannelEnable(enabled, [
    ['Auth Key', authKey || settings.sms91AuthKey],
    ['OTP Template ID', templateId || settings.sms91TemplateId],
  ], 'SMS OTP Settings');
  if (error) return res.status(400).json({ success: false, message: error });

  settings.smsOtpEnabled = enabled;
  settings.smsOtpProvider = str(req.body.provider) || 'MSG91';
  if (authKey && !authKey.startsWith('********')) settings.sms91AuthKey = authKey;
  if (templateId) settings.sms91TemplateId = templateId;
  settings.sms91OtpLength = String(normalizeOtpLength(req.body.otpLength || settings.sms91OtpLength));
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'SMS settings saved.' });
};

const updateWhatsappSettings = async (req, res) => {
  const settings = await loadOtpSettings();
  const enabled = boolFromBody(req.body.enabled);
  const authKey = str(req.body.authKey);
  const templateId = str(req.body.templateId);
  const businessNumber = str(req.body.businessNumber);
  const error = validateChannelEnable(enabled, [
    ['Auth Key / API Key', authKey || settings.whatsappOtpAuthKey],
    ['WhatsApp Template ID', templateId || settings.whatsappOtpTemplateId],
    ['WhatsApp Business Number', businessNumber || settings.whatsappBusinessNumber],
  ], 'WhatsApp OTP Settings');
  if (error) return res.status(400).json({ success: false, message: error });

  settings.whatsappOtpEnabled = enabled;
  settings.whatsappOtpProvider = str(req.body.provider) || 'MSG91 WhatsApp';
  if (authKey && !authKey.startsWith('********')) settings.whatsappOtpAuthKey = authKey;
  if (templateId) settings.whatsappOtpTemplateId = templateId;
  if (businessNumber) settings.whatsappBusinessNumber = businessNumber;
  settings.whatsappOtpLength = String(normalizeOtpLength(req.body.otpLength || settings.whatsappOtpLength));
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'WhatsApp settings saved.' });
};

const updateEmailSettings = async (req, res) => {
  const settings = await loadOtpSettings();
  const enabled = boolFromBody(req.body.enabled);
  const apiKey = str(req.body.apiKey);
  const senderEmail = str(req.body.senderEmail);
  const provider = str(req.body.provider) || settings.emailOtpProvider || 'Custom SMTP';
  const error = validateChannelEnable(enabled, [
    ['Sender Email', senderEmail || settings.emailOtpSenderEmail || settings.smtpFromEmail || settings.smtpEmailUser],
  ], 'Email OTP Settings');
  if (error) return res.status(400).json({ success: false, message: error });
  if (enabled && !emailSenderReady(settings, provider, apiKey, senderEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Email OTP Settings: API key (Brevo/MSG91) or SMTP credentials required before enabling.',
    });
  }

  settings.emailOtpEnabled = enabled;
  settings.emailOtpProvider = provider;
  if (apiKey && !apiKey.startsWith('********')) settings.emailOtpApiKey = apiKey;
  if (senderEmail) {
    settings.emailOtpSenderEmail = senderEmail;
    settings.smtpFromEmail = senderEmail;
  }
  if (str(req.body.senderName)) settings.emailOtpSenderName = str(req.body.senderName);
  if (str(req.body.templateId)) settings.emailOtpTemplateId = str(req.body.templateId);
  settings.emailOtpLength = String(normalizeOtpLength(req.body.otpLength || settings.emailOtpLength));
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'Email settings saved.' });
};

const updatePrioritySettings = async (req, res) => {
  const settings = await loadOtpSettings();
  settings.otpPrimaryChannel = normalizeChannel(req.body.primary, 'sms');
  settings.otpFallbackChannel1 = normalizeChannel(req.body.fallback1, 'email');
  settings.otpFallbackChannel2 = normalizeChannel(req.body.fallback2, 'none');
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'OTP priority settings saved.' });
};

const updateTestingSettings = async (req, res) => {
  const settings = await loadOtpSettings();
  settings.otpTestingEnabled = boolFromBody(req.body.enabled);
  settings.otpTestingAutofillEnabled = req.body.autofillEnabled === undefined
    ? true
    : boolFromBody(req.body.autofillEnabled);
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'OTP testing settings saved.' });
};

const updateAuthControls = async (req, res) => {
  const settings = await loadOtpSettings();
  settings.authPasswordEnabled = req.body.passwordEnabled === undefined ? true : boolFromBody(req.body.passwordEnabled);
  settings.authGoogleEnabled = req.body.googleEnabled === undefined ? true : boolFromBody(req.body.googleEnabled);
  settings.authFacebookEnabled = boolFromBody(req.body.facebookEnabled);
  settings.authPhoneOtpEnabled = req.body.phoneOtpEnabled === undefined ? true : boolFromBody(req.body.phoneOtpEnabled);
  settings.authEmailOtpEnabled = req.body.emailOtpEnabled === undefined ? true : boolFromBody(req.body.emailOtpEnabled);
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'Authentication controls saved.' });
};

const updateCountryCodeSettings = async (req, res) => {
  const settings = await loadOtpSettings();
  const normalized = normalizeCountryCodeSettings(req.body);
  settings.countryCodeSettings = normalized;
  await settings.save();
  res.json({ success: true, settings: withMaskedSecrets(settings), message: 'Country code settings saved.' });
};

const getPublicCountryCodeSettings = async (_req, res) => {
  const settings = await loadOtpSettings();
  res.json({ success: true, config: publicCountryCodeSettings(settings) });
};

module.exports = {
  getAuthSettings,
  updateSmsSettings,
  updateWhatsappSettings,
  updateEmailSettings,
  updatePrioritySettings,
  updateTestingSettings,
  updateAuthControls,
  updateCountryCodeSettings,
  getPublicCountryCodeSettings,
  publicAuthControlsFromSettings,
};

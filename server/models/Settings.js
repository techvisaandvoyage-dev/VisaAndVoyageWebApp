const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Since this is a global settings object, we'll enforce a single document
  singleton: {
    type: String,
    default: 'global',
    unique: true
  },
  razorpayKeyId: {
    type: String,
    default: ''
  },
  razorpayKeySecret: {
    type: String,
    default: ''
  },
  firebaseApiKey: {
    type: String,
    default: ''
  },
  firebaseAuthDomain: {
    type: String,
    default: ''
  },
  firebaseProjectId: {
    type: String,
    default: ''
  },
  googleClientId: {
    type: String,
    default: ''
  },
  googleClientSecret: {
    type: String,
    default: ''
  },
  firebaseStorageBucket: {
    type: String,
    default: ''
  },
  firebaseMessagingSenderId: {
    type: String,
    default: ''
  },
  firebaseAppId: {
    type: String,
    default: ''
  },
  firebaseServiceAccountJson: {
    type: String,
    default: ''
  },
  sms91AuthKey: {
    type: String,
    default: ''
  },
  smsOtpEnabled: { type: Boolean, default: false },
  smsOtpProvider: { type: String, default: 'MSG91' },
  sms91TemplateId: {
    type: String,
    default: ''
  },
  sms91OtpLength: {
    type: String,
    default: '6'
  },
  whatsappOtpEnabled: { type: Boolean, default: false },
  whatsappOtpProvider: { type: String, default: 'MSG91 WhatsApp' },
  whatsappOtpAuthKey: { type: String, default: '' },
  whatsappOtpTemplateId: { type: String, default: '' },
  whatsappBusinessNumber: { type: String, default: '' },
  whatsappOtpLength: { type: String, default: '6' },
  emailOtpEnabled: { type: Boolean, default: true },
  emailOtpProvider: { type: String, default: 'Custom SMTP' },
  emailOtpApiKey: { type: String, default: '' },
  emailOtpSenderEmail: { type: String, default: '' },
  emailOtpSenderName: { type: String, default: '' },
  emailOtpTemplateId: { type: String, default: '' },
  emailOtpLength: { type: String, default: '6' },
  otpPrimaryChannel: { type: String, default: 'sms' },
  otpFallbackChannel1: { type: String, default: 'email' },
  otpFallbackChannel2: { type: String, default: 'none' },
  otpTestingEnabled: { type: Boolean, default: false },
  otpTestingAutofillEnabled: { type: Boolean, default: true },
  /** Nodemailer — used for signup, login, and forgot-password OTP when set (overrides EMAIL_* env). */
  smtpEmailUser: {
    type: String,
    default: ''
  },
  smtpEmailPass: {
    type: String,
    default: ''
  },
  smtpFromEmail: {
    type: String,
    default: ''
  },
  smtpEmailService: {
    type: String,
    default: ''
  },
  enableGDriveUpload: {
    type: Boolean,
    default: true
  },
  enableFileUpload: {
    type: Boolean,
    default: true
  },
  showTravelerDetails: {
    type: Boolean,
    default: true
  },
  allowedFileFormats: {
    type: [String],
    default: ["pdf", "jpg", "jpeg", "png"]
  },
  customerChatEnabled: {
    type: Boolean,
    default: true
  },
  customerChatMode: {
    type: String,
    default: 'external_link'
  },
  customerChatLink: {
    type: String,
    default: ''
  },
  customerChatTitle: {
    type: String,
    default: 'Continue with Chat'
  },
  customerChatDescription: {
    type: String,
    default: 'Get instant support from our visa team'
  },
  customerChatHeaderTitle: {
    type: String,
    default: 'Chat with us'
  },
  customerChatHeaderSubtitle: {
    type: String,
    default: 'We typically reply in a few minutes'
  },
  footerBrandPrimaryText: {
    type: String,
    default: ''
  },
  footerBrandAccentText: {
    type: String,
    default: ''
  },
  footerDescription: {
    type: String,
    default: ''
  },
  seoWebsiteTitle: {
    type: String,
    default: 'Visa & Voyage'
  },
  seoMetaDescription: {
    type: String,
    default: ''
  },
  seoMetaKeywords: {
    type: String,
    default: ''
  },
  seoHomepageTitle: {
    type: String,
    default: ''
  },
  seoHomepageDescription: {
    type: String,
    default: ''
  },
  seoOpenGraphTitle: {
    type: String,
    default: ''
  },
  seoOpenGraphDescription: {
    type: String,
    default: ''
  },
  seoTwitterTitle: {
    type: String,
    default: ''
  },
  seoTwitterDescription: {
    type: String,
    default: ''
  },
  seoCanonicalUrl: {
    type: String,
    default: 'https://visavo.in'
  },
  seoLogoUrl: {
    type: String,
    default: ''
  },
  seoFaviconUrl: {
    type: String,
    default: ''
  },
  seoFavicon32Url: {
    type: String,
    default: ''
  },
  seoFavicon192Url: {
    type: String,
    default: ''
  },
  seoAppleTouchIconUrl: {
    type: String,
    default: ''
  },
  seoRobotsIndex: {
    type: Boolean,
    default: true
  },
  seoSitemapUrl: {
    type: String,
    default: 'https://visavo.in/sitemap.xml'
  },
  whatsappTemplate: {
    type: String,
    default: 'Hello Visa & Voyage Team,\nI need help with my visa application.\n\nName: {{userName}}\nCountry: {{country}}\nVisa Type: {{visaType}}\nTravel Date: {{travelDate}}\nApplication ID: {{applicationId}}\n\nPlease guide me.'
  },
  /** Unsplash — used by `node fetchCountryImages.js` (Access Key required; secret/app id optional / reference). */
  unsplashAccessKey: {
    type: String,
    default: ''
  },
  unsplashSecretKey: {
    type: String,
    default: ''
  },
  unsplashApplicationId: {
    type: String,
    default: ''
  },
  /** Shown on every destination detail page — "Why book now?" bullets (global default). */
  destinationWhyBookNow: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  /** Shown on every destination detail page — "What's included" items (global default). */
  destinationIncludedItems: {
    type: [{
      title: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      icon: { type: String, trim: true, default: '' },
      color: { type: String, trim: true, default: 'blue' },
      showInAllActiveCountries: { type: Boolean, default: true },
      selectedCountries: [{ type: String, trim: true }],
    }],
    default: []
  },
  /** Shown on every destination detail page — FAQ list (global default). */
  destinationFaqs: {
    type: [{
      question: { type: String, trim: true, default: '' },
      answer: { type: String, trim: true, default: '' },
      showInAllActiveCountries: { type: Boolean, default: true },
      selectedCountries: [{ type: String, trim: true }],
    }],
    default: []
  },
  /** Shown on every destination detail page — numbered "How it works" steps (global default). */
  destinationHowItWorks: {
    type: [{
      title: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      showInAllActiveCountries: { type: Boolean, default: true },
      selectedCountries: [{ type: String, trim: true }],
    }],
    default: []
  },
  /** Shown on every destination detail page — generic visa requirement bullets (global default). */
  destinationVisaRequirements: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  /** Shown on the landing page under the hero search bar as four editable highlight cards. */
  landingHeroHighlights: {
    type: [{
      title: { type: String, trim: true, default: '' },
      body: { type: String, trim: true, default: '' },
    }],
    default: []
  },
  /** Shown under the landing page hero search bar as popular tag buttons. */
  popularCountries: {
    type: [String],
    default: ["USA", "UK", "EU Schengen", "Dubai", "Japan"]
  },

  /**
   * Universal "Visa Type" applied to every country whose `useGlobalVisaType` flag is
   * true. Admin changes this from Admin → Controls → Universal visa type control.
   * Empty string means "no global set — fall back to the per-country `visaType`".
  */
  globalVisaType: { type: String, default: '', trim: true },
  visaTypeScopeValues: {
    all: { type: String, default: '', trim: true },
    single: { type: String, default: '', trim: true },
    some: { type: String, default: '', trim: true },
  },
  visaTypeScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  visaTypeSingleCountryOverrides: {
    type: [
      {
        countryId: { type: String, trim: true, required: true },
        visaType: { type: String, trim: true, required: true },
      },
    ],
    default: [],
  },
  /** Universal "Validity" applied the same way. */
  globalValidity: { type: String, default: '', trim: true },
  /** Universal "Length of Stay" applied the same way. */
  globalLengthOfStay: { type: String, default: '', trim: true },
  lengthOfStayScopeValues: {
    all: { type: String, default: '', trim: true },
    single: { type: String, default: '', trim: true },
    some: { type: String, default: '', trim: true },
  },
  lengthOfStayScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  lengthOfStaySingleCountryOverrides: {
    type: [
      {
        countryId: { type: String, trim: true, required: true },
        lengthOfStay: { type: String, trim: true, required: true },
      },
    ],
    default: [],
  },
  /** Universal "Entry" / entry type applied the same way. */
  globalEntryType: { type: String, default: '', trim: true },
  /** Universal "Processing Days" (free text e.g. "5-10", "2-3 weeks") applied the same way. */
  globalProcessingDays: { type: String, default: '', trim: true },
  globalBasePrice: { type: Number, default: null },
  globalGovernmentFee: { type: Number, default: null },
  globalBasePriceVisibility: {
    applyToAllActiveCountries: { type: Boolean, default: true },
    selectedCountries: [{ type: String, trim: true }],
  },
  serviceFeeScopeValues: {
    all: { type: Number, default: null },
    single: { type: Number, default: null },
    some: { type: Number, default: null },
  },
  serviceFeeScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  serviceFeeCountryOverrides: {
    type: [{
      countryId: { type: String, trim: true, required: true },
      amount: { type: Number, min: 0, required: true },
      updatedAt: { type: Date, default: Date.now },
    }],
    default: []
  },
  globalGovernmentFeeVisibility: {
    applyToAllActiveCountries: { type: Boolean, default: true },
    selectedCountries: [{ type: String, trim: true }],
  },
  governmentFeeScopeValues: {
    all: { type: Number, default: null },
    single: { type: Number, default: null },
    some: { type: Number, default: null },
  },
  governmentFeeScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  globalEntryTypeVisibility: {
    applyToAllActiveCountries: { type: Boolean, default: true },
    selectedCountries: [{ type: String, trim: true }],
  },
  globalProcessingDaysVisibility: {
    applyToAllActiveCountries: { type: Boolean, default: true },
    selectedCountries: [{ type: String, trim: true }],
  },

  /**
   * Universal "Required Documents" — applied to every country whose
   * `useGlobalRequiredDocuments` flag is true. Stored as an ordered list of
   * doc keys; the labels come from the merged catalog (built-in + custom).
   */
  globalRequiredDocuments: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },

  /**
   * Admin-added document types extending the built-in catalog. Each entry is
   * `{ key, label }`. Keys are auto-prefixed with `custom_` on the server so
   * built-ins can never be accidentally overwritten.
   */
  customDocuments: {
    type: [{
      key: { type: String, trim: true, required: true },
      label: { type: String, trim: true, required: true },
      description: { type: String, trim: true, default: '' },
      icon: { type: String, trim: true, default: '' },
    }],
    default: []
  },

  /**
   * Per-key overrides for the built-in document catalog. This lets admins
   * change the public/admin-facing document name, helper description, and icon
   * without changing the stable key already referenced by countries/apps.
   */
  documentCatalogOverrides: {
    type: [{
      key: { type: String, trim: true, required: true },
      label: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      icon: { type: String, trim: true, default: '' },
      deleted: { type: Boolean, default: false },
    }],
    default: []
  },

  /**
   * Display toggles — when an admin turns a field off, every public country card and
   * the country details page hides that field. Stored on Settings so the toggle is
   * the same across all countries (admins can still override the underlying *value*
   * per country independently via Country Manager).
   */
  showVisaType: { type: Boolean, default: true },
  showValidity: { type: Boolean, default: true },
  showLengthOfStay: { type: Boolean, default: true },
  showEntryType: { type: Boolean, default: true },
  showProcessingDays: { type: Boolean, default: true },
  showRequiredDocuments: { type: Boolean, default: true },
  showVisaRequirements: { type: Boolean, default: true },
  maintenanceModeEnabled: { type: Boolean, default: false },
  showPopularCountries: { type: Boolean, default: true },

  /** Global GST toggles applied to every user payment calculation. */
  gstEnabled: { type: Boolean, default: true },
  gstRate: { type: Number, default: 18 },
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);

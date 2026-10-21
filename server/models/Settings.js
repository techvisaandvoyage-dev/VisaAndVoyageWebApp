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
  authPasswordEnabled: { type: Boolean, default: true },
  authGoogleEnabled: { type: Boolean, default: true },
  authFacebookEnabled: { type: Boolean, default: false },
  authPhoneOtpEnabled: { type: Boolean, default: true },
  authSmsOtpEnabled: { type: Boolean, default: false },
  authEmailOtpEnabled: { type: Boolean, default: true },
  countryCodeSettings: {
    defaultCountryCode: { type: String, default: '+91' },
    defaultCountryName: { type: String, default: 'India' },
    enabledCountries: {
      type: [mongoose.Schema.Types.Mixed],
      default: [
        {
          name: 'India',
          code: '+91',
          flag: '🇮🇳',
          active: true,
          locked: true,
        },
      ],
    },
  },
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
  footerLogo: {
    type: String,
    default: ''
  },
  // Deprecated fields: footerBrandPrimaryText and footerBrandAccentText
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
  footerShowSupportedBy: {
    type: Boolean,
    default: true
  },
  footerSupportedByText: {
    type: String,
    default: 'Supported by Krishna Agarwal & Associates'
  },
  footerSupportedByLink: {
    type: String,
    default: 'https://krishnaagarwalassociates.co.in/'
  },
  footerSections: {
    type: [
      {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
      },
    ],
    default: [
      { key: 'Company', label: 'Company' },
      { key: 'Services', label: 'Services' },
      { key: 'Support', label: 'Support' },
      { key: 'Legal', label: 'Legal' },
    ],
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
  hideWhatsAppSection: {
    type: Boolean,
    default: false
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
  /** Shown on every destination detail page — Info header badge, title, subtitle, and card order. */
  destinationVisaInfo: {
    badgeText: { type: String, default: "100% Online Process", trim: true },
    title: { type: String, default: "Visa Information", trim: true },
    subtitle: { type: String, default: "A 100% online visa application process that is simple, secure and hassle-free.", trim: true },
    cardOrder: { type: [String], default: ["lengthOfStay", "validity", "entry"] },
  },
  /** Custom headings, subtitles, and badges for each destination page section. */
  destinationSectionHeadings: {
    howItWorksHeading: { type: String, default: "How it works", trim: true },
    whyBookNowHeading: { type: String, default: "Why book now", trim: true },
    whyBookNowColWeProvides: { type: String, default: "We Provides", trim: true },
    whyBookNowColOthers: { type: String, default: "Others", trim: true },
    visaRequirementsHeading: { type: String, default: "Visa Requirements", trim: true },
    visaRequirementsSubtitle: { type: String, default: "Please ensure you have the following documents ready for a smooth visa application process.", trim: true },
    visaRequirementsNote: { type: String, default: "Visa rules and conditions may change. Please check the latest requirements before applying.", trim: true },
    documentsBadge: { type: String, default: "Verified & Secure", trim: true },
    documentsHeading: { type: String, default: "Documents Required", trim: true },
    documentsSubtitle: { type: String, default: "To proceed with the application immediately", trim: true },
    whatsIncludedHeading: { type: String, default: "What's Included", trim: true },
    whatsIncludedSubtitle: { type: String, default: "Everything you need for a smooth and hassle-free visa process.", trim: true },
    faqsHeading: { type: String, default: "Frequently Asked Questions", trim: true },
  },
  /** Custom copy, labels, and placeholders for the Start Application page tabs. */
  startApplicationPageCopy: {
    // Calendar Manager (Tab: calendar-manager)
    calendarHeading: { type: String, default: "Select Travel Date", trim: true },
    departureLabel: { type: String, default: "DEPARTURE", trim: true },
    departurePlaceholder: { type: String, default: "Select start date", trim: true },
    returnLabel: { type: String, default: "RETURN", trim: true },
    returnPlaceholder: { type: String, default: "Select end date", trim: true },
    dateWarningText: { type: String, default: "Select both travel dates to continue.", trim: true },

    // Traveler Form Manager (Tab: traveler-form-manager)
    badgeText: { type: String, default: "TRAVEL DETAILS", trim: true },
    title: { type: String, default: "Start your application", trim: true },
    subtitle: { type: String, default: "Fill travel details below to continue with your {country} visa process.", trim: true },
    visaTypeLabel: { type: String, default: "Type of Visa", trim: true },
    travelerPrefix: { type: String, default: "Traveler", trim: true },
    nameOnlyTag: { type: String, default: "Name only", trim: true },
    fullNameLabel: { type: String, default: "Full name (as on passport)", trim: true },
    fullNamePlaceholder: { type: String, default: "Enter name", trim: true },
    nameRequiredError: { type: String, default: "Traveler name is required.", trim: true },
    addTravelerButtonText: { type: String, default: "Add traveler", trim: true },
    proceedButtonText: { type: String, default: "Proceed to Summary", trim: true },
    applyForTitle: { type: String, default: "Apply for {country}", trim: true },
    travelSummaryBadge: { type: String, default: "Travel Summary", trim: true },
    travellerDetailsSubtitle: { type: String, default: "TRAVELLER DETAILS", trim: true },
    travellersCountLabel: { type: String, default: "TRAVELLERS", trim: true },
    amountToPayLabel: { type: String, default: "AMOUNT TO BE PAID NOW", trim: true },
    summaryVisaTypeLabel: { type: String, default: "VISA TYPE", trim: true },
    summaryTravelDatesLabel: { type: String, default: "TRAVEL DATES", trim: true },
    summaryTravelerNamesLabel: { type: String, default: "TRAVELER NAMES", trim: true },
    summaryAddedInFormBadge: { type: String, default: "Added in form", trim: true },
    summaryGovFeeLabel: { type: String, default: "Government Fee", trim: true },
    summaryServiceFeeLabel: { type: String, default: "Our Service Fee", trim: true },
    summaryDocNoticeTitle: {
      type: String,
      default: "No worries — you can upload your documents anytime later.",
      trim: true,
    },
    summaryDocNoticeDescription: {
      type: String,
      default: "After payment, your application will remain available in My Dashboard → Open Your Application → Upload Documents, where you can upload documents for each traveler whenever it’s convenient for you.",
      trim: true,
    },

    // Document Uploads (Tab: upload-methods)
    driveCardTitle: { type: String, default: "Document Drive Link (for all travelers)", trim: true },
    driveCardBadge: { type: String, default: "Optional", trim: true },
    driveCardTooltip: { type: String, default: "You can continue to payment now and share the Google Drive link later from your application dashboard.", trim: true },
    driveCardDescription: { type: String, default: "Upload all required and optional documents to Google Drive and share the folder link here. This link will be applicable for all travelers.", trim: true },
    driveInputLabel: { type: String, default: "Google Drive Link", trim: true },
    driveInputPlaceholder: { type: String, default: "https://drive.google.com/your-folder-link", trim: true },
    driveGuideTitle: { type: String, default: "How to Share Folder Link", trim: true },
    driveGuideStep1: { type: String, default: "Upload all required documents to your Google Drive folder.", trim: true },
    driveGuideStep2: { type: String, default: "Right-click the folder and select Share > Share.", trim: true },
    driveGuideStep3: { type: String, default: "Under General access, change Restricted to Anyone with the link.", trim: true },
    driveGuideStep4: { type: String, default: "Make sure the role is set to Viewer.", trim: true },
    driveGuideStep5: { type: String, default: "Click Copy link and paste it in the field below.", trim: true },

    // Documents (Tab: application-documents)
    // 1. Required Documents section
    showRequiredDocs: { type: Boolean, default: true },
    requiredDocsHeading: { type: String, default: "Documents Required", trim: true },
    requiredDocsDescription: { type: String, default: "These are the country documents required for this application.", trim: true },

    // 2. Normal Document Upload / Passport section
    showPassportUpload: { type: Boolean, default: true },
    passportUploadLabel: { type: String, default: "Passport Upload", trim: true },
    uploadButtonText: { type: String, default: "Upload", trim: true },
    replaceButtonText: { type: String, default: "Replace File", trim: true },
    removeButtonText: { type: String, default: "Remove", trim: true },
    passportUploadedText: { type: String, default: "Passport uploaded", trim: true },

    // 3. Optional Documents section
    showOptionalDocs: { type: Boolean, default: true },
    optionalDocsHeading: { type: String, default: "Optional Documents", trim: true },
    optionalDocsDescription: { type: String, default: "You can also attach other documents in the same Drive link.", trim: true },

    // 4. Google Drive Upload section
    showGDriveUpload: { type: Boolean, default: true },
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
  validityScopeValues: {
    all: { type: String, default: '', trim: true },
    single: { type: String, default: '', trim: true },
    some: { type: String, default: '', trim: true },
  },
  validityScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  validitySingleCountryOverrides: {
    type: [
      {
        countryId: { type: String, trim: true, required: true },
        validity: { type: String, trim: true, required: true },
      },
    ],
    default: [],
  },
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
  entryTypeScopeValues: {
    all: { type: String, default: '', trim: true },
    single: { type: String, default: '', trim: true },
    some: { type: String, default: '', trim: true },
  },
  entryTypeScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  entryTypeSingleCountryOverrides: {
    type: [
      {
        countryId: { type: String, trim: true, required: true },
        entryType: { type: String, trim: true, required: true },
      },
    ],
    default: [],
  },
  /** Universal "Processing Days" (free text e.g. "5-10", "2-3 weeks") applied the same way. */
  globalProcessingDays: { type: String, default: '', trim: true },
  processingDaysScopeValues: {
    all: { type: String, default: '', trim: true },
    single: { type: String, default: '', trim: true },
    some: { type: String, default: '', trim: true },
  },
  processingDaysScopeTargets: {
    singleCountryId: { type: String, trim: true, default: '' },
    someCountryIds: [{ type: String, trim: true }],
  },
  processingDaysSingleCountryOverrides: {
    type: [
      {
        countryId: { type: String, trim: true, required: true },
        processingDays: { type: String, trim: true, required: true },
      },
    ],
    default: [],
  },
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
  governmentFeeCountryOverrides: {
    type: [{
      countryId: { type: String, trim: true, required: true },
      amount: { type: Number, min: 0, required: true },
      updatedAt: { type: Date, default: Date.now },
    }],
    default: []
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
   * Universal optional/supporting documents. Uses the same country visibility
   * metadata as `globalRequiredDocuments`, but does not affect required upload
   * completion.
   */
  globalOptionalDocuments: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  globalOptionalDocumentsConfigured: { type: Boolean, default: false },
  requiredDocumentsHeading: { type: String, trim: true, default: 'Documents Required' },
  requiredDocumentsDescription: {
    type: String,
    trim: true,
    default: 'These are the country documents required for this application.'
  },
  optionalDocumentsHeading: { type: String, trim: true, default: 'Optional Documents' },
  optionalDocumentsDescription: {
    type: String,
    trim: true,
    default: 'You can also attach other documents in the same Drive link.'
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
  showVisaRequirements: { type: Boolean, default: false },
  showHowItWorks: { type: Boolean, default: true },
  showWhyBookNow: { type: Boolean, default: true },
  showDestinationDocuments: { type: Boolean, default: true },
  showWhatsIncluded: { type: Boolean, default: true },
  showFaqs: { type: Boolean, default: true },
  showDestinationRequiredDocs: { type: Boolean, default: true },
  showDestinationOptionalDocs: { type: Boolean, default: true },
  maintenanceModeEnabled: { type: Boolean, default: false },
  showPopularCountries: { type: Boolean, default: true },

  /** Global GST toggles applied to every user payment calculation. */
  gstEnabled: { type: Boolean, default: true },
  gstRate: { type: Number, default: 18 },
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);

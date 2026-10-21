const Settings = require('../models/Settings');
const { loadSettingsDocument } = require('../utils/settingsDocument');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  DEFAULT_SITE_URL,
  normalizeUrl,
  buildSeoPublicConfig,
} = require('../utils/seoSettings');

/** Strip secret JSON from admin API; expose whether server env supplies the Admin SDK key. */
const sanitizeSettingsForAdminResponse = (doc) => {
  const o = doc?.toObject ? doc.toObject() : { ...doc };
  delete o.firebaseServiceAccountJson;
  o.firebaseAdminFromEnv = Boolean(String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim());
  return o;
};

const DESTINATION_WHY_BOOK_NOW_FALLBACK = [
  'Fast document pre-check by visa specialists',
  'Transparent pricing and status updates',
  'Dedicated support throughout your application',
];

const DESTINATION_INCLUDED_FALLBACK = [
  {
    title: 'Application Form Guidance',
    description:
      'Step-by-step guidance to fill your visa application form accurately and confidently.',
    icon: 'ri-file-edit-line',
    color: 'blue',
  },
  {
    title: 'Document Checklist & Validation',
    description:
      'We provide a complete checklist and verify your documents to ensure everything is in order.',
    icon: 'ri-file-list-3-line',
    color: 'green',
  },
  {
    title: 'End-to-end Support till Submission',
    description:
      'Our experts assist you at every step until your application is successfully submitted.',
    icon: 'ri-customer-service-2-line',
    color: 'purple',
  },
];

const DESTINATION_HOW_IT_WORKS_FALLBACK = [
  {
    title: 'Apply with VisaAndVoyage',
    description:
      'Upload your documents on VisaAndVoyage or share over WhatsApp with our visa expert.',
  },
  {
    title: 'Experts review the documents',
    description: 'Our visa experts will verify your documents.',
  },
  {
    title: 'Prepare the application',
    description:
      'Our visa expert will help you create the application for document submission.',
  },
  {
    title: 'Visit the Visa Application Center',
    description:
      'Traveller visits their nearest Visa Application Center for document submission.',
  },
  {
    title: 'Get your visa',
    description:
      'Traveller will collect their passport from VAC or via courier with a stamped visa.',
  },
  {
    title: 'Enjoy your vacation',
    description:
      'Thanks for choosing VisaAndVoyage and we wish you an amazing journey.',
  },
];

const DESTINATION_VISA_REQUIREMENTS_FALLBACK = [
  'Original passport valid for at least 6 months with two blank pages',
  'Recent passport-size photograph on white background',
  'Confirmed return flight tickets',
  'Hotel booking or proof of accommodation for the entire stay',
  'Bank statements showing sufficient funds for the trip',
];

const DESTINATION_FAQS_FALLBACK = [
  {
    question: 'How long does processing take?',
    answer:
      'Typical processing varies by destination — each country page lists estimated timelines based on current embassy guidance.',
  },
  {
    question: 'Can I track my application?',
    answer: 'Yes, you can track status updates from your user dashboard after applying.',
  },
  {
    question: 'Is this fee refundable?',
    answer: 'Government and service fees depend on visa policy and review stage.',
  },
];

const LANDING_HERO_HIGHLIGHTS_FALLBACK = [
  {
    title: 'Fast Processing',
    body: 'Quick application flow and updates',
  },
  {
    title: 'Trusted Guidance',
    body: 'Accurate help for every step',
  },
  {
    title: 'All-in-One Platform',
    body: 'Search, apply, track, and upload',
  },
  {
    title: 'Secure & Private',
    body: 'Your documents stay protected',
  },
];

const FOOTER_CONFIG_FALLBACK = {
  brandPrimaryText: 'Visa &',
  brandAccentText: 'Voyage',
  description:
    'Your trusted partner for seamless visa applications worldwide. Fast, secure, and professionally managed.',
};

const START_APPLICATION_PAGE_COPY_FALLBACK = {
  // Calendar Manager
  calendarHeading: 'Select Travel Date',
  departureLabel: 'DEPARTURE',
  departurePlaceholder: 'Select start date',
  returnLabel: 'RETURN',
  returnPlaceholder: 'Select end date',
  dateWarningText: 'Select both travel dates to continue.',

  // Traveler Form Manager
  badgeText: 'TRAVEL DETAILS',
  title: 'Start your application',
  subtitle: 'Fill travel details below to continue with your {country} visa process.',
  visaTypeLabel: 'Type of Visa',
  travelerPrefix: 'Traveler',
  nameOnlyTag: 'Name only',
  fullNameLabel: 'Full name (as on passport)',
  fullNamePlaceholder: 'Enter name',
  nameRequiredError: 'Traveler name is required.',
  addTravelerButtonText: 'Add traveler',
  proceedButtonText: 'Proceed to Summary',
  applyForTitle: 'Apply for {country}',
  travelSummaryBadge: 'Travel Summary',
  travellerDetailsSubtitle: 'TRAVELLER DETAILS',
  travellersCountLabel: 'TRAVELLERS',
  amountToPayLabel: 'AMOUNT TO BE PAID NOW',
  summaryVisaTypeLabel: 'VISA TYPE',
  summaryTravelDatesLabel: 'TRAVEL DATES',
  summaryTravelerNamesLabel: 'TRAVELER NAMES',
  summaryAddedInFormBadge: 'Added in form',
  summaryGovFeeLabel: 'Government Fee',
  summaryServiceFeeLabel: 'Our Service Fee',
  summaryDocNoticeTitle: 'No worries — you can upload your documents anytime later.',
  summaryDocNoticeDescription: 'After payment, your application will remain available in My Dashboard → Open Your Application → Upload Documents, where you can upload documents for each traveler whenever it’s convenient for you.',

  // Document Uploads
  driveCardTitle: 'Document Drive Link (for all travelers)',
  driveCardBadge: 'Optional',
  driveCardTooltip: 'You can continue to payment now and share the Google Drive link later from your application dashboard.',
  driveCardDescription: 'Upload all required and optional documents to Google Drive and share the folder link here. This link will be applicable for all travelers.',
  driveInputLabel: 'Google Drive Link',
  driveInputPlaceholder: 'https://drive.google.com/your-folder-link',
  driveGuideTitle: 'How to Share Folder Link',
  driveGuideStep1: 'Upload all required documents to your Google Drive folder.',
  driveGuideStep2: 'Right-click the folder and select Share > Share.',
  driveGuideStep3: 'Under General access, change Restricted to Anyone with the link.',
  driveGuideStep4: 'Make sure the role is set to Viewer.',
  driveGuideStep5: 'Click Copy link and paste it in the field below.',

  // Documents
  showRequiredDocs: true,
  requiredDocsHeading: 'Documents Required',
  requiredDocsDescription: 'These are the country documents required for this application.',
  showPassportUpload: true,
  passportUploadLabel: 'Passport Upload',
  uploadButtonText: 'Upload',
  replaceButtonText: 'Replace File',
  removeButtonText: 'Remove',
  passportUploadedText: 'Passport uploaded',
  showOptionalDocs: true,
  optionalDocsHeading: 'Optional Documents',
  optionalDocsDescription: 'You can also attach other documents in the same Drive link.',
  showGDriveUpload: true,
};

const sanitizeStartApplicationPageCopy = (input = {}) => {
  const sanitized = {};
  for (const [key, defaultVal] of Object.entries(START_APPLICATION_PAGE_COPY_FALLBACK)) {
    if (typeof defaultVal === 'boolean') {
      if (typeof input[key] === 'boolean') {
        sanitized[key] = input[key];
      } else if (input[key] !== undefined) {
        sanitized[key] = input[key] === 'true' || input[key] === true || input[key] === 1;
      }
    } else {
      if (typeof input[key] === 'string') {
        sanitized[key] = input[key].trim();
      } else if (input[key] !== undefined) {
        sanitized[key] = String(input[key] || '').trim();
      }
    }
  }
  return sanitized;
};

const SEO_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'seo');
if (!fs.existsSync(SEO_UPLOADS_DIR)) {
  fs.mkdirSync(SEO_UPLOADS_DIR, { recursive: true });
}

const removeExistingSeoAsset = (filename) => {
  const target = path.join(SEO_UPLOADS_DIR, filename);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
};

const saveSeoFaviconAssets = async (file) => {
  const pipeline = sharp(file.buffer).flatten({ background: '#ffffff' });
  const favicon32Buffer = await pipeline.clone().resize(32, 32).png().toBuffer();
  const favicon192Buffer = await pipeline.clone().resize(192, 192).png().toBuffer();
  const appleTouchBuffer = await pipeline.clone().resize(180, 180).png().toBuffer();

  const files = {
    faviconUrl: 'favicon.ico',
    favicon32Url: 'favicon-32x32.png',
    favicon192Url: 'favicon-192x192.png',
    appleTouchIconUrl: 'apple-touch-icon.png',
  };

  Object.values(files).forEach(removeExistingSeoAsset);
  fs.writeFileSync(path.join(SEO_UPLOADS_DIR, files.faviconUrl), favicon32Buffer);
  fs.writeFileSync(path.join(SEO_UPLOADS_DIR, files.favicon32Url), favicon32Buffer);
  fs.writeFileSync(path.join(SEO_UPLOADS_DIR, files.favicon192Url), favicon192Buffer);
  fs.writeFileSync(path.join(SEO_UPLOADS_DIR, files.appleTouchIconUrl), appleTouchBuffer);

  return {
    seoFaviconUrl: `/uploads/seo/${files.faviconUrl}`,
    seoFavicon32Url: `/uploads/seo/${files.favicon32Url}`,
    seoFavicon192Url: `/uploads/seo/${files.favicon192Url}`,
    seoAppleTouchIconUrl: `/uploads/seo/${files.appleTouchIconUrl}`,
  };
};

const withDefaultVisibility = (item) => ({
  ...item,
  showInAllActiveCountries: item?.showInAllActiveCountries !== false,
  selectedCountries: normalizeCountryIdList(item?.selectedCountries),
});

/**
 * Admin saves one settings card at a time. The client always sends keys for that card;
 * password inputs often arrive as "" even though Mongo already has the secret (browser
 * state, tab order, or a refetch race). Never wipe an existing stored value when the
 * incoming trimmed string is empty — only a non-empty value replaces it.
 * @param {Record<string, unknown>} doc
 * @param {string} path
 * @param {unknown} incoming
 */
const assignSecretUnlessEmpty = (doc, path, incoming) => {
  if (incoming === undefined) return;
  const next = String(incoming ?? '').trim();
  if (next) doc[path] = next;
};

const sanitizeIncludedItemsList = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) => {
          if (typeof item === 'string') {
            return {
              title: item.trim(),
              description: '',
              icon: '',
              color: 'blue',
              showInAllActiveCountries: true,
              selectedCountries: [],
            };
          }

          return {
            title: String(item?.title ?? '').trim(),
            description: String(item?.description ?? '').trim(),
            icon: String(item?.icon ?? '').trim(),
            color: String(item?.color ?? 'blue').trim() || 'blue',
            showInAllActiveCountries: item?.showInAllActiveCountries !== false,
            selectedCountries: normalizeCountryIdList(item?.selectedCountries),
          };
        })
        .filter((item) => item.title)
    : [];

const normalizeCountryIdList = (list) =>
  Array.isArray(list)
    ? list.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];

const sanitizeVisibility = (item) => ({
  showInAllActiveCountries: item?.showInAllActiveCountries !== false,
  selectedCountries: normalizeCountryIdList(item?.selectedCountries),
});

const sanitizeVisibleTextList = (arr, key = 'text') =>
  Array.isArray(arr)
    ? arr
        .map((item) => {
          if (typeof item === 'string') {
            const text = String(item).trim();
            return text
              ? {
                  [key]: text,
                  showInAllActiveCountries: true,
                  selectedCountries: [],
                }
              : null;
          }
          const text = String(item?.[key] ?? item?.text ?? '').trim();
          if (!text) return null;
          return {
            [key]: text,
            ...sanitizeVisibility(item),
          };
        })
        .filter(Boolean)
    : [];

const sanitizeFaqList = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) => {
          const question = String(item?.question ?? '').trim();
          const answer = String(item?.answer ?? '').trim();
          return question && answer
            ? {
                question,
                answer,
                ...sanitizeVisibility(item),
              }
            : null;
        })
        .filter(Boolean)
    : [];

const sanitizeHowItWorksList = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) => {
          const title = String(item?.title ?? '').trim();
          const description = String(item?.description ?? '').trim();
          return title && description
            ? {
                title,
                description,
                ...sanitizeVisibility(item),
              }
            : null;
        })
        .filter(Boolean)
    : [];

const sanitizeGlobalRequiredDocumentList = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((item) => {
          if (typeof item === 'string') {
            const key = String(item).trim();
            return key
              ? { key, showInAllActiveCountries: true, selectedCountries: [] }
              : null;
          }
          const key = String(item?.key ?? '').trim();
          return key
            ? {
                key,
                ...sanitizeVisibility(item),
              }
            : null;
        })
        .filter(Boolean)
    : [];

const sanitizeLandingHeroHighlights = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => ({
      title: String(item?.title ?? '').trim(),
      body: String(item?.body ?? '').trim(),
    }))
    .filter((item) => item.title || item.body)
    .slice(0, 4);
};

const normalizeSettingsUpdatePayload = (body = {}) => ({
  ...body,
  gstEnabled:
    body.gstEnabled === undefined
      ? undefined
      : body.gstEnabled === false || body.gstEnabled === 'false'
        ? false
        : true,
  gstRate:
    body.gstRate === undefined
      ? undefined
      : Number(String(body.gstRate || '0').trim()),
  destinationWhyBookNow:
    body.destinationWhyBookNow === undefined
      ? undefined
      : sanitizeVisibleTextList(body.destinationWhyBookNow, 'text'),
  destinationIncludedItems:
    body.destinationIncludedItems === undefined
      ? undefined
      : sanitizeIncludedItemsList(body.destinationIncludedItems),
  destinationFaqs:
    body.destinationFaqs === undefined
      ? undefined
      : sanitizeFaqList(body.destinationFaqs),
  destinationHowItWorks:
    body.destinationHowItWorks === undefined
      ? undefined
      : sanitizeHowItWorksList(body.destinationHowItWorks),
  destinationVisaRequirements:
    body.destinationVisaRequirements === undefined
      ? undefined
      : sanitizeVisibleTextList(body.destinationVisaRequirements, 'text'),
  landingHeroHighlights:
    body.landingHeroHighlights === undefined
      ? undefined
      : sanitizeLandingHeroHighlights(body.landingHeroHighlights),
  popularCountries:
    body.popularCountries === undefined
      ? undefined
      : Array.isArray(body.popularCountries)
        ? body.popularCountries.map(s => String(s || '').trim()).filter(Boolean)
        : ["USA", "UK", "EU Schengen", "Dubai", "Japan"],
  destinationVisaInfo: body.destinationVisaInfo,
  destinationSectionHeadings:
    body.destinationSectionHeadings === undefined
      ? undefined
      : {
          howItWorksHeading: typeof body.destinationSectionHeadings?.howItWorksHeading === 'string' ? body.destinationSectionHeadings.howItWorksHeading.trim() : undefined,
          whyBookNowHeading: typeof body.destinationSectionHeadings?.whyBookNowHeading === 'string' ? body.destinationSectionHeadings.whyBookNowHeading.trim() : undefined,
          whyBookNowColWeProvides: typeof body.destinationSectionHeadings?.whyBookNowColWeProvides === 'string' ? body.destinationSectionHeadings.whyBookNowColWeProvides.trim() : undefined,
          whyBookNowColOthers: typeof body.destinationSectionHeadings?.whyBookNowColOthers === 'string' ? body.destinationSectionHeadings.whyBookNowColOthers.trim() : undefined,
          visaRequirementsHeading: typeof body.destinationSectionHeadings?.visaRequirementsHeading === 'string' ? body.destinationSectionHeadings.visaRequirementsHeading.trim() : undefined,
          visaRequirementsSubtitle: typeof body.destinationSectionHeadings?.visaRequirementsSubtitle === 'string' ? body.destinationSectionHeadings.visaRequirementsSubtitle.trim() : undefined,
          visaRequirementsNote: typeof body.destinationSectionHeadings?.visaRequirementsNote === 'string' ? body.destinationSectionHeadings.visaRequirementsNote.trim() : undefined,
          documentsBadge: typeof body.destinationSectionHeadings?.documentsBadge === 'string' ? body.destinationSectionHeadings.documentsBadge.trim() : undefined,
          documentsHeading: typeof body.destinationSectionHeadings?.documentsHeading === 'string' ? body.destinationSectionHeadings.documentsHeading.trim() : undefined,
          documentsSubtitle: typeof body.destinationSectionHeadings?.documentsSubtitle === 'string' ? body.destinationSectionHeadings.documentsSubtitle.trim() : undefined,
          whatsIncludedHeading: typeof body.destinationSectionHeadings?.whatsIncludedHeading === 'string' ? body.destinationSectionHeadings.whatsIncludedHeading.trim() : undefined,
          whatsIncludedSubtitle: typeof body.destinationSectionHeadings?.whatsIncludedSubtitle === 'string' ? body.destinationSectionHeadings.whatsIncludedSubtitle.trim() : undefined,
          faqsHeading: typeof body.destinationSectionHeadings?.faqsHeading === 'string' ? body.destinationSectionHeadings.faqsHeading.trim() : undefined,
        },
  startApplicationPageCopy:
    body.startApplicationPageCopy === undefined
      ? undefined
      : sanitizeStartApplicationPageCopy(body.startApplicationPageCopy),
  showPopularCountries:
    body.showPopularCountries === undefined
      ? undefined
      : body.showPopularCountries === false || body.showPopularCountries === 'false'
        ? false
        : true,
  allowedFileFormats:
    body.allowedFileFormats === undefined
      ? undefined
      : Array.isArray(body.allowedFileFormats)
        ? body.allowedFileFormats.map((s) => String(s || "").toLowerCase().trim()).filter(Boolean)
        : ["pdf", "jpg", "jpeg", "png"],
  footerBrandPrimaryText:
    body.footerBrandPrimaryText === undefined
      ? undefined
      : String(body.footerBrandPrimaryText || '').trim(),
  footerBrandAccentText:
    body.footerBrandAccentText === undefined
      ? undefined
      : String(body.footerBrandAccentText || '').trim(),
  footerDescription:
    body.footerDescription === undefined
      ? undefined
      : String(body.footerDescription || '').trim(),
  seoWebsiteTitle:
    body.seoWebsiteTitle === undefined
      ? undefined
      : String(body.seoWebsiteTitle || '').trim(),
  seoMetaDescription:
    body.seoMetaDescription === undefined
      ? undefined
      : String(body.seoMetaDescription || '').trim(),
  seoMetaKeywords:
    body.seoMetaKeywords === undefined
      ? undefined
      : String(body.seoMetaKeywords || '').trim(),
  seoHomepageTitle:
    body.seoHomepageTitle === undefined
      ? undefined
      : String(body.seoHomepageTitle || '').trim(),
  seoHomepageDescription:
    body.seoHomepageDescription === undefined
      ? undefined
      : String(body.seoHomepageDescription || '').trim(),
  seoOpenGraphTitle:
    body.seoOpenGraphTitle === undefined
      ? undefined
      : String(body.seoOpenGraphTitle || '').trim(),
  seoOpenGraphDescription:
    body.seoOpenGraphDescription === undefined
      ? undefined
      : String(body.seoOpenGraphDescription || '').trim(),
  seoTwitterTitle:
    body.seoTwitterTitle === undefined
      ? undefined
      : String(body.seoTwitterTitle || '').trim(),
  seoTwitterDescription:
    body.seoTwitterDescription === undefined
      ? undefined
      : String(body.seoTwitterDescription || '').trim(),
  seoCanonicalUrl:
    body.seoCanonicalUrl === undefined
      ? undefined
      : normalizeUrl(body.seoCanonicalUrl, DEFAULT_SITE_URL),
  seoRobotsIndex:
    body.seoRobotsIndex === undefined
      ? undefined
      : body.seoRobotsIndex === false || body.seoRobotsIndex === 'false'
        ? false
        : true,
  seoSitemapUrl:
    body.seoSitemapUrl === undefined
      ? undefined
      : normalizeUrl(body.seoSitemapUrl, `${DEFAULT_SITE_URL}/sitemap.xml`),
});

/**
 * @route   GET /api/admin/settings
 * @desc    Get global settings (Admin only)
 * @access  Private (Admin)
 */
const getSettings = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    res.json({ success: true, settings: sanitizeSettingsForAdminResponse(settings) });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
};

/**
 * @route   PUT /api/admin/settings
 * @desc    Update global settings (Admin only)
 * @access  Private (Admin)
 */
const updateSettings = async (req, res) => {
  try {
    const safePayload = normalizeSettingsUpdatePayload(req.body);
    const {
      razorpayKeyId,
      razorpayKeySecret,
      firebaseApiKey,
      firebaseAuthDomain,
      firebaseProjectId,
      googleClientId,
      googleClientSecret,
      firebaseStorageBucket,
      firebaseMessagingSenderId,
      firebaseAppId,
      sms91AuthKey,
      sms91TemplateId,
      sms91OtpLength,
      smtpEmailUser,
      smtpEmailPass,
      smtpFromEmail,
      smtpEmailService,
      enableGDriveUpload,
      enableFileUpload,
      showTravelerDetails,
      allowedFileFormats,
      customerChatEnabled,
      customerChatMode,
      customerChatLink,
      customerChatTitle,
      customerChatDescription,
      customerChatHeaderTitle,
      customerChatHeaderSubtitle,
      footerLogo,
      footerBrandPrimaryText,
      footerBrandAccentText,
      footerDescription,
      footerShowSupportedBy,
      footerSupportedByText,
      footerSupportedByLink,
      seoWebsiteTitle,
      seoMetaDescription,
      seoMetaKeywords,
      seoHomepageTitle,
      seoHomepageDescription,
      seoOpenGraphTitle,
      seoOpenGraphDescription,
      seoTwitterTitle,
      seoTwitterDescription,
      seoCanonicalUrl,
      seoRobotsIndex,
      seoSitemapUrl,
      whatsappTemplate,
      hideWhatsAppSection,
      unsplashAccessKey,
      unsplashSecretKey,
      unsplashApplicationId,
      showRequiredDocuments,
      showVisaRequirements,
      gstEnabled,
      gstRate,
      destinationWhyBookNow,
      destinationIncludedItems,
      destinationFaqs,
      destinationHowItWorks,
      destinationVisaRequirements,
      landingHeroHighlights,
      popularCountries,
      showPopularCountries,
      destinationVisaInfo,
      destinationSectionHeadings,
      startApplicationPageCopy,
    } = safePayload;
    console.log('Admin updating settings:', {
      razorpayKeyId,
      razorpayKeySecret: razorpayKeySecret ? '***' : '',
      firebaseProjectId,
      googleClientId,
      googleClientSecret: googleClientSecret ? '***' : '',
      firebaseApiKey: firebaseApiKey ? '***' : '',
      sms91AuthKey: sms91AuthKey ? '***' : '',
      sms91TemplateId,
      unsplashAccessKey: unsplashAccessKey ? '***' : '',
      unsplashSecretKey: unsplashSecretKey ? '***' : '',
      unsplashApplicationId: unsplashApplicationId || '',
      footerBrandPrimaryText: footerBrandPrimaryText || '',
      footerBrandAccentText: footerBrandAccentText || '',
    });
    
    const settings = await loadSettingsDocument();
    
    if (razorpayKeyId !== undefined) settings.razorpayKeyId = String(razorpayKeyId || '').trim();
    assignSecretUnlessEmpty(settings, 'razorpayKeySecret', razorpayKeySecret);
    assignSecretUnlessEmpty(settings, 'firebaseApiKey', firebaseApiKey);
    if (firebaseAuthDomain !== undefined) settings.firebaseAuthDomain = String(firebaseAuthDomain || '').trim();
    if (firebaseProjectId !== undefined) settings.firebaseProjectId = String(firebaseProjectId || '').trim();
    if (googleClientId !== undefined) settings.googleClientId = String(googleClientId || '').trim();
    assignSecretUnlessEmpty(settings, 'googleClientSecret', googleClientSecret);
    if (firebaseStorageBucket !== undefined) settings.firebaseStorageBucket = String(firebaseStorageBucket || '').trim();
    if (firebaseMessagingSenderId !== undefined) settings.firebaseMessagingSenderId = String(firebaseMessagingSenderId || '').trim();
    assignSecretUnlessEmpty(settings, 'firebaseAppId', firebaseAppId);
    assignSecretUnlessEmpty(settings, 'sms91AuthKey', sms91AuthKey);
    assignSecretUnlessEmpty(settings, 'sms91TemplateId', sms91TemplateId);
    if (sms91OtpLength !== undefined) {
      const normalizedOtpLength = String(sms91OtpLength || '6').trim();
      settings.sms91OtpLength = ['4', '6'].includes(normalizedOtpLength) ? normalizedOtpLength : '6';
    }
    if (smtpEmailUser !== undefined) settings.smtpEmailUser = String(smtpEmailUser || '').trim();
    assignSecretUnlessEmpty(settings, 'smtpEmailPass', smtpEmailPass);
    if (smtpFromEmail !== undefined) settings.smtpFromEmail = String(smtpFromEmail || '').trim();
    if (smtpEmailService !== undefined) {
      settings.smtpEmailService = String(smtpEmailService || '').trim();
    }
    if (enableGDriveUpload !== undefined) {
      settings.enableGDriveUpload = Boolean(enableGDriveUpload);
      if (settings.startApplicationPageCopy) {
        settings.startApplicationPageCopy.showGDriveUpload = Boolean(enableGDriveUpload);
      }
    }
    if (enableFileUpload !== undefined) settings.enableFileUpload = Boolean(enableFileUpload);
    if (showTravelerDetails !== undefined) settings.showTravelerDetails = Boolean(showTravelerDetails);
    if (allowedFileFormats !== undefined) {
      settings.allowedFileFormats = Array.isArray(allowedFileFormats)
        ? allowedFileFormats.map(s => String(s || '').toLowerCase().trim()).filter(Boolean)
        : ["pdf", "jpg", "jpeg", "png"];
    }
    if (customerChatEnabled !== undefined) settings.customerChatEnabled = Boolean(customerChatEnabled);
    if (customerChatMode !== undefined) settings.customerChatMode = String(customerChatMode || '').trim() || 'external_link';
    if (customerChatLink !== undefined) settings.customerChatLink = String(customerChatLink || '').trim();
    if (customerChatTitle !== undefined) settings.customerChatTitle = String(customerChatTitle || '').trim();
    if (customerChatDescription !== undefined) settings.customerChatDescription = String(customerChatDescription || '').trim();
    if (customerChatHeaderTitle !== undefined) settings.customerChatHeaderTitle = String(customerChatHeaderTitle || '').trim();
    if (customerChatHeaderSubtitle !== undefined) settings.customerChatHeaderSubtitle = String(customerChatHeaderSubtitle || '').trim();
    if (footerLogo !== undefined) settings.footerLogo = String(footerLogo || '').trim();
    if (footerBrandPrimaryText !== undefined) settings.footerBrandPrimaryText = String(footerBrandPrimaryText || '').trim();
    if (footerBrandAccentText !== undefined) settings.footerBrandAccentText = String(footerBrandAccentText || '').trim();
    if (footerDescription !== undefined) settings.footerDescription = String(footerDescription || '').trim();
    if (footerShowSupportedBy !== undefined) settings.footerShowSupportedBy = Boolean(footerShowSupportedBy);
    if (footerSupportedByText !== undefined) settings.footerSupportedByText = String(footerSupportedByText || '').trim();
    if (footerSupportedByLink !== undefined) settings.footerSupportedByLink = String(footerSupportedByLink || '').trim();
    if (seoWebsiteTitle !== undefined) settings.seoWebsiteTitle = String(seoWebsiteTitle || '').trim();
    if (seoMetaDescription !== undefined) settings.seoMetaDescription = String(seoMetaDescription || '').trim();
    if (seoMetaKeywords !== undefined) settings.seoMetaKeywords = String(seoMetaKeywords || '').trim();
    if (seoHomepageTitle !== undefined) settings.seoHomepageTitle = String(seoHomepageTitle || '').trim();
    if (seoHomepageDescription !== undefined) settings.seoHomepageDescription = String(seoHomepageDescription || '').trim();
    if (seoOpenGraphTitle !== undefined) settings.seoOpenGraphTitle = String(seoOpenGraphTitle || '').trim();
    if (seoOpenGraphDescription !== undefined) settings.seoOpenGraphDescription = String(seoOpenGraphDescription || '').trim();
    if (seoTwitterTitle !== undefined) settings.seoTwitterTitle = String(seoTwitterTitle || '').trim();
    if (seoTwitterDescription !== undefined) settings.seoTwitterDescription = String(seoTwitterDescription || '').trim();
    if (seoCanonicalUrl !== undefined) settings.seoCanonicalUrl = normalizeUrl(seoCanonicalUrl, DEFAULT_SITE_URL) || DEFAULT_SITE_URL;
    if (seoRobotsIndex !== undefined) settings.seoRobotsIndex = Boolean(seoRobotsIndex);
    if (seoSitemapUrl !== undefined) settings.seoSitemapUrl = normalizeUrl(seoSitemapUrl, `${DEFAULT_SITE_URL}/sitemap.xml`) || `${DEFAULT_SITE_URL}/sitemap.xml`;
    if (whatsappTemplate !== undefined) settings.whatsappTemplate = String(whatsappTemplate || '').trim();
    if (hideWhatsAppSection !== undefined) settings.hideWhatsAppSection = Boolean(hideWhatsAppSection);
    if (showRequiredDocuments !== undefined) settings.showRequiredDocuments = Boolean(showRequiredDocuments);
    if (showVisaRequirements !== undefined) settings.showVisaRequirements = Boolean(showVisaRequirements);
    assignSecretUnlessEmpty(settings, 'unsplashAccessKey', unsplashAccessKey);
    assignSecretUnlessEmpty(settings, 'unsplashSecretKey', unsplashSecretKey);
    if (unsplashApplicationId !== undefined) settings.unsplashApplicationId = String(unsplashApplicationId || '').trim();
    if (gstEnabled !== undefined) settings.gstEnabled = Boolean(gstEnabled);
    if (gstRate !== undefined) {
      const nextRate = Number.isFinite(Number(gstRate)) ? Number(gstRate) : 0;
      settings.gstRate = nextRate >= 0 ? nextRate : 0;
    }
 
    if (destinationWhyBookNow !== undefined) {
      settings.destinationWhyBookNow = sanitizeVisibleTextList(destinationWhyBookNow, 'text');
    }
    if (destinationIncludedItems !== undefined) {
      settings.destinationIncludedItems = sanitizeIncludedItemsList(destinationIncludedItems);
    }
    if (destinationFaqs !== undefined) {
      settings.destinationFaqs = sanitizeFaqList(destinationFaqs);
    }
    if (destinationHowItWorks !== undefined) {
      settings.destinationHowItWorks = sanitizeHowItWorksList(destinationHowItWorks);
    }
    if (destinationVisaRequirements !== undefined) {
      settings.destinationVisaRequirements = sanitizeVisibleTextList(destinationVisaRequirements, 'text');
    }
    if (landingHeroHighlights !== undefined) {
      settings.landingHeroHighlights = sanitizeLandingHeroHighlights(landingHeroHighlights);
    }
    if (popularCountries !== undefined) {
      settings.popularCountries = popularCountries;
    }
    if (showPopularCountries !== undefined) {
      settings.showPopularCountries = Boolean(showPopularCountries);
    }
    if (destinationVisaInfo !== undefined) {
      const current = settings.destinationVisaInfo || {};
      settings.destinationVisaInfo = {
        badgeText: typeof destinationVisaInfo?.badgeText === 'string' ? destinationVisaInfo.badgeText.trim() : (current.badgeText || '100% Online Process'),
        title: typeof destinationVisaInfo?.title === 'string' ? destinationVisaInfo.title.trim() : (current.title || 'Visa Information'),
        subtitle: typeof destinationVisaInfo?.subtitle === 'string' ? destinationVisaInfo.subtitle.trim() : (current.subtitle || 'A 100% online visa application process that is simple, secure and hassle-free.'),
        cardOrder: Array.isArray(destinationVisaInfo?.cardOrder) && destinationVisaInfo.cardOrder.length
          ? destinationVisaInfo.cardOrder.map(s => String(s).trim()).filter(Boolean)
          : (current.cardOrder || ['lengthOfStay', 'validity', 'entry']),
      };
    }
    if (destinationSectionHeadings !== undefined) {
      const current = settings.destinationSectionHeadings || {};
      settings.destinationSectionHeadings = {
        howItWorksHeading: destinationSectionHeadings?.howItWorksHeading !== undefined && destinationSectionHeadings?.howItWorksHeading !== '' ? destinationSectionHeadings.howItWorksHeading.trim() : (current.howItWorksHeading || 'How it works'),
        whyBookNowHeading: destinationSectionHeadings?.whyBookNowHeading !== undefined && destinationSectionHeadings?.whyBookNowHeading !== '' ? destinationSectionHeadings.whyBookNowHeading.trim() : (current.whyBookNowHeading || 'Why book now'),
        whyBookNowColWeProvides: destinationSectionHeadings?.whyBookNowColWeProvides !== undefined && destinationSectionHeadings?.whyBookNowColWeProvides !== '' ? destinationSectionHeadings.whyBookNowColWeProvides.trim() : (current.whyBookNowColWeProvides || 'We Provides'),
        whyBookNowColOthers: destinationSectionHeadings?.whyBookNowColOthers !== undefined && destinationSectionHeadings?.whyBookNowColOthers !== '' ? destinationSectionHeadings.whyBookNowColOthers.trim() : (current.whyBookNowColOthers || 'Others'),
        visaRequirementsHeading: destinationSectionHeadings?.visaRequirementsHeading !== undefined && destinationSectionHeadings?.visaRequirementsHeading !== '' ? destinationSectionHeadings.visaRequirementsHeading.trim() : (current.visaRequirementsHeading || 'Visa Requirements'),
        visaRequirementsSubtitle: destinationSectionHeadings?.visaRequirementsSubtitle !== undefined && destinationSectionHeadings?.visaRequirementsSubtitle !== '' ? destinationSectionHeadings.visaRequirementsSubtitle.trim() : (current.visaRequirementsSubtitle || 'Please ensure you have the following documents ready for a smooth visa application process.'),
        visaRequirementsNote: destinationSectionHeadings?.visaRequirementsNote !== undefined && destinationSectionHeadings?.visaRequirementsNote !== '' ? destinationSectionHeadings.visaRequirementsNote.trim() : (current.visaRequirementsNote || 'Visa rules and conditions may change. Please check the latest requirements before applying.'),
        documentsBadge: destinationSectionHeadings?.documentsBadge !== undefined && destinationSectionHeadings?.documentsBadge !== '' ? destinationSectionHeadings.documentsBadge.trim() : (current.documentsBadge || 'Verified & Secure'),
        documentsHeading: destinationSectionHeadings?.documentsHeading !== undefined && destinationSectionHeadings?.documentsHeading !== '' ? destinationSectionHeadings.documentsHeading.trim() : (current.documentsHeading || 'Documents Required'),
        documentsSubtitle: destinationSectionHeadings?.documentsSubtitle !== undefined && destinationSectionHeadings?.documentsSubtitle !== '' ? destinationSectionHeadings.documentsSubtitle.trim() : (current.documentsSubtitle || 'To proceed with the application immediately'),
        whatsIncludedHeading: destinationSectionHeadings?.whatsIncludedHeading !== undefined && destinationSectionHeadings?.whatsIncludedHeading !== '' ? destinationSectionHeadings.whatsIncludedHeading.trim() : (current.whatsIncludedHeading || "What's Included"),
        whatsIncludedSubtitle: destinationSectionHeadings?.whatsIncludedSubtitle !== undefined && destinationSectionHeadings?.whatsIncludedSubtitle !== '' ? destinationSectionHeadings.whatsIncludedSubtitle.trim() : (current.whatsIncludedSubtitle || 'Everything you need for a smooth and hassle-free visa process.'),
        faqsHeading: destinationSectionHeadings?.faqsHeading !== undefined && destinationSectionHeadings?.faqsHeading !== '' ? destinationSectionHeadings.faqsHeading.trim() : (current.faqsHeading || 'Frequently Asked Questions'),
      };
    }
    if (startApplicationPageCopy !== undefined) {
      const current = settings.startApplicationPageCopy ? (settings.startApplicationPageCopy.toObject ? settings.startApplicationPageCopy.toObject() : settings.startApplicationPageCopy) : {};
      const merged = { ...START_APPLICATION_PAGE_COPY_FALLBACK, ...current };
      for (const [k, v] of Object.entries(startApplicationPageCopy)) {
        if (v !== undefined) {
          merged[k] = v;
        }
      }
      settings.startApplicationPageCopy = merged;
      if (startApplicationPageCopy.showRequiredDocs !== undefined) {
        settings.showDestinationRequiredDocs = Boolean(startApplicationPageCopy.showRequiredDocs);
      }
      if (startApplicationPageCopy.showOptionalDocs !== undefined) {
        settings.showDestinationOptionalDocs = Boolean(startApplicationPageCopy.showOptionalDocs);
      }
      if (startApplicationPageCopy.showPassportUpload !== undefined) {
        settings.enableFileUpload = Boolean(startApplicationPageCopy.showPassportUpload);
      }
      if (startApplicationPageCopy.showGDriveUpload !== undefined) {
        settings.enableGDriveUpload = Boolean(startApplicationPageCopy.showGDriveUpload);
      }
    }

    await settings.save();
    console.log('Settings updated successfully');
    res.json({
      success: true,
      settings: sanitizeSettingsForAdminResponse(settings),
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating settings' });
  }
};

/**
 * @route   GET /api/config/razorpay
 * @desc    Get public Razorpay Key ID (Public/User)
 * @access  Public
 */
const getRazorpayKeyId = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    const keyIdFromSettings = String(settings?.razorpayKeyId || '').trim();
    const keyIdFromEnv = String(process.env.RAZORPAY_KEY_ID || '').trim();
    const keyId = keyIdFromSettings || keyIdFromEnv;

    if (!keyId) {
      return res.json({ success: false, message: 'Razorpay keys not configured' });
    }
    res.json({ success: true, keyId });
  } catch (error) {
    console.error('Error fetching Razorpay Key ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/config/firebase
 * @desc    Get public Firebase web config for the client app
 * @access  Public
 */
const getPaymentConfig = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    const keyIdFromSettings = String(settings?.razorpayKeyId || '').trim();
    const keyIdFromEnv = String(process.env.RAZORPAY_KEY_ID || '').trim();
    const keyId = keyIdFromSettings || keyIdFromEnv;
    const gstEnabled = settings?.gstEnabled !== false;
    const gstRate = Number.isFinite(Number(settings?.gstRate)) ? Number(settings?.gstRate) : 18;

    res.json({ success: true, keyId, gstEnabled, gstRate });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFirebaseConfig = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    const config = {
      apiKey: String(settings?.firebaseApiKey || process.env.FIREBASE_API_KEY || '').trim(),
      authDomain: String(settings?.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN || '').trim(),
      projectId: String(settings?.firebaseProjectId || process.env.FIREBASE_PROJECT_ID || '').trim(),
      googleClientId: String(settings?.googleClientId || process.env.GOOGLE_CLIENT_ID || '').trim(),
      storageBucket: String(settings?.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || '').trim(),
      messagingSenderId: String(settings?.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || '').trim(),
      appId: String(settings?.firebaseAppId || process.env.FIREBASE_APP_ID || '').trim(),
    };

    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      return res.json({ success: false, message: 'Firebase is not configured' });
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching Firebase config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/config/upload-settings
 * @desc    Get public document upload settings (Public/User)
 * @access  Public
 */
const getUploadSettings = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    const config = {
      enableGDriveUpload: settings?.enableGDriveUpload !== false,
      enableFileUpload: settings?.enableFileUpload !== false,
      showTravelerDetails: settings?.showTravelerDetails !== false,
      allowedFileFormats: Array.isArray(settings?.allowedFileFormats) && settings.allowedFileFormats.length > 0
        ? settings.allowedFileFormats
        : ["pdf", "jpg", "jpeg", "png"],
    };
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching upload settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/config/destination-content
 * @desc    Global "Why book now?" + "What's included" + FAQs for all destination detail pages.
 *          Per-country overrides on `Country` take precedence on the client.
 * @access  Public
 */
const getDestinationPageContent = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    const rawWhy = settings?.destinationWhyBookNow;
    const whyBookNow =
      Array.isArray(rawWhy) && rawWhy.length
        ? sanitizeVisibleTextList(rawWhy, 'text')
        : DESTINATION_WHY_BOOK_NOW_FALLBACK.map((text) => ({
            text,
            showInAllActiveCountries: true,
            selectedCountries: [],
          }));
    const rawInc = settings?.destinationIncludedItems;
    const included =
      Array.isArray(rawInc) && rawInc.length
        ? sanitizeIncludedItemsList(rawInc)
        : DESTINATION_INCLUDED_FALLBACK.map((item) => withDefaultVisibility(item));
    const rawFaqs = settings?.destinationFaqs;
    const faqs =
      Array.isArray(rawFaqs) && rawFaqs.length
        ? sanitizeFaqList(rawFaqs)
        : DESTINATION_FAQS_FALLBACK.map((item) => withDefaultVisibility(item));
    const rawHow = settings?.destinationHowItWorks;
    const howItWorks =
      Array.isArray(rawHow) && rawHow.length
        ? sanitizeHowItWorksList(rawHow)
        : DESTINATION_HOW_IT_WORKS_FALLBACK.map((item) => withDefaultVisibility(item));
    const rawVisaReq = settings?.destinationVisaRequirements;
    const visaRequirements =
      Array.isArray(rawVisaReq) && rawVisaReq.length
        ? sanitizeVisibleTextList(rawVisaReq, 'text')
        : DESTINATION_VISA_REQUIREMENTS_FALLBACK.map((text) => ({
            text,
            showInAllActiveCountries: true,
            selectedCountries: [],
          }));
    const rawLandingHighlights = settings?.landingHeroHighlights;
    const landingHeroHighlights =
      Array.isArray(rawLandingHighlights) && rawLandingHighlights.length
        ? sanitizeLandingHeroHighlights(rawLandingHighlights)
        : LANDING_HERO_HIGHLIGHTS_FALLBACK;
    const showVisaRequirements = settings?.showVisaRequirements === true;
    const showHowItWorks = settings?.showHowItWorks !== false;
    const showWhyBookNow = settings?.showWhyBookNow !== false;
    const showRequiredDocuments = settings?.showRequiredDocuments !== false;
    const showDestinationDocuments = settings?.showDestinationDocuments !== false;
    const showDestinationRequiredDocs = settings?.showDestinationRequiredDocs !== false;
    const showDestinationOptionalDocs = settings?.showDestinationOptionalDocs !== false;
    const showWhatsIncluded = settings?.showWhatsIncluded !== false;
    const showFaqs = settings?.showFaqs !== false;
    const popularCountries = Array.isArray(settings?.popularCountries) && settings.popularCountries.length > 0
      ? settings.popularCountries
      : ["USA", "UK", "EU Schengen", "Dubai", "Japan"];
    const showPopularCountries = settings?.showPopularCountries !== false;

    res.json({
      success: true,
      config: {
        whyBookNow,
        included,
        faqs,
        howItWorks,
        visaRequirements,
        showVisaRequirements,
        showHowItWorks,
        showWhyBookNow,
        showRequiredDocuments,
        showDestinationDocuments,
        showDestinationRequiredDocs,
        showDestinationOptionalDocs,
        showWhatsIncluded,
        showFaqs,
        landingHeroHighlights,
        popularCountries,
        showPopularCountries,
        destinationVisaInfo: settings?.destinationVisaInfo || {
          badgeText: '100% Online Process',
          title: 'Visa Information',
          subtitle: 'A 100% online visa application process that is simple, secure and hassle-free.',
          cardOrder: ['lengthOfStay', 'validity', 'entry'],
        },
        destinationSectionHeadings: {
          howItWorksHeading: settings?.destinationSectionHeadings?.howItWorksHeading || 'How it works',
          whyBookNowHeading: settings?.destinationSectionHeadings?.whyBookNowHeading || 'Why book now',
          whyBookNowColWeProvides: settings?.destinationSectionHeadings?.whyBookNowColWeProvides || 'We Provides',
          whyBookNowColOthers: settings?.destinationSectionHeadings?.whyBookNowColOthers || 'Others',
          visaRequirementsHeading: settings?.destinationSectionHeadings?.visaRequirementsHeading || 'Visa Requirements',
          visaRequirementsSubtitle: settings?.destinationSectionHeadings?.visaRequirementsSubtitle || 'Please ensure you have the following documents ready for a smooth visa application process.',
          visaRequirementsNote: settings?.destinationSectionHeadings?.visaRequirementsNote || 'Visa rules and conditions may change. Please check the latest requirements before applying.',
          documentsBadge: settings?.destinationSectionHeadings?.documentsBadge || 'Verified & Secure',
          documentsHeading: settings?.destinationSectionHeadings?.documentsHeading || 'Documents Required',
          documentsSubtitle: settings?.destinationSectionHeadings?.documentsSubtitle || 'To proceed with the application immediately',
          whatsIncludedHeading: settings?.destinationSectionHeadings?.whatsIncludedHeading || "What's Included",
          whatsIncludedSubtitle: settings?.destinationSectionHeadings?.whatsIncludedSubtitle || 'Everything you need for a smooth and hassle-free visa process.',
          faqsHeading: settings?.destinationSectionHeadings?.faqsHeading || 'Frequently Asked Questions',
        },
        startApplicationPageCopy: {
          ...START_APPLICATION_PAGE_COPY_FALLBACK,
          ...(settings?.startApplicationPageCopy ? (settings.startApplicationPageCopy.toObject ? settings.startApplicationPageCopy.toObject() : settings.startApplicationPageCopy) : {}),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching destination page content:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCustomerChatConfig = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    res.json({
      success: true,
      config: {
        enabled: settings?.customerChatEnabled !== false,
        mode: String(settings?.customerChatMode || 'external_link').trim() || 'external_link',
        link: String(settings?.customerChatLink || '').trim(),
        title: String(settings?.customerChatTitle || '').trim() || 'Continue with Chat',
        description:
          String(settings?.customerChatDescription || '').trim() ||
          'Get instant support from our visa team',
        headerTitle: String(settings?.customerChatHeaderTitle || '').trim() || 'Chat with us',
        headerSubtitle:
          String(settings?.customerChatHeaderSubtitle || '').trim() ||
          'We typically reply in a few minutes',
        whatsappTemplate: String(settings?.whatsappTemplate || '').trim() ||
          'Hello Visa & Voyage Team,\nI need help with my visa application.\n\nName: {{userName}}\nCountry: {{country}}\nVisa Type: {{visaType}}\nTravel Date: {{travelDate}}\nApplication ID: {{applicationId}}\n\nPlease guide me.',
        hideWhatsAppSection: settings?.hideWhatsAppSection === true,
      },
    });
  } catch (error) {
    console.error('Error fetching customer chat config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFooterConfig = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    const sections = settings?.footerSections?.length
      ? settings.footerSections
      : [{ key: 'Company', label: 'Company' }, { key: 'Services', label: 'Services' }, { key: 'Support', label: 'Support' }, { key: 'Legal', label: 'Legal' }];
    res.json({
      success: true,
      config: {
        logo: settings?.footerLogo || '',
        brandPrimaryText:
          String(settings?.footerBrandPrimaryText || '').trim() ||
          FOOTER_CONFIG_FALLBACK.brandPrimaryText,
        brandAccentText:
          String(settings?.footerBrandAccentText || '').trim() ||
          FOOTER_CONFIG_FALLBACK.brandAccentText,
        description:
          String(settings?.footerDescription || '').trim() ||
          FOOTER_CONFIG_FALLBACK.description,
        supportedByShow: settings?.footerShowSupportedBy !== undefined ? settings.footerShowSupportedBy : false,
        supportedByText: settings?.footerSupportedByText !== undefined ? settings.footerSupportedByText : '',
        supportedByLink: settings?.footerSupportedByLink !== undefined ? settings.footerSupportedByLink : '',
        sections,
      },
    });
  } catch (error) {
    console.error('Error fetching footer config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const uploadSeoAssets = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();

    if (req.files?.favicon?.[0]) {
      const faviconAssets = await saveSeoFaviconAssets(req.files.favicon[0]);
      settings.seoFaviconUrl = faviconAssets.seoFaviconUrl;
      settings.seoFavicon32Url = faviconAssets.seoFavicon32Url;
      settings.seoFavicon192Url = faviconAssets.seoFavicon192Url;
      settings.seoAppleTouchIconUrl = faviconAssets.seoAppleTouchIconUrl;
    }

    await settings.save();

    res.json({
      success: true,
      settings: sanitizeSettingsForAdminResponse(settings),
      seo: buildSeoPublicConfig(settings, req),
      message: 'SEO assets updated successfully',
    });
  } catch (error) {
    console.error('Error uploading SEO assets:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload SEO assets' });
  }
};

const getSeoConfig = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    res.json({
      success: true,
      config: buildSeoPublicConfig(settings, req),
    });
  } catch (error) {
    console.error('Error fetching SEO config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/config/site-state
 * @desc    Public runtime site flags for the client app shell
 * @access  Public
 */
const getSiteState = async (req, res) => {
  try {
    const settings = await loadSettingsDocument();
    res.json({
      success: true,
      config: {
        maintenanceModeEnabled: settings?.maintenanceModeEnabled === true,
      },
    });
  } catch (error) {
    console.error('Error fetching site state:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getRazorpayKeyId,
  getPaymentConfig,
  getFirebaseConfig,
  getUploadSettings,
  getDestinationPageContent,
  getSiteState,
  getCustomerChatConfig,
  getFooterConfig,
  getSeoConfig,
  uploadSeoAssets,
  getFooterSections: async (req, res) => {
    try {
      const settings = await loadSettingsDocument();
      const sections = settings?.footerSections?.length
        ? settings.footerSections
        : [{ key: 'Company', label: 'Company' }, { key: 'Services', label: 'Services' }, { key: 'Support', label: 'Support' }, { key: 'Legal', label: 'Legal' }];
      res.json({ success: true, data: sections });
    } catch (error) {
      console.error('getFooterSections:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  updateFooterSections: async (req, res) => {
    try {
      const sections = req.body.sections;
      if (!Array.isArray(sections)) {
        return res.status(400).json({ success: false, message: 'Sections must be an array.' });
      }
      const normalized = sections.map((s) => {
        const label = String(s.label || s.key || '').trim();
        const key = String(s.key || label || '').trim();
        return key && label ? { key, label } : null;
      }).filter(Boolean);
      const settings = await loadSettingsDocument();
      settings.footerSections = normalized;
      await settings.save();
      res.json({ success: true, data: normalized });
    } catch (error) {
      console.error('updateFooterSections:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};

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
    if (enableGDriveUpload !== undefined) settings.enableGDriveUpload = Boolean(enableGDriveUpload);
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

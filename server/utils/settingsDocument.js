const Settings = require('../models/Settings');

const normalizeIncludedItem = (item) => {
  if (typeof item === 'string') {
    const title = String(item).trim();
    if (!title || title === '[object Object]') return null;
    return {
      title,
      description: '',
      icon: '',
      color: 'blue',
    };
  }

  const title = String(item?.title ?? '').trim();
  if (!title || title === '[object Object]') return null;

  return {
    title,
    description: String(item?.description ?? '').trim(),
    icon: String(item?.icon ?? '').trim(),
    color: String(item?.color ?? 'blue').trim() || 'blue',
    showInAllActiveCountries: item?.showInAllActiveCountries !== false,
    selectedCountries: normalizeStringList(item?.selectedCountries),
  };
};

const normalizeFaq = (item) => {
  const question = String(item?.question ?? '').trim();
  const answer = String(item?.answer ?? '').trim();
  return question && answer
    ? {
        question,
        answer,
        showInAllActiveCountries: item?.showInAllActiveCountries !== false,
        selectedCountries: normalizeStringList(item?.selectedCountries),
      }
    : null;
};

const normalizeHowItWorks = (item) => {
  const title = String(item?.title ?? '').trim();
  const description = String(item?.description ?? '').trim();
  return title && description
    ? {
        title,
        description,
        showInAllActiveCountries: item?.showInAllActiveCountries !== false,
        selectedCountries: normalizeStringList(item?.selectedCountries),
      }
    : null;
};

const normalizeStringList = (list) =>
  Array.isArray(list)
    ? list.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];

const normalizeVisibleTextItem = (item, key = 'text') => {
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
  return text
    ? {
        [key]: text,
        showInAllActiveCountries: item?.showInAllActiveCountries !== false,
        selectedCountries: normalizeStringList(item?.selectedCountries),
      }
    : null;
};

const sanitizeSettingsPayload = (raw = {}) => ({
  destinationWhyBookNow: (Array.isArray(raw.destinationWhyBookNow) ? raw.destinationWhyBookNow : [])
    .map((item) => normalizeVisibleTextItem(item, 'text'))
    .filter(Boolean),
  destinationIncludedItems: (Array.isArray(raw.destinationIncludedItems) ? raw.destinationIncludedItems : [])
    .map(normalizeIncludedItem)
    .filter(Boolean),
  destinationFaqs: (Array.isArray(raw.destinationFaqs) ? raw.destinationFaqs : [])
    .map(normalizeFaq)
    .filter(Boolean),
  destinationHowItWorks: (Array.isArray(raw.destinationHowItWorks) ? raw.destinationHowItWorks : [])
    .map(normalizeHowItWorks)
    .filter(Boolean),
  destinationVisaRequirements: (Array.isArray(raw.destinationVisaRequirements) ? raw.destinationVisaRequirements : [])
    .map((item) => normalizeVisibleTextItem(item, 'text'))
    .filter(Boolean),
  globalRequiredDocuments: (Array.isArray(raw.globalRequiredDocuments) ? raw.globalRequiredDocuments : [])
    .map((item) => {
      if (typeof item === 'string') {
        const key = String(item).trim();
        return key ? { key, showInAllActiveCountries: true, selectedCountries: [] } : null;
      }
      const key = String(item?.key ?? '').trim();
      return key
        ? {
            key,
            showInAllActiveCountries: item?.showInAllActiveCountries !== false,
            selectedCountries: normalizeStringList(item?.selectedCountries),
          }
        : null;
    })
    .filter(Boolean),
  globalOptionalDocuments: (Array.isArray(raw.globalOptionalDocuments) ? raw.globalOptionalDocuments : [])
    .map((item) => {
      if (typeof item === 'string') {
        const key = String(item).trim();
        return key ? { key, showInAllActiveCountries: true, selectedCountries: [] } : null;
      }
      const key = String(item?.key ?? '').trim();
      return key
        ? {
            key,
            showInAllActiveCountries: item?.showInAllActiveCountries !== false,
            selectedCountries: normalizeStringList(item?.selectedCountries),
          }
        : null;
    })
    .filter(Boolean),
  globalOptionalDocumentsConfigured: raw.globalOptionalDocumentsConfigured === true,
  requiredDocumentsHeading: String(raw.requiredDocumentsHeading ?? 'Documents Required').trim() || 'Documents Required',
  requiredDocumentsDescription:
    String(raw.requiredDocumentsDescription ?? 'These are the country documents required for this application.').trim() ||
    'These are the country documents required for this application.',
  optionalDocumentsHeading: String(raw.optionalDocumentsHeading ?? 'Optional Documents').trim() || 'Optional Documents',
  optionalDocumentsDescription:
    String(raw.optionalDocumentsDescription ?? 'You can also attach other documents in the same Drive link.').trim() ||
    'You can also attach other documents in the same Drive link.',
});

const loadSettingsDocument = async () => {
  try {
    let settings = await Settings.findOne({ singleton: 'global' });
    if (!settings) {
      settings = await Settings.create({ singleton: 'global' });
    }
    return settings;
  } catch (error) {
    const raw = await Settings.collection.findOne({ singleton: 'global' });
    if (!raw) {
      return Settings.create({ singleton: 'global' });
    }

    const healed = sanitizeSettingsPayload(raw);
    await Settings.collection.updateOne(
      { _id: raw._id },
      { $set: healed }
    );

    return Settings.findById(raw._id);
  }
};

module.exports = {
  loadSettingsDocument,
  sanitizeSettingsPayload,
};

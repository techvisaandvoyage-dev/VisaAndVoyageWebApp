const VisaConfiguration = require('../models/VisaConfiguration');
const Country = require('../models/Country');

const COUNTRY_VISA_FLAG_BY_FIELD = {
  visaType: 'useGlobalVisaType',
  processingDays: 'useGlobalProcessingDays',
  validity: 'useGlobalValidity',
  lengthOfStay: 'useGlobalLengthOfStay',
  entryType: 'useGlobalEntryType',
  requiredDocuments: 'useGlobalRequiredDocuments',
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const normalizeCustomVisaTypes = (values) =>
  Array.isArray(values)
    ? values
        .map((item) => ({
          id: String(item?.id ?? item?.name ?? '').trim(),
          name: String(item?.name ?? '').trim(),
          active: item?.active !== false,
        }))
        .filter((item) => item.name)
    : [];

const buildCountryVisaSet = (data, { forceGlobal = false } = {}) => {
  const set = {};

  Object.entries(COUNTRY_VISA_FLAG_BY_FIELD).forEach(([field, flag]) => {
    if (hasOwn(data, field)) {
      set[field] = data[field];
    }
    if (hasOwn(data, flag)) {
      set[flag] = Boolean(data[flag]);
    } else if (forceGlobal && hasOwn(data, field)) {
      set[flag] = true;
    }
  });

  if (hasOwn(data, 'optionalDocuments')) {
    set.optionalDocuments = Array.isArray(data.optionalDocuments)
      ? data.optionalDocuments.map((key) => String(key ?? '').trim()).filter(Boolean)
      : [];
  }

  if (hasOwn(data, 'customVisaTypes')) {
    set.customVisaTypes = normalizeCustomVisaTypes(data.customVisaTypes);
  }

  if (hasOwn(data, 'useGlobalCustomVisaTypes')) {
    set.useCustomVisaTypes = !Boolean(data.useGlobalCustomVisaTypes);
  } else if (hasOwn(data, 'useCustomVisaTypes')) {
    set.useCustomVisaTypes = Boolean(data.useCustomVisaTypes);
  } else if (forceGlobal && hasOwn(data, 'customVisaTypes')) {
    set.useCustomVisaTypes = false;
  }

  return set;
};

const syncSelectedCountriesToDefaultVisa = async (countryIds, data) => {
  const selectedIds = Array.isArray(countryIds)
    ? countryIds.map((id) => String(id ?? '').trim()).filter(Boolean)
    : [];
  if (selectedIds.length === 0) return;

  const set = buildCountryVisaSet(data, { forceGlobal: true });
  if (Object.keys(set).length === 0) return;

  await Country.updateMany(
    { _id: { $in: selectedIds } },
    { $set: set }
  );
};

const syncGlobalVisaDefaultsToCountries = async (data) => {
  const updates = [];

  Object.entries(COUNTRY_VISA_FLAG_BY_FIELD).forEach(([field, flag]) => {
    if (!hasOwn(data, field)) return;
    updates.push(
      Country.updateMany(
        { [flag]: { $ne: false } },
        { $set: { [field]: data[field] } }
      )
    );
  });

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};

const syncCountryToVisaOverride = async (countryId, data) => {
  const set = buildCountryVisaSet(data);
  if (Object.keys(set).length === 0) return;
  await Country.updateOne({ _id: countryId }, { $set: set });
};

// @desc    Create or update the global DEFAULT visa configuration
// @route   POST /api/admin/visa/default
// @access  Private/Admin
const createOrUpdateDefault = async (req, res) => {
  try {
    const { selectedCountries, ...data } = req.body;
    let defaultVisa = await VisaConfiguration.findOne({ sourceType: 'DEFAULT' });

    if (defaultVisa) {
      Object.assign(defaultVisa, data);
      await defaultVisa.save();
    } else {
      defaultVisa = await VisaConfiguration.create({
        ...data,
        sourceType: 'DEFAULT',
        countryId: null
      });
    }

    // If specific countries were selected to apply this default, clear their overrides
    if (Array.isArray(selectedCountries) && selectedCountries.length > 0) {
      await VisaConfiguration.deleteMany({
        countryId: { $in: selectedCountries },
        sourceType: 'OVERRIDE'
      });
      await syncSelectedCountriesToDefaultVisa(selectedCountries, data);
    } else {
      await syncGlobalVisaDefaultsToCountries(data);
    }

    res.status(200).json({
      success: true,
      message: 'Default visa configuration updated successfully',
      data: defaultVisa
    });
  } catch (error) {
    console.error('Error updating default visa config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create or update a country-specific OVERRIDE visa configuration
// @route   PUT /api/admin/visa/:countryId
// @access  Private/Admin
const updateCountryOverride = async (req, res) => {
  try {
    const { countryId } = req.params;
    const data = req.body;

    // Verify country exists
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }

    let overrideVisa = await VisaConfiguration.findOne({
      countryId,
      sourceType: 'OVERRIDE'
    });

    if (overrideVisa) {
      Object.assign(overrideVisa, data);
      await overrideVisa.save();
    } else {
      overrideVisa = await VisaConfiguration.create({
        ...data,
        sourceType: 'OVERRIDE',
        countryId
      });
    }

    await syncCountryToVisaOverride(countryId, data);

    res.status(200).json({
      success: true,
      message: `Override updated for ${country.name}`,
      data: overrideVisa
    });
  } catch (error) {
    console.error('Error updating country override:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get visa configuration for a specific country (Public/Admin)
// @route   GET /api/admin/visa/:countryId
// @access  Public
const getVisa = async (req, res) => {
  try {
    const { countryId } = req.params;

    const overrideVisa = await VisaConfiguration.findOne({
      countryId,
      sourceType: 'OVERRIDE'
    });

    if (overrideVisa) {
      return res.status(200).json({
        success: true,
        source: 'OVERRIDE',
        data: overrideVisa
      });
    }

    const defaultVisa = await VisaConfiguration.findOne({ sourceType: 'DEFAULT' });
    res.status(200).json({
      success: true,
      source: 'DEFAULT',
      data: defaultVisa || {}
    });
  } catch (error) {
    console.error('Error getting visa config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all visa configurations for Admin Table
// @route   GET /api/admin/visa
// @access  Private/Admin
const getAllVisasAdmin = async (req, res) => {
  try {
    const defaultVisa = await VisaConfiguration.findOne({ sourceType: 'DEFAULT' });
    const overrides = await VisaConfiguration.find({ sourceType: 'OVERRIDE' });

    res.status(200).json({
      success: true,
      default: defaultVisa || {},
      overrides: overrides
    });
  } catch (error) {
    console.error('Error getting all visa configs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createOrUpdateDefault,
  updateCountryOverride,
  getVisa,
  getAllVisasAdmin
};

const mongoose = require('mongoose');
const Country = require('../models/Country');
const { loadSettingsDocument } = require('../utils/settingsDocument');
const {
  SUPPORTED_FEE_MANAGER_CURRENCIES,
  normalizeCurrency,
  calculateFeeTotals,
  fetchInrExchangeRate,
  buildFeeManagerRow,
  getFeeManagerContext,
} = require('../services/feeManagerService');

const parseEditablePayload = async (country, body = {}) => {
  const currency = normalizeCurrency(body.currency);
  const amount = Number(body.amount);
  const forexFeePercent = Number(body.forexFeePercent);

  if (!SUPPORTED_FEE_MANAGER_CURRENCIES.includes(currency)) {
    const err = new Error('Unsupported currency selected.');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(amount) || amount < 0) {
    const err = new Error('Amount must be a valid number.');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(forexFeePercent) || forexFeePercent < 0) {
    const err = new Error('Forex fee % must be a valid number.');
    err.statusCode = 400;
    throw err;
  }

  const settings = await loadSettingsDocument();
  const row = buildFeeManagerRow(country, settings);
  
  const serviceFeeBeforeGSTFromClient = body.serviceFeeBeforeGST !== undefined ? Number(body.serviceFeeBeforeGST) : undefined;
  const serviceFeeBeforeGST = serviceFeeBeforeGSTFromClient !== undefined && Number.isFinite(serviceFeeBeforeGSTFromClient) && serviceFeeBeforeGSTFromClient >= 0
    ? serviceFeeBeforeGSTFromClient
    : row.serviceFeeBeforeGST;

  const exchangeRate = currency === 'INR' ? 1 : await fetchInrExchangeRate(currency);
  const totals = calculateFeeTotals({
    amount,
    exchangeRate,
    forexFeePercent,
    serviceFeeBeforeGST: serviceFeeBeforeGST,
    gstEnabled: country?.useGlobalGst !== false ? settings?.gstEnabled !== false : country?.gstEnabled !== false,
    gstRate:
      country?.useGlobalGst !== false
        ? Number.isFinite(Number(settings?.gstRate)) && Number(settings?.gstRate) >= 0
          ? Number(settings.gstRate)
          : 18
        : Number.isFinite(Number(country?.gstRate)) && Number(country?.gstRate) >= 0
          ? Number(country.gstRate)
          : Number.isFinite(Number(settings?.gstRate)) && Number(settings?.gstRate) >= 0
            ? Number(settings.gstRate)
            : 18,
  });

  return { currency, amount, exchangeRate, forexFeePercent, totals, row };
};

const getFeeManagerRows = async (_req, res) => {
  try {
    const [countries, settings] = await Promise.all([
      Country.find({ isActive: { $ne: false } }).sort({ name: 1 }),
      loadSettingsDocument(),
    ]);

    const rows = countries.map((country) => buildFeeManagerRow(country, settings));
    res.json({ success: true, currencies: SUPPORTED_FEE_MANAGER_CURRENCIES, rows });
  } catch (error) {
    console.error('getFeeManagerRows error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const convertFeeManagerValues = async (req, res) => {
  try {
    const countryId = String(req.body?.countryId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(countryId)) {
      return res.status(400).json({ success: false, message: 'Invalid country id.' });
    }

    const { country } = await getFeeManagerContext(countryId);
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found.' });
    }

    const { currency, amount, exchangeRate, forexFeePercent, totals } = await parseEditablePayload(country, req.body);
    res.json({
      success: true,
      currency,
      amount,
      exchangeRate,
      forexFeePercent,
      finalGovernmentFeeInINR: totals.finalGovernmentFeeInINR,
      serviceFeeBeforeGST: totals.serviceFeeBeforeGST,
      serviceFeeAfterGST: totals.serviceFeeAfterGST,
      totalFeeInINR: totals.totalFeeInINR,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Currency conversion failed. Please try again.',
    });
  }
};

const updateFeeManagerRow = async (req, res) => {
  try {
    const countryId = String(req.params?.countryId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(countryId)) {
      return res.status(400).json({ success: false, message: 'Invalid country id.' });
    }

    const { country, settings } = await getFeeManagerContext(countryId);
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found.' });
    }

    const { currency, amount, exchangeRate, forexFeePercent, totals } = await parseEditablePayload(country, req.body);
    const updatedAt = new Date();

    country.feeManager = {
      currency,
      amount,
      exchangeRate,
      forexFeePercent,
      finalGovernmentFeeInINR: totals.finalGovernmentFeeInINR,
      serviceFeeBeforeGST: totals.serviceFeeBeforeGST,
      serviceFeeAfterGST: totals.serviceFeeAfterGST,
      totalFeeInINR: totals.totalFeeInINR,
      updatedAt,
    };
    country.governmentFee = totals.finalGovernmentFeeInINR;
    country.useGlobalGovernmentFee = false;

    if (req.body.serviceFeeBeforeGST !== undefined) {
      country.basePrice = totals.serviceFeeBeforeGST;
      country.useGlobalBasePrice = false;
    }

    await country.save();

    res.json({
      success: true,
      message: 'Fee updated successfully',
      row: buildFeeManagerRow(country, settings),
    });
  } catch (error) {
    console.error('updateFeeManagerRow error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update fee',
    });
  }
};
const bulkUpdateFeeManagerRows = async (req, res) => {
  try {
    const { selectedCountries = [], bulkValues = {} } = req.body;
    if (!Array.isArray(selectedCountries) || selectedCountries.length === 0) {
      return res.status(400).json({ success: false, message: 'No countries selected.' });
    }

    const validCountries = [];
    for (const id of selectedCountries) {
      if (mongoose.Types.ObjectId.isValid(id)) validCountries.push(id);
    }
    if (validCountries.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid country IDs provided.' });
    }

    const { loadSettingsDocument } = require('../utils/settingsDocument');
    const { buildFeeManagerRow } = require('../services/feeManagerService');
    const settings = await loadSettingsDocument();
    
    // get countries
    const countries = await Country.find({ _id: { $in: validCountries }, isActive: { $ne: false } });

    const updatedRows = [];
    for (const country of countries) {
      const stored = country.feeManager && typeof country.feeManager === 'object' ? country.feeManager : {};
      
      const body = {
        currency: bulkValues.currency !== undefined && bulkValues.currency !== "" ? bulkValues.currency : (stored.currency || 'INR'),
        amount: bulkValues.amount !== undefined && bulkValues.amount !== "" ? bulkValues.amount : (stored.amount !== undefined ? stored.amount : (country.governmentFee || 0)),
        forexFeePercent: bulkValues.forexFeePercent !== undefined && bulkValues.forexFeePercent !== "" ? bulkValues.forexFeePercent : (stored.forexFeePercent || 0),
      };
      
      if (bulkValues.serviceFeeBeforeGST !== undefined && bulkValues.serviceFeeBeforeGST !== "") {
        body.serviceFeeBeforeGST = bulkValues.serviceFeeBeforeGST;
      }

      const { currency, amount, exchangeRate, forexFeePercent, totals } = await parseEditablePayload(country, body);

      country.feeManager = {
        currency,
        amount,
        exchangeRate,
        forexFeePercent,
        finalGovernmentFeeInINR: totals.finalGovernmentFeeInINR,
        serviceFeeBeforeGST: totals.serviceFeeBeforeGST,
        serviceFeeAfterGST: totals.serviceFeeAfterGST,
        totalFeeInINR: totals.totalFeeInINR,
        updatedAt: new Date(),
      };
      country.governmentFee = totals.finalGovernmentFeeInINR;
      country.useGlobalGovernmentFee = false;

      if (bulkValues.serviceFeeBeforeGST !== undefined && bulkValues.serviceFeeBeforeGST !== "") {
        country.basePrice = totals.serviceFeeBeforeGST;
        country.useGlobalBasePrice = false;
      }

      await country.save();
      updatedRows.push(buildFeeManagerRow(country, settings));
    }

    res.json({
      success: true,
      message: 'Fees updated successfully',
      rows: updatedRows,
    });
  } catch (error) {
    console.error('bulkUpdateFeeManagerRows error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Bulk update failed' });
  }
};

module.exports = {
  getFeeManagerRows,
  convertFeeManagerValues,
  updateFeeManagerRow,
  bulkUpdateFeeManagerRows,
};

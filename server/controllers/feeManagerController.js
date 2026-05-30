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
  const exchangeRate = currency === 'INR' ? 1 : await fetchInrExchangeRate(currency);
  const totals = calculateFeeTotals({
    amount,
    exchangeRate,
    forexFeePercent,
    serviceFeeBeforeGST: row.serviceFeeBeforeGST,
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

module.exports = {
  getFeeManagerRows,
  convertFeeManagerValues,
  updateFeeManagerRow,
};

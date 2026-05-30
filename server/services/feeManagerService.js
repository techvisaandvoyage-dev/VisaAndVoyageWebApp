const Country = require('../models/Country');
const { loadSettingsDocument } = require('../utils/settingsDocument');

const SUPPORTED_FEE_MANAGER_CURRENCIES = Object.freeze([
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'AUD', 'JPY', 'CNY',
  'THB', 'MYR', 'NZD', 'CHF', 'ZAR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR',
]);

const normalizeCurrency = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return SUPPORTED_FEE_MANAGER_CURRENCIES.includes(normalized) ? normalized : 'INR';
};

const roundRupee = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
};

const ensureNonNegativeNumber = (value, fallback = 0) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
};

const resolveServiceFeeBeforeGst = (country, settings) => {
  const globalBasePrice = Number(settings?.globalBasePrice);
  const countryBasePrice = Number(country?.basePrice);
  if (country?.useGlobalBasePrice === true && Number.isFinite(globalBasePrice) && globalBasePrice >= 0) {
    return globalBasePrice;
  }
  return Number.isFinite(countryBasePrice) && countryBasePrice >= 0 ? countryBasePrice : 0;
};

const resolveGstConfig = (country, settings) => {
  const useGlobalGst = country?.useGlobalGst !== false;
  const globalGstRate = Number(settings?.gstRate);
  const countryGstRate = Number(country?.gstRate);
  const gstEnabled = useGlobalGst ? settings?.gstEnabled !== false : country?.gstEnabled !== false;
  const gstRate = useGlobalGst
    ? Number.isFinite(globalGstRate) && globalGstRate >= 0
      ? globalGstRate
      : 18
    : Number.isFinite(countryGstRate) && countryGstRate >= 0
      ? countryGstRate
      : Number.isFinite(globalGstRate) && globalGstRate >= 0
        ? globalGstRate
        : 18;

  return { gstEnabled, gstRate };
};

const resolveLiveGovernmentFee = (country, settings) => {
  const globalGovernmentFee = Number(settings?.globalGovernmentFee);
  const countryGovernmentFee = Number(country?.governmentFee);
  if (
    country?.useGlobalGovernmentFee === true &&
    Number.isFinite(globalGovernmentFee) &&
    globalGovernmentFee >= 0
  ) {
    return globalGovernmentFee;
  }
  return Number.isFinite(countryGovernmentFee) && countryGovernmentFee >= 0 ? countryGovernmentFee : 0;
};

const calculateFeeTotals = ({ amount, exchangeRate, forexFeePercent, serviceFeeBeforeGST, gstEnabled, gstRate }) => {
  const safeAmount = ensureNonNegativeNumber(amount, 0);
  const safeExchangeRate = ensureNonNegativeNumber(exchangeRate, 1);
  const safeForexFeePercent = ensureNonNegativeNumber(forexFeePercent, 0);
  const safeServiceFeeBeforeGST = ensureNonNegativeNumber(serviceFeeBeforeGST, 0);

  const convertedINR = safeAmount * safeExchangeRate;
  const forexAmount = convertedINR * (safeForexFeePercent / 100);
  const finalGovernmentFeeInINR = roundRupee(convertedINR + forexAmount);
  const gstAmount = gstEnabled ? roundRupee(safeServiceFeeBeforeGST * (gstRate / 100)) : 0;
  const serviceFeeAfterGST = roundRupee(safeServiceFeeBeforeGST + gstAmount);
  const totalFeeInINR = roundRupee(finalGovernmentFeeInINR + serviceFeeAfterGST);

  return {
    amount: safeAmount,
    exchangeRate: safeExchangeRate,
    forexFeePercent: safeForexFeePercent,
    convertedINR,
    forexAmount,
    finalGovernmentFeeInINR,
    serviceFeeBeforeGST: safeServiceFeeBeforeGST,
    serviceFeeAfterGST,
    totalFeeInINR,
    gstEnabled,
    gstRate,
  };
};

const fetchInrExchangeRate = async (currency) => {
  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === 'INR') return 1;

  const apiKey = String(process.env.EXCHANGE_RATE_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('Currency conversion failed. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/${encodeURIComponent(normalizedCurrency)}`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    const err = new Error('Currency conversion failed. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const rate = Number(data?.conversion_rates?.INR);
  if (!response.ok || !Number.isFinite(rate) || rate <= 0) {
    const err = new Error('Currency conversion failed. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  return rate;
};

const buildFeeManagerRow = (country, settings) => {
  const serviceFeeBeforeGST = resolveServiceFeeBeforeGst(country, settings);
  const { gstEnabled, gstRate } = resolveGstConfig(country, settings);
  const liveGovernmentFee = resolveLiveGovernmentFee(country, settings);
  const stored = country?.feeManager && typeof country.feeManager === 'object' ? country.feeManager : {};
  const usingStoredConfig =
    country?.useGlobalGovernmentFee !== true &&
    String(stored?.currency || '').trim();

  const currency = usingStoredConfig ? normalizeCurrency(stored.currency) : 'INR';
  const amount = usingStoredConfig
    ? ensureNonNegativeNumber(stored.amount, liveGovernmentFee)
    : liveGovernmentFee;
  const exchangeRate = usingStoredConfig
    ? ensureNonNegativeNumber(stored.exchangeRate, currency === 'INR' ? 1 : 0)
    : 1;
  const forexFeePercent = usingStoredConfig ? ensureNonNegativeNumber(stored.forexFeePercent, 0) : 0;
  const totals = calculateFeeTotals({
    amount,
    exchangeRate: currency === 'INR' ? 1 : exchangeRate || 1,
    forexFeePercent,
    serviceFeeBeforeGST,
    gstEnabled,
    gstRate,
  });

  return {
    countryId: String(country?._id || ''),
    countryName: String(country?.name || '').trim(),
    currency,
    amount,
    exchangeRate: totals.exchangeRate,
    forexFeePercent,
    finalGovernmentFeeInINR: liveGovernmentFee,
    serviceFeeBeforeGST: totals.serviceFeeBeforeGST,
    serviceFeeAfterGST: totals.serviceFeeAfterGST,
    totalFeeInINR: roundRupee(liveGovernmentFee + totals.serviceFeeAfterGST),
    updatedAt: stored?.updatedAt || country?.updatedAt || null,
  };
};

const getFeeManagerContext = async (countryId) => {
  const [country, settings] = await Promise.all([
    Country.findOne({ _id: countryId, isActive: { $ne: false } }),
    loadSettingsDocument(),
  ]);
  return { country, settings };
};

module.exports = {
  SUPPORTED_FEE_MANAGER_CURRENCIES,
  normalizeCurrency,
  calculateFeeTotals,
  fetchInrExchangeRate,
  buildFeeManagerRow,
  getFeeManagerContext,
};

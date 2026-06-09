const INDIA_COUNTRY_CODE = Object.freeze({
  name: 'India',
  code: '+91',
  flag: '🇮🇳',
  active: true,
  locked: true,
});

const DEFAULT_COUNTRY_CODE_SETTINGS = Object.freeze({
  defaultCountryCode: '+91',
  defaultCountryName: 'India',
  enabledCountries: [INDIA_COUNTRY_CODE],
});

const normalizeCountryCode = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};

const normalizeCountryCodeSettings = (raw = {}) => {
  const rows = Array.isArray(raw.enabledCountries) ? raw.enabledCountries : [];
  const byCode = new Map();

  rows.forEach((row) => {
    const name = String(row?.name || '').trim();
    const code = normalizeCountryCode(row?.code);
    if (!name || !code) return;
    byCode.set(code, {
      name,
      code,
      flag: String(row?.flag || '').trim(),
      active: row?.active !== false,
      locked: row?.locked === true || code === INDIA_COUNTRY_CODE.code,
    });
  });

  byCode.set(INDIA_COUNTRY_CODE.code, {
    ...INDIA_COUNTRY_CODE,
    ...(byCode.get(INDIA_COUNTRY_CODE.code) || {}),
    name: 'India',
    code: INDIA_COUNTRY_CODE.code,
    active: true,
    locked: true,
  });

  const enabledCountries = Array.from(byCode.values());
  const activeCountries = enabledCountries.filter((row) => row.active !== false);
  const requestedDefault = normalizeCountryCode(raw.defaultCountryCode);
  const defaultRow =
    activeCountries.find((row) => row.code === requestedDefault) ||
    activeCountries.find((row) => row.code === INDIA_COUNTRY_CODE.code) ||
    INDIA_COUNTRY_CODE;

  return {
    defaultCountryCode: defaultRow.code,
    defaultCountryName: defaultRow.name,
    enabledCountries,
  };
};

const publicCountryCodeSettings = (settings) => {
  const normalized = normalizeCountryCodeSettings(settings?.countryCodeSettings);
  const activeCountries = normalized.enabledCountries.filter((row) => row.active !== false);
  return {
    defaultCountryCode: normalized.defaultCountryCode,
    defaultCountryName: normalized.defaultCountryName,
    enabledCountries: activeCountries.length ? activeCountries : [INDIA_COUNTRY_CODE],
  };
};

module.exports = {
  INDIA_COUNTRY_CODE,
  DEFAULT_COUNTRY_CODE_SETTINGS,
  normalizeCountryCode,
  normalizeCountryCodeSettings,
  publicCountryCodeSettings,
};

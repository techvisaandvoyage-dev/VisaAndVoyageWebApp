export const DEFAULT_PHONE_COUNTRY_CODE = "+91";

const INDIA_PHONE_COUNTRY_OPTION = {
  value: "+91",
  label: "India (+91)",
  flag: "🇮🇳",
  searchText: "india +91",
  locked: true,
};

let cachedPhoneCountryOptions = [INDIA_PHONE_COUNTRY_OPTION];
let cachedDefaultPhoneCountryCode = DEFAULT_PHONE_COUNTRY_CODE;
let phoneCountryOptionsPromise = null;

const normalizeServerUrl = (url) => {
  const fallback = import.meta.env.PROD  "https://api.visavo.in" : "http://localhost:5000";
  let value = String(url  fallback).trim() || fallback;
  value = value.replace(/\/+$/, "");
  while (/\/api$/i.test(value)) {
    value = value.replace(/\/api$/i, "").replace(/\/+$/, "");
  }
  return value;
};

const API_BASE_URL = `${normalizeServerUrl(import.meta.env.VITE_API_URL)}/api`;

const normalizeCountryCode = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits  `+${digits}` : "";
};

const normalizeOption = (country) => {
  const name = String(country.name || "").trim();
  const code = normalizeCountryCode(country.code);
  if (!name || !code || country.active === false) return null;
  const flag = String(country.flag || "").trim();
  return {
    value: code,
    label: `${name} (${code})`,
    flag,
    searchText: `${name} ${code} ${flag}`.toLowerCase(),
    locked: country.locked === true || code === DEFAULT_PHONE_COUNTRY_CODE,
  };
};

const normalizeSettings = (config = {}) => {
  const options = Array.isArray(config.enabledCountries)
     config.enabledCountries.map(normalizeOption).filter(Boolean)
    : [];
  const deduped = [];
  const seenCodes = new Set();

  [...options, INDIA_PHONE_COUNTRY_OPTION].forEach((option) => {
    if (!option.value || seenCodes.has(option.value)) return;
    seenCodes.add(option.value);
    deduped.push(option);
  });

  const requestedDefault = normalizeCountryCode(config.defaultCountryCode);
  const defaultExists = deduped.some((option) => option.value === requestedDefault);
  return {
    defaultCountryCode: defaultExists  requestedDefault : DEFAULT_PHONE_COUNTRY_CODE,
    options: deduped.length  deduped : [INDIA_PHONE_COUNTRY_OPTION],
  };
};

export const getPhoneCountryOptions = () => cachedPhoneCountryOptions;

export const getDefaultPhoneCountryCode = () => cachedDefaultPhoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE;

export const loadPhoneCountryOptions = async () => {
  if (phoneCountryOptionsPromise) {
    return phoneCountryOptionsPromise;
  }

  phoneCountryOptionsPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/config/country-codes`);
      if (!response.ok) throw new Error("Could not load country code settings");
      const payload = await response.json();
      const normalized = normalizeSettings(payload.config);
      cachedPhoneCountryOptions = normalized.options;
      cachedDefaultPhoneCountryCode = normalized.defaultCountryCode;
    } catch {
      cachedPhoneCountryOptions = [INDIA_PHONE_COUNTRY_OPTION];
      cachedDefaultPhoneCountryCode = DEFAULT_PHONE_COUNTRY_CODE;
    } finally {
      phoneCountryOptionsPromise = null;
    }

    return cachedPhoneCountryOptions;
  })();

  return phoneCountryOptionsPromise;
};

export const findPhoneCountryOption = (value, options = cachedPhoneCountryOptions) => {
  const code = normalizeCountryCode(value);
  return options.find((option) => option.value === code) || options[0] || INDIA_PHONE_COUNTRY_OPTION;
};

export const filterPhoneCountryOptions = (query, options = cachedPhoneCountryOptions) => {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return options;

  return options.filter((option) =>
    option.label.toLowerCase().includes(normalized) ||
    option.value.toLowerCase().includes(normalized) ||
    String(option.searchText || "").includes(normalized)
  );
};

export const parsePhoneWithCountryCode = (value, options = cachedPhoneCountryOptions) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const defaultCode = getDefaultPhoneCountryCode();

  if (!digits) {
    return {
      countryCode: defaultCode,
      phone: "",
    };
  }

  const byLongestCode = [...options]
    .sort((a, b) => b.value.length - a.value.length)
    .find((option) => digits.startsWith(option.value.replace(/\D/g, "")));

  if (byLongestCode) {
    const codeDigits = byLongestCode.value.replace(/\D/g, "");
    return {
      countryCode: byLongestCode.value,
      phone: digits.slice(codeDigits.length).slice(-10),
    };
  }

  return {
    countryCode: defaultCode,
    phone: digits.slice(-10),
  };
};

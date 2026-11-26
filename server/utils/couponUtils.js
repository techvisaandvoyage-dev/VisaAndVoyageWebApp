const DEFAULT_PAYMENT_SUMMARY_PAGE_CONFIG = {
  couponsEnabled: true,
  couponSectionLabel: 'Have a coupon code?',
  couponPlaceholder: 'Enter coupon code',
  couponApplyButtonText: 'Apply',
  coupons: [],
};

const sanitizeCouponItem = (item = {}, index = 0) => {
  const code = String(item?.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code) return null;
  const discountType = item?.discountType === 'flat' ? 'flat' : 'percentage';
  const rawVal = Number(item?.discountValue);
  const discountValue = Number.isFinite(rawVal) && rawVal > 0
    ? (discountType === 'percentage' ? Math.min(100, rawVal) : rawVal)
    : 0;
  const rawMax = Number(item?.maxDiscount);
  const maxDiscount = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 0;
  const rawMin = Number(item?.minOrderAmount);
  const minOrderAmount = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 0;
  const applyOn = item?.applyOn === 'service_fee' ? 'service_fee' : 'total';
  const id = String(item?.id || `coupon_${Date.now()}_${index}`).trim();

  return {
    id,
    code,
    discountType,
    discountValue,
    maxDiscount,
    minOrderAmount,
    applyOn,
    active: item?.active !== false,
    description: String(item?.description || '').trim(),
  };
};

const sanitizePaymentSummaryPageConfig = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {};
  const rawCoupons = Array.isArray(source.coupons) ? source.coupons : [];
  const seenCodes = new Set();
  const coupons = [];

  rawCoupons.forEach((item, index) => {
    const clean = sanitizeCouponItem(item, index);
    if (clean && !seenCodes.has(clean.code)) {
      seenCodes.add(clean.code);
      coupons.push(clean);
    }
  });

  return {
    couponsEnabled:
      source.couponsEnabled === undefined
        ? DEFAULT_PAYMENT_SUMMARY_PAGE_CONFIG.couponsEnabled
        : Boolean(source.couponsEnabled),
    couponSectionLabel:
      typeof source.couponSectionLabel === 'string' && source.couponSectionLabel.trim()
        ? source.couponSectionLabel.trim()
        : DEFAULT_PAYMENT_SUMMARY_PAGE_CONFIG.couponSectionLabel,
    couponPlaceholder:
      typeof source.couponPlaceholder === 'string' && source.couponPlaceholder.trim()
        ? source.couponPlaceholder.trim()
        : DEFAULT_PAYMENT_SUMMARY_PAGE_CONFIG.couponPlaceholder,
    couponApplyButtonText:
      typeof source.couponApplyButtonText === 'string' && source.couponApplyButtonText.trim()
        ? source.couponApplyButtonText.trim()
        : DEFAULT_PAYMENT_SUMMARY_PAGE_CONFIG.couponApplyButtonText,
    coupons,
  };
};

/**
 * Validate and calculate coupon discount on the server.
 * Ensures payable total never drops below ₹1 (Razorpay minimum).
 */
const calculateCouponDiscount = ({
  config,
  code,
  totalAmount = 0,
  serviceFee = 0,
  taxes = 0,
}) => {
  const normalizedConfig = sanitizePaymentSummaryPageConfig(config);
  if (!normalizedConfig.couponsEnabled) {
    return { valid: false, message: 'Coupons are currently disabled.' };
  }

  const normalizedCode = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!normalizedCode) {
    return { valid: false, message: 'Please enter a coupon code.' };
  }

  const coupon = normalizedConfig.coupons.find((c) => c.code === normalizedCode);
  if (!coupon) {
    return { valid: false, message: 'Invalid coupon code.' };
  }
  if (!coupon.active) {
    return { valid: false, message: 'This coupon code is inactive.' };
  }

  const total = Math.max(0, Math.round(Number(totalAmount) || 0));
  if (total <= 1) {
    return { valid: false, message: 'Order amount is too low for a coupon.' };
  }

  if (coupon.minOrderAmount > 0 && total < coupon.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for this coupon.`,
    };
  }

  const servicePlusTax = Math.max(0, Math.round((Number(serviceFee) || 0) + (Number(taxes) || 0)));
  const eligibleBase = total;

  let rawDiscount = 0;
  if (coupon.discountType === 'percentage') {
    rawDiscount = Math.round((eligibleBase * coupon.discountValue) / 100);
  } else {
    rawDiscount = Math.round(coupon.discountValue);
  }

  // Cap discount so final payable amount is at least ₹1 (100 paise for Razorpay)
  const maxAllowedDiscount = Math.max(0, total - 1);
  const discountAmount = Math.max(0, Math.min(rawDiscount, maxAllowedDiscount));

  if (discountAmount <= 0) {
    return { valid: false, message: 'No discount applicable for this order.' };
  }

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount,
      applyOn: coupon.applyOn,
      description: coupon.description,
    },
    discountAmount,
    finalAmount: total - discountAmount,
  };
};

module.exports = {
  DEFAULT_PAYMENT_SUMMARY_PAGE_CONFIG,
  sanitizePaymentSummaryPageConfig,
  calculateCouponDiscount,
};

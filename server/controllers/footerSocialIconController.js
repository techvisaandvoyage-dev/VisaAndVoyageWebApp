const { FooterSocialIcon, FOOTER_SOCIAL_ICON_TYPES } = require('../models/FooterSocialIcon');

const normalizeType = (value) => String(value ?? '').trim().toLowerCase();
const normalizeEmailUrl = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return /^mailto:/i.test(raw) ? raw : `mailto:${raw}`;
};

const sanitizePayload = (body = {}) => ({
  label: String(body.label ?? '').trim(),
  type: normalizeType(body.type),
  url:
    normalizeType(body.type) === 'email'
      ? normalizeEmailUrl(body.url)
      : String(body.url ?? '').trim(),
  isActive: body.isActive !== false,
  order: Number.isFinite(Number(body.order)) ? Number(body.order) : undefined,
});

const isValidHttpsUrl = (value) => /^https:\/\/.+/i.test(String(value || '').trim());
const isValidMailto = (value) => /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(value || '').trim());
const isValidEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(value || '').trim());
const isValidWaLink = (value) => /^https:\/\/wa\.me\/[0-9]{6,20}(?:\?.*)?$/i.test(String(value || '').trim());

const validateFooterSocialIconPayload = (payload) => {
  if (!payload.label) return 'Icon name is required.';
  if (!payload.type || !FOOTER_SOCIAL_ICON_TYPES.includes(payload.type)) {
    return 'Please choose a valid icon type.';
  }
  if (!payload.url) return 'Icon URL is required.';

  if (payload.type === 'email') {
    if (!isValidMailto(payload.url) && !isValidEmailAddress(payload.url)) {
      return 'Enter a valid email address or mailto: link.';
    }
    return '';
  }

  if (payload.type === 'whatsapp') {
    if (!isValidWaLink(payload.url)) return 'WhatsApp links must use a valid https://wa.me/ link.';
    return '';
  }

  if (!isValidHttpsUrl(payload.url)) {
    return 'Please enter a valid https:// URL.';
  }

  return '';
};

const serializeFooterSocialIcon = (icon) => ({
  _id: String(icon?._id ?? ''),
  label: String(icon?.label ?? '').trim(),
  type: normalizeType(icon?.type),
  url: String(icon?.url ?? '').trim(),
  isActive: icon?.isActive !== false,
  order: Number.isFinite(Number(icon?.order)) ? Number(icon.order) : 0,
  createdAt: icon?.createdAt || null,
  updatedAt: icon?.updatedAt || null,
});

const getNextFooterSocialIconOrder = async () => {
  const latest = await FooterSocialIcon.findOne({}, { order: 1 }).sort({ order: -1, createdAt: -1 }).lean();
  return Number.isFinite(Number(latest?.order)) ? Number(latest.order) + 1 : 0;
};

const getFooterSocialIcons = async (_req, res) => {
  try {
    const icons = await FooterSocialIcon.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    return res.json({
      success: true,
      icons: icons.map(serializeFooterSocialIcon),
    });
  } catch (err) {
    console.error('getFooterSocialIcons error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAdminFooterSocialIcons = async (_req, res) => {
  try {
    const icons = await FooterSocialIcon.find({}).sort({ order: 1, createdAt: 1 }).lean();
    return res.json({
      success: true,
      icons: icons.map(serializeFooterSocialIcon),
    });
  } catch (err) {
    console.error('getAdminFooterSocialIcons error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createFooterSocialIcon = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    const validationError = validateFooterSocialIconPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const icon = await FooterSocialIcon.create({
      ...payload,
      order: payload.order ?? await getNextFooterSocialIconOrder(),
    });

    return res.status(201).json({
      success: true,
      icon: serializeFooterSocialIcon(icon),
      message: `"${payload.label}" added to footer social icons.`,
    });
  } catch (err) {
    console.error('createFooterSocialIcon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFooterSocialIcon = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    const validationError = validateFooterSocialIconPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const update = {
      label: payload.label,
      type: payload.type,
      url: payload.url,
      isActive: payload.isActive,
    };
    if (payload.order !== undefined) update.order = payload.order;

    const icon = await FooterSocialIcon.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!icon) {
      return res.status(404).json({ success: false, message: 'Footer social icon not found.' });
    }

    return res.json({
      success: true,
      icon: serializeFooterSocialIcon(icon),
      message: `"${payload.label}" updated successfully.`,
    });
  } catch (err) {
    console.error('updateFooterSocialIcon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteFooterSocialIcon = async (req, res) => {
  try {
    const icon = await FooterSocialIcon.findByIdAndDelete(req.params.id);
    if (!icon) {
      return res.status(404).json({ success: false, message: 'Footer social icon not found.' });
    }

    return res.json({
      success: true,
      message: `"${icon.label}" deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteFooterSocialIcon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  FOOTER_SOCIAL_ICON_TYPES,
  getFooterSocialIcons,
  getAdminFooterSocialIcons,
  createFooterSocialIcon,
  updateFooterSocialIcon,
  deleteFooterSocialIcon,
};

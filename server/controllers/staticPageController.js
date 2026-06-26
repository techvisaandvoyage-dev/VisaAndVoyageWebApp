const StaticPage = require('../models/StaticPage');
const Settings = require('../models/Settings');
const { normalizeKeywords, slugify, stripUnsafeHtml } = require('../utils/staticPageUtils');

const PAGE_TEMPLATES = new Set(['general', 'blog', 'faq', 'legal', 'visa-info']);
const PAGE_STATUSES = new Set(['draft', 'published']);

const getFooterSectionKeys = async () => {
  try {
    const settings = await Settings.findOne({ singleton: 'global' }).lean();
    if (settings?.footerSections && Array.isArray(settings.footerSections) && settings.footerSections.length) {
      return new Set(settings.footerSections.map((s) => s.key));
    }
  } catch {}
  return new Set();
};

const serializePage = (page) => ({
  _id: page._id,
  title: page.title,
  slug: page.slug,
  summary: page.summary || '',
  content: page.content || '',
  seo: {
    metaTitle: page.seo?.metaTitle || '',
    metaDescription: page.seo?.metaDescription || '',
    keywords: Array.isArray(page.seo?.keywords) ? page.seo.keywords : [],
    canonicalUrl: page.seo?.canonicalUrl || '',
    openGraphImage: page.seo?.openGraphImage || '',
  },
  status: page.status,
  template: page.template || 'general',
  footerSection: page.footerSection || '',
  featuredImage: page.featuredImage || '',
  publishedAt: page.publishedAt || null,
  createdAt: page.createdAt,
  updatedAt: page.updatedAt,
});

const buildPayload = async (body = {}) => {
  const title = String(body.title || '').trim();
  const explicitSlug = String(body.slug || '').trim();
  const slug = slugify(explicitSlug || title);
  const status = PAGE_STATUSES.has(String(body.status || '').trim()) ? String(body.status).trim() : 'draft';
  const template = PAGE_TEMPLATES.has(String(body.template || '').trim())
    ? String(body.template).trim()
    : 'general';
  const validSections = await getFooterSectionKeys();
  const footerSection = validSections.has(String(body.footerSection || '').trim())
    ? String(body.footerSection).trim()
    : '';

  return {
    title,
    slug,
    summary: String(body.summary || '').trim(),
    content: stripUnsafeHtml(body.content),
    status,
    template,
    footerSection,
    featuredImage: String(body.featuredImage || '').trim(),
    seo: {
      metaTitle: String(body.seo?.metaTitle || body.metaTitle || '').trim(),
      metaDescription: String(body.seo?.metaDescription || body.metaDescription || '').trim(),
      keywords: normalizeKeywords(body.seo?.keywords ?? body.keywords),
      canonicalUrl: String(body.seo?.canonicalUrl || body.canonicalUrl || '').trim(),
      openGraphImage: String(body.seo?.openGraphImage || body.openGraphImage || '').trim(),
    },
  };
};

const ensureUniqueSlug = async (slug, excludeId = null) => {
  const base = slugify(slug) || `page-${Date.now()}`;
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await StaticPage.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select('_id');

    if (!existing) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`.slice(0, 140);
  }
};

const validatePayload = (payload) => {
  if (!payload.title) return 'Title is required.';
  if (!payload.slug) return 'Slug is required.';
  if (!payload.content) return 'Content is required.';
  if (payload.seo.metaTitle.length > 160) return 'Meta title must be 160 characters or fewer.';
  if (payload.seo.metaDescription.length > 320) return 'Meta description must be 320 characters or fewer.';
  return null;
};

const getAdminPages = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const template = String(req.query.template || '').trim();
    const footerSection = String(req.query.footerSection || '').trim();

    const query = {};
    if (status && PAGE_STATUSES.has(status)) query.status = status;
    if (template && PAGE_TEMPLATES.has(template)) query.template = template;
    if (footerSection) query.footerSection = footerSection;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      StaticPage.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
      StaticPage.countDocuments(query),
    ]);

    res.json({
      success: true,
      items: items.map(serializePage),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('getAdminPages:', error);
    res.status(500).json({ success: false, message: 'Failed to load static pages.' });
  }
};

const getAdminPageById = async (req, res) => {
  try {
    const page = await StaticPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }
    res.json({ success: true, page: serializePage(page) });
  } catch (error) {
    console.error('getAdminPageById:', error);
    res.status(500).json({ success: false, message: 'Failed to load page.' });
  }
};

const createStaticPage = async (req, res) => {
  try {
    const payload = await buildPayload(req.body);
    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    payload.slug = await ensureUniqueSlug(payload.slug);

    const page = await StaticPage.create(payload);
    res.status(201).json({ success: true, page: serializePage(page) });
  } catch (error) {
    console.error('createStaticPage:', error);
    res.status(500).json({ success: false, message: 'Failed to create page.' });
  }
};

const updateStaticPage = async (req, res) => {
  try {
    const existing = await StaticPage.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }

    const payload = await buildPayload(req.body);
    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    payload.slug = await ensureUniqueSlug(payload.slug, existing._id);
    payload.publishedAt =
      payload.status === 'published'
        ? existing.publishedAt || new Date()
        : null;

    Object.assign(existing, payload);
    await existing.save();

    res.json({ success: true, page: serializePage(existing) });
  } catch (error) {
    console.error('updateStaticPage:', error);
    res.status(500).json({ success: false, message: 'Failed to update page.' });
  }
};

const deleteStaticPage = async (req, res) => {
  try {
    const page = await StaticPage.findByIdAndDelete(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }
    res.json({ success: true, message: 'Page deleted successfully.' });
  } catch (error) {
    console.error('deleteStaticPage:', error);
    res.status(500).json({ success: false, message: 'Failed to delete page.' });
  }
};

const toggleStaticPageStatus = async (req, res) => {
  try {
    const page = await StaticPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }

    page.status = page.status === 'published' ? 'draft' : 'published';
    page.publishedAt = page.status === 'published' ? (page.publishedAt || new Date()) : null;
    await page.save();

    res.json({ success: true, page: serializePage(page) });
  } catch (error) {
    console.error('toggleStaticPageStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update page status.' });
  }
};

const uploadStaticPageImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided.' });
  }

  try {
    const { uploadToFirebase } = require('../utils/uploadOptimizer');
    const path = require('path');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `page-media-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const firebaseUrl = await uploadToFirebase(req.file.buffer, filename, req.file.mimetype);
    res.json({ success: true, url: firebaseUrl });
  } catch (error) {
    console.error('uploadStaticPageImage error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading image to cloud storage' });
  }
};

const getPublicPageBySlug = async (req, res) => {
  try {
    const page = await StaticPage.findOne({
      slug: String(req.params.slug || '').trim().toLowerCase(),
      status: 'published',
    });

    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }

    res.json({ success: true, page: serializePage(page) });
  } catch (error) {
    console.error('getPublicPageBySlug:', error);
    res.status(500).json({ success: false, message: 'Failed to load page.' });
  }
};

const getPublicPages = async (req, res) => {
  try {
    const template = String(req.query.template || '').trim();
    const footerSection = String(req.query.footerSection || '').trim();
    const validSections = await getFooterSectionKeys();
    const query = {
      status: 'published',
      footerSection: { $in: Array.from(validSections) },
    };
    if (template && PAGE_TEMPLATES.has(template)) query.template = template;
    if (footerSection && validSections.has(footerSection)) query.footerSection = footerSection;

    const pages = await StaticPage.find(query).sort({ footerSection: 1, publishedAt: -1, updatedAt: -1 }).limit(100);
    res.json({ success: true, items: pages.map(serializePage) });
  } catch (error) {
    console.error('getPublicPages:', error);
    res.status(500).json({ success: false, message: 'Failed to load pages.' });
  }
};

module.exports = {
  createStaticPage,
  deleteStaticPage,
  getAdminPageById,
  getAdminPages,
  getPublicPageBySlug,
  getPublicPages,
  toggleStaticPageStatus,
  updateStaticPage,
  uploadStaticPageImage,
};

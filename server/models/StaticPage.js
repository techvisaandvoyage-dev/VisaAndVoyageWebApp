const mongoose = require('mongoose');

const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, trim: true, default: '' },
    metaDescription: { type: String, trim: true, default: '' },
    keywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true, default: '' },
    openGraphImage: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const staticPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 140 },
    summary: { type: String, trim: true, default: '', maxlength: 220 },
    content: { type: String, default: '' },
    seo: { type: seoSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    template: {
      type: String,
      enum: ['general', 'blog', 'faq', 'legal', 'visa-info'],
      default: 'general',
      index: true,
    },
    footerSection: {
      type: String,
      default: 'company',
      index: true,
    },
    featuredImage: { type: String, trim: true, default: '' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

staticPageSchema.index({ title: 'text', slug: 'text', content: 'text' });

module.exports = mongoose.model('StaticPage', staticPageSchema);

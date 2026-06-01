const mongoose = require('mongoose');

const FOOTER_SOCIAL_ICON_TYPES = [
  'instagram',
  'facebook',
  'twitter',
  'youtube',
  'linkedin',
  'whatsapp',
  'telegram',
  'email',
  'website',
  'custom',
];

const footerSocialIconSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: FOOTER_SOCIAL_ICON_TYPES,
    },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

footerSocialIconSchema.index({ order: 1, createdAt: 1 });

module.exports = {
  FooterSocialIcon: mongoose.model('FooterSocialIcon', footerSocialIconSchema),
  FOOTER_SOCIAL_ICON_TYPES,
};

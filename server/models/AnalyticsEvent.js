const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    page: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '', // The destination country selected
    },
    visaType: {
      type: String,
      default: '', // The visa type selected
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    applicationId: {
      type: String,
      default: '',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({ visitorId: 1, timestamp: -1 });
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);

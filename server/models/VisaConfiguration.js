const mongoose = require('mongoose');

const visaConfigurationSchema = new mongoose.Schema({
  countryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Country',
    default: null
  },
  sourceType: { 
    type: String, 
    enum: ['DEFAULT', 'OVERRIDE'], 
    required: true 
  },
  visaType: { type: String, trim: true, default: '' },
  processingDays: { type: String, trim: true, default: '' },
  validity: { type: String, trim: true, default: '' },
  lengthOfStay: { type: String, trim: true, default: '' },
  entryType: { type: String, trim: true, default: '' },
  requirements: { type: [String], default: [] },
  requiredDocuments: { type: [String], default: [] }, // maps to requiredDocuments / optionalDocuments depending on usage, but let's stick to architecture
  optionalDocuments: { type: [String], default: [] }, // adding this based on frontend needs
  customVisaTypes: { type: [mongoose.Schema.Types.Mixed], default: [] },
  price: { type: Number, default: null },
  useGlobalVisaType: { type: Boolean, default: true },
  useGlobalProcessingDays: { type: Boolean, default: true },
  useGlobalValidity: { type: Boolean, default: true },
  useGlobalLengthOfStay: { type: Boolean, default: true },
  useGlobalEntryType: { type: Boolean, default: true },
  useGlobalRequiredDocuments: { type: Boolean, default: true },
  useGlobalOptionalDocuments: { type: Boolean, default: true },
  useGlobalCustomVisaTypes: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure we can quickly find overrides per country, and easily find the global DEFAULT
visaConfigurationSchema.index({ countryId: 1, sourceType: 1 });

module.exports = mongoose.model('VisaConfiguration', visaConfigurationSchema);

const mongoose = require('mongoose');
const { travelerSnapshotSchemaDefinition } = require('../utils/travelerProfile');

const uploadedDocumentDetailSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const uploadedDocumentHistoryItemSchema = new mongoose.Schema(
  {
    docType: { type: String, default: '' },
    url: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, default: '' },
    userRole: { type: String, default: '' },
    action: { type: String, default: '' },
  },
  { _id: false }
);

const driveLinkHistoryItemSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
    modifiedBy: { type: String, default: '' },
    userRole: { type: String, default: '' },
    action: { type: String, default: '' },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  passportNo: { type: String, required: true },
  nationality: { type: String, required: true },
  dob: { type: Date, required: true },
  travelDate: { type: Date, required: true },
  returnDate: { type: Date },
  
  countryId: { type: String, required: true },
  countryName: { type: String, required: true },
  flagEmoji: { type: String, required: true },
  visaType: { type: String, required: true },
  fee: { type: Number, required: true },
  processingDays: { type: Number },
  applicationId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    trim: true,
  },
  transactionId: { type: String },
  paymentMethod: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending_payment', 'completed', 'cancelled', 'failed'],
    default: 'completed'
  },
  requiredDocuments: [{ type: String }],
  
  status: {
    type: String,
    enum: ['pending', 'review', 'approved', 'rejected'],
    default: 'pending'
  },
  
  documents: [{
    type: String // paths to the files in /uploads/documents
  }],

  travellerDocuments: [
    {
      travelerNo: { type: Number, required: true },
      travelerName: { type: String, default: "" },
      gdriveLink: { type: String, default: "" },
      gdriveLinkHistory: { type: [driveLinkHistoryItemSchema], default: [] },
      /** Optional second folder (e.g. extra reference materials); not used for required-doc completion. */
      gdriveFurtherInfoLink: { type: String, default: "" },
      documents: { type: Map, of: String, default: {} },
      documentDetails: { type: Map, of: uploadedDocumentDetailSchema, default: {} },
      documentHistory: { type: [uploadedDocumentHistoryItemSchema], default: [] },
      otherDocuments: [{ type: String }],
      uploadedAt: { type: Date, default: Date.now },
    },
  ],

  travelerNames: [{ type: String, default: "" }],

  travelerSelections: [
    {
      travelerNo: { type: Number, required: true },
      travelerProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TravelerProfile',
        default: null,
      },
      travelerSnapshot: {
        type: new mongoose.Schema(travelerSnapshotSchemaDefinition, { _id: false }),
        default: null,
      },
    },
  ],

  /** Headcount from checkout (service fee multiplier) */
  travellerCount: { type: Number, default: 1 },

  /** True when user paid from country page but still must fill passport / uploads */
  detailsPending: { type: Boolean, default: false },
  
  gdriveLink: { type: String, default: "" },
  gdriveLinkHistory: { type: [driveLinkHistoryItemSchema], default: [] },
  /** Legacy single-traveler optional second Drive link (mirrors travellerDocuments[].gdriveFurtherInfoLink). */
  gdriveFurtherInfoLink: { type: String, default: "" },

  visaFilePath: { type: String, default: "" },
  visaFileName: { type: String, default: "" },
  visaFileUploadedAt: { type: Date, default: null },

  /** Internal / system messages (e.g. checkout draft). */
  notes: { type: String },
  /** Free-text message from the applicant (special requests, extra context). */
  applicantNotes: { type: String, default: '', maxlength: 8000 },
  
  /** Admin remark/note specifically for google sheets sync or manual review */
  adminRemark: { type: String, default: '' },
  
  /** New fields for CRM */
  interviewDate: { type: Date },
  assignedAgent: { type: String, default: '' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', ''], default: '' },
  hotel: { type: String, default: '' },
  insurance: { type: String, default: '' },
  
  /** Fields for approval/rejection */
  approvedDate: { type: Date },
  approvedBy: { type: String },
  rejectReason: { type: String, default: '' },
  
  /** Timeline for the user dashboard */
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    status: { type: String },
    action: { type: String },
    adminName: { type: String },
    remark: { type: String }
  }],
  
  /** Internal Audit Log */
  auditLog: [{
    timestamp: { type: Date, default: Date.now },
    action: { type: String },
    adminName: { type: String },
    previousStatus: { type: String },
    newStatus: { type: String },
    source: { type: String },
    remark: { type: String },
    fieldName: { type: String },
    previousValue: { type: String },
    newValue: { type: String }
  }],
}, {
  timestamps: true
});

// Helper function to safely trigger Google Sheet updates
const triggerSheetSync = async (doc, options = {}) => {
  try {
    // If this update came from the Google Sheet itself, do not re-sync
    if (options && options.source === 'GOOGLE_SHEET') {
      return;
    }
    
    // Require here to prevent circular dependencies
    const googleSheetsService = require('../services/googleSheetsService');
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    if (spreadsheetId) {
      // Async update without blocking
      (async () => {
        try {
          if (!doc.populated('user')) {
            await doc.populate('user');
          }
          await googleSheetsService.upsertRow(doc, spreadsheetId);
        } catch (err) {
          console.error(`[Google Sheets] Async update failed for ${doc.applicationId}:`, err);
        }
      })();
    }
  } catch (err) {
    console.error(`[Google Sheets] Failed to trigger sync for ${doc.applicationId}:`, err);
  }
};

// Post-save hook (triggers on new doc creation and doc.save())
applicationSchema.post('save', function (doc, next) {
  next(); // Don't block the response
  triggerSheetSync(doc, this.$__saveOptions);
});

// Post-findOneAndUpdate hook
applicationSchema.post('findOneAndUpdate', async function (doc, next) {
  if (!doc) return next();
  next(); // Don't block the response
  
  try {
    // getOptions() gives us the options passed to findOneAndUpdate
    triggerSheetSync(doc, this.getOptions());
  } catch (err) {
    console.error('Error in findOneAndUpdate hook:', err);
  }
});

module.exports = mongoose.model('Application', applicationSchema);

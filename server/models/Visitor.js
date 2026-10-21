const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstVisitAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    sessionCount: {
      type: Number,
      default: 1,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    device: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' }, // Selected destination country
    currentPage: { type: String, default: '/' },
    draftTravelDate: { type: Date, default: null },
    draftReturnDate: { type: Date, default: null },
    draftTravellerCount: { type: Number, default: null },
    draftNameEntered: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'Active',
        'Registered',
        'Application Started',
        'Payment Pending',
        'Document Pending',
        'Submitted',
        'Under Review',
        'Approved',
        'Rejected',
        'Abandoned',
      ],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
visitorSchema.index({ lastActiveAt: -1 });
visitorSchema.index({ status: 1 });
visitorSchema.index({ createdAt: -1 });

// Helper function to safely trigger Google Sheet updates for Visitors
const triggerVisitorSheetSync = async (doc, options = {}) => {
  try {
    if (options && options.source === 'GOOGLE_SHEET') return;
    const googleSheetsService = require('../services/googleSheetsService');
    const spreadsheetId = process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o';
    
    if (spreadsheetId) {
      (async () => {
        try {
          if (doc.userId && !doc.populated('userId')) {
            await doc.populate('userId');
          }
          
          let application = null;
          let transaction = null;
          
          if (doc.userId) {
            const Application = require('./Application');
            // Try to find the most recent application for this user
            application = await Application.findOne({ user: doc.userId._id || doc.userId }).sort({ createdAt: -1 });
            if (application) {
              const Transaction = require('./Transaction');
              transaction = await Transaction.findOne({ application: application._id }).sort({ createdAt: -1 });
            }
          }

          const data = {
            visitor: doc,
            application: application,
            transaction: transaction,
            user: doc.userId
          };

          await googleSheetsService.upsertRow(data, spreadsheetId);
        } catch (err) {
          console.error(`[Google Sheets] Async update failed for Visitor ${doc.visitorId}:`, err);
        }
      })();
    }
  } catch (err) {
    console.error(`[Google Sheets] Failed to trigger sync for Visitor ${doc.visitorId}:`, err);
  }
};



module.exports = mongoose.model('Visitor', visitorSchema);

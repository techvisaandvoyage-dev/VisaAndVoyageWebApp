const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Visitor = require('./models/Visitor');
const Application = require('./models/Application');
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const googleSheetsService = require('./services/googleSheetsService');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o';

async function runSync() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Initialize sheet (clears and sets headers)
    await googleSheetsService.initializeSheet(SPREADSHEET_ID);
    console.log('Sheet initialized and cleared.');

    // 2. Fetch all applications and visitors
    const applications = await Application.find().populate('user').lean();
    const visitors = await Visitor.find().populate('userId').lean();
    const transactions = await Transaction.find().lean();

    const dataToSync = [];
    
    // Map applications first
    for (const app of applications) {
      // Find matching visitor
      let visitor = visitors.find(v => v.userId && v.userId._id.toString() === app.user._id.toString());
      if (!visitor) {
        visitor = {}; // fallback if no visitor tracked
      }
      
      const transaction = transactions.find(t => t.application.toString() === app._id.toString()) || {};
      
      dataToSync.push({
        visitor: visitor,
        application: app,
        user: app.user,
        transaction: transaction
      });
    }

    // Map visitors who don't have an application yet
    const appVisitorUserIds = new Set(applications.map(a => a.user?._id?.toString()).filter(Boolean));
    for (const v of visitors) {
      if (!v.userId || !appVisitorUserIds.has(v.userId._id.toString())) {
        dataToSync.push({
          visitor: v,
          application: {},
          user: v.userId || {},
          transaction: {}
        });
      }
    }

    // Since upsertRow works one-by-one and we want to batch, we need a batch function
    // For historical sync, it's safer to just iterate and upsert, or we can use the existing `writeDataToSheet` but we deleted it!
    // Ah, I deleted `writeDataToSheet` in my rewrite. Let's just loop over them and upsertRow. 
    // Wait, upsertRow reads the sheet every time. For large data, it might hit rate limits.
    // Let me add a `batchUpsert` or simply do it slowly.
    console.log(`Syncing ${dataToSync.length} rows...`);
    for (let i = 0; i < dataToSync.length; i++) {
      await googleSheetsService.upsertRow(dataToSync[i], SPREADSHEET_ID);
      process.stdout.write(`\rSynced ${i+1}/${dataToSync.length}`);
      // Sleep for 2000ms to avoid Google API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\nSync complete!');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

runSync();

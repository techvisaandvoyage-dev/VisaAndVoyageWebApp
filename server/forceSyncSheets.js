const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const Application = require('./models/Application');
const Visitor = require('./models/Visitor');
const { initializeSheet, upsertRow } = require('./services/googleSheetsService');

async function sync() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');
    
    console.log('Fetching applications...');
    const applications = await Application.find({}).populate('user').lean();
    
    console.log(`Found ${applications.length} applications. Syncing to Google Sheets...`);
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    await initializeSheet(spreadsheetId);
    
    for (const app of applications) {
      const Transaction = require('./models/Transaction');
      // Find the most recent visitor session tied to this user to avoid grabbing an old/inactive device's Visitor ID
      const visitor = await Visitor.findOne({ userId: app.user._id }).sort({ lastActiveAt: -1 }).lean() || {};
      const transaction = await Transaction.findOne({ application: app._id }).sort({ createdAt: -1 }).lean() || {};
      await upsertRow({ application: app, visitor: visitor, transaction: transaction, user: app.user }, spreadsheetId);
    }
    
    console.log('Fetching standalone visitors...');
    const allAppUserIds = applications.map(a => a.user._id.toString());
    const standaloneVisitors = await Visitor.find({ userId: { $nin: allAppUserIds } }).lean();
    console.log(`Found ${standaloneVisitors.length} standalone visitors. Syncing...`);
    
    for (const visitor of standaloneVisitors) {
      let userObj = {};
      if (visitor.userId) {
        userObj = await User.findById(visitor.userId).lean() || {};
      }
      await upsertRow({ visitor, user: userObj, application: {}, transaction: {} }, spreadsheetId);
    }
    
    console.log('Sync complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

sync();

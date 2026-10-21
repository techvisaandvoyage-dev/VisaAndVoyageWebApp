const mongoose = require('mongoose');
require('dotenv').config();
const { upsertRow } = require('./services/googleSheetsService');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Visitor = require('./models/Visitor');
  const User = require('./models/User');
  const Application = require('./models/Application');
  
  // Find a visitor with a userId
  const v = await Visitor.findOne({ userId: { $ne: null } }).sort({ lastActiveAt: -1 }).lean();
  console.log('Testing with Visitor:', v.visitorId);
  
  const u = await User.findById(v.userId).lean();
  console.log('User ID present:', !!u._id);
  
  // Run upsertRow manually to see what it generates
  const spreadsheetId = process.env.SPREADSHEET_ID;
  await upsertRow({ visitor: v, user: u, application: {}, transaction: {} }, spreadsheetId);
  console.log('upsertRow finished. Check the sheet or any errors.');
  
  process.exit(0);
});

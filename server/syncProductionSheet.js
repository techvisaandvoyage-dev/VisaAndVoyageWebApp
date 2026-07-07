require('dotenv').config();
const mongoose = require('mongoose');
const Application = require('./models/Application');
require('./models/User'); 
const { initializeSheet, writeDataToSheet } = require('./services/googleSheetsService');

async function syncProduction() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Initializing Google Sheet Headers & Dropdowns...');
    await initializeSheet(process.env.SPREADSHEET_ID);
    
    console.log('Fetching all applications from the database...');
    const apps = await Application.find().populate('user');
    
    console.log(`Found ${apps.length} applications. Syncing to Google Sheets...`);
    await writeDataToSheet(process.env.SPREADSHEET_ID, apps);
    
    console.log('✅ Successfully synced all data to your Google Sheet!');
  } catch (err) {
    console.error('❌ Error during sync:', err);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

syncProduction();

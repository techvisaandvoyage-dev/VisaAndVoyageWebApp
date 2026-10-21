const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const { initializeSheet } = require('./services/googleSheetsService');

async function sync() {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    
    // WARNING: initializeSheet CLEARS the sheet and writes headers!
    await initializeSheet(spreadsheetId);
    
    console.log('Headers Re-Initialized successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

sync();

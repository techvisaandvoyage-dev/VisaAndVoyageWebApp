const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

const fs = require('fs');
const getAuthClient = () => {
  let saJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
  if (!saJsonStr && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    saJsonStr = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
  }
  const credentials = JSON.parse(saJsonStr);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
};

const getSheetsClient = async () => {
  const auth = getAuthClient();
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
};

async function clearSheet() {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o';
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitle = spreadsheet.data.sheets[0].properties.title;
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetTitle}'!A2:AD`,
    });
    
    console.log("Google Sheet cleared successfully (excluding headers)!");
  } catch (error) {
    console.error("Error clearing sheet:", error);
  }
}

clearSheet().then(() => process.exit(0));

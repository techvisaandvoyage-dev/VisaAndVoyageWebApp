const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

const getAuthClient = () => {
  let saJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
  
  if (!saJsonStr && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      saJsonStr = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read service account from PATH: ${err.message}`);
    }
  }

  if (!saJsonStr) {
    throw new Error('Missing service account JSON or PATH in environment variables.');
  }

  let credentials;
  try {
    credentials = JSON.parse(saJsonStr);
  } catch (error) {
    throw new Error('Invalid JSON format in service account credentials.');
  }

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

const getDriveClient = async () => {
  const auth = getAuthClient();
  const authClient = await auth.getClient();
  return google.drive({ version: 'v3', auth: authClient });
};

/**
 * Ensures a spreadsheet exists. Creates one if SPREADSHEET_ID is not in .env.
 */
const getOrCreateSpreadsheet = async () => {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (spreadsheetId) {
    return spreadsheetId;
  }

  // Create a new spreadsheet
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.create({
    resource: {
      properties: {
        title: `Visa Applications Export - ${new Date().toISOString().split('T')[0]}`,
      },
    },
  });

  const newSpreadsheetId = response.data.spreadsheetId;
  
  // Append to .env file
  const envPath = path.join(__dirname, '..', '.env');
  try {
    fs.appendFileSync(envPath, `\nSPREADSHEET_ID=${newSpreadsheetId}\n`);
    console.log(`Created new Google Sheet and added SPREADSHEET_ID to .env: ${newSpreadsheetId}`);
  } catch (err) {
    console.error('Failed to write SPREADSHEET_ID to .env file', err);
  }
  
  // Try to share it if possible (requires drive API)
  try {
    const drive = await getDriveClient();
    await drive.permissions.create({
      fileId: newSpreadsheetId,
      resource: {
        type: 'anyone',
        role: 'writer',
      },
    });
  } catch (err) {
    console.warn('Could not share the spreadsheet. You might need to open it with the service account or manually share it.');
  }

  return newSpreadsheetId;
};

const COLUMNS = [
  'Application ID',
  'Applicant Name',
  'Email',
  'Phone',
  'Country',
  'Visa Type',
  'Fee',
  'Passport Number',
  'Travel Date',
  'Payment Status',
  'Current Status',
  'Action'
];

/**
 * Initializes the sheet: clears data, sets headers, adds data validation for 'Action'.
 */
const initializeSheet = async (spreadsheetId) => {
  const sheets = await getSheetsClient();
  
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets[0];
  const sheetTitle = sheet.properties.title;
  const sheetId = sheet.properties.sheetId;

  // 1. Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'`,
  });

  // 2. Set headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A1:L1`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [COLUMNS],
    },
  });

  // 3. Set Data Validation (Dropdown) for the Action column (Column K, index 10)
  const requests = [
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1, // Skip header
          startColumnIndex: 0, 
          endColumnIndex: 11,
        },
        rule: null
      }
    },
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1, // Skip header
          startColumnIndex: 11, // Column L (Action)
          endColumnIndex: 12,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'APPROVE' },
              { userEnteredValue: 'REJECT' },
              { userEnteredValue: 'SUBMITTED' },
            ],
          },
          showCustomUi: true,
          strict: true,
        },
      },
    },
    // Format headers to be bold
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
          }
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)'
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests },
  });
};

const mapAppToRow = (app) => {
  return [
    app.applicationId || '',
    `${app.firstName || ''} ${app.lastName || ''}`.trim(),
    app.email || '',
    (app.user && app.user.phone) ? app.user.phone : (app.phone || ''),
    app.countryName || app.countryId || '',
    app.visaType || '',
    app.fee || 0,
    app.passportNo || '',
    app.travelDate ? new Date(app.travelDate).toISOString().split('T')[0] : '',
    app.paymentStatus || '',
    app.status || '',
    '' // Action starts empty
  ];
};

/**
 * Writes data rows to the sheet.
 */
const writeDataToSheet = async (spreadsheetId, data) => {
  const sheets = await getSheetsClient();
  
  if (!data || data.length === 0) return;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitle = spreadsheet.data.sheets[0].properties.title;

  const rows = data.map(mapAppToRow);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A2:L${rows.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: rows,
    },
  });
};

/**
 * Upserts a single application row in the Google Sheet.
 * Real-Time sync.
 */
const upsertRow = async (application, spreadsheetId) => {
  const sheets = await getSheetsClient();
  
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitle = spreadsheet.data.sheets[0].properties.title;

  // 1. Fetch Column A to find the row index
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A:A`,
  });

  const columnA = response.data.values || [];
  let rowIndex = -1;
  
  // Find the row with matching Application ID
  for (let i = 0; i < columnA.length; i++) {
    if (columnA[i][0] === application.applicationId) {
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }

  const newRow = mapAppToRow(application);

  if (rowIndex !== -1) {
    // 2a. Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A${rowIndex}:V${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });
  } else {
    // 2b. Append new row at the exact next empty row
    const appendRowIndex = columnA.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A${appendRowIndex}:V${appendRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });
  }
};


/**
 * Reads all data from the sheet.
 */
const readDataFromSheet = async (spreadsheetId) => {
  const sheets = await getSheetsClient();
  
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitle = spreadsheet.data.sheets[0].properties.title;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A2:K`, // Skip headers
  });

  const rows = response.data.values || [];
  
  return rows.map((row, index) => ({
    rowIndex: index + 2, // 1-indexed, +1 for header
    applicationId: row[0] || '',
    applicantName: row[1] || '',
    email: row[2] || '',
    phone: row[3] || '',
    country: row[4] || '',
    visaType: row[5] || '',
    passportNo: row[6] || '',
    travelDate: row[7] || '',
    paymentStatus: row[8] || '',
    currentStatus: row[9] || '',
    action: row[10] || ''
  }));
};

/**
 * Clears the Action cell (Column L) for a specific row.
 */
const clearActionCell = async (spreadsheetId, rowIndex) => {
  const sheets = await getSheetsClient();
  
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitle = spreadsheet.data.sheets[0].properties.title;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'!L${rowIndex}`,
  });
};

module.exports = {
  getOrCreateSpreadsheet,
  initializeSheet,
  writeDataToSheet,
  readDataFromSheet,
  clearActionCell,
  upsertRow,
};

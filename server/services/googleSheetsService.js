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

const COLUMNS = [
  'Visitor ID',         // A
  'Visit Date',         // B
  'Last Active',        // C
  'Selected Country',   // D
  'Start Application',  // E
  'Travel Start Date',  // F
  'Travel End Date',    // G
  'Travelers',          // H
  'Document Upload',    // I
  'Registration',       // J
  'Current Page',       // K
  'A/c ID',             // L
  'Application ID',     // M
  'Phone No.',          // N
  'Email',              // O
  'Name',               // P
  'Fee',                // Q
  'Payment Date',       // R
  'Transaction',        // S
  'Payment Status',     // T
  'Traveler 1',         // U
  'Traveler 2',         // V
  'Traveler 3',         // W
  'Traveler 4',         // X
  'Traveler 5',         // Y
  'Traveler 6',         // Z
  'Traveler 7',         // AA
  'Traveler 8',         // AB
  'Traveler 9',         // AC
  'Traveler 10',        // AD
];

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
    range: `'${sheetTitle}'!A1:AD1`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [COLUMNS],
    },
  });

  // 3. Format headers to be bold
  const requests = [
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: false }
          }
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)'
      }
    },
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
    },
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          startColumnIndex: 10, // K
          endColumnIndex: 12,
        }
      }
    },
    {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          startColumnIndex: 20, // U
          endColumnIndex: 30, // AD
        }
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests },
  });
};

const mapDataToRow = (data) => {
  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `'${dd}-${mm}-${yyyy}`;
  };

  const v = data.visitor || {};
  const a = data.application || {};
  const u = data.user || a.user || {};
  const t = data.transaction || {};

  const nameEntered = [a.firstName, a.lastName].filter(Boolean).join(" ");
  
  let docUploadStatus = "❌";
  if (a.gdriveLink || (a.documents && a.documents.length > 0)) {
    docUploadStatus = "✅";
  }

  const registrationStatus = u._id ? "✅" : "❌";
  
  const paymentDate = t.createdAt || (a.paymentStatus === 'completed' && a.updatedAt) ? formatDateDDMMYYYY(t.createdAt || a.updatedAt) : "";
  const transactionId = t.razorpayPaymentId || a.transactionId || "";

  const rawStatus = a.status || v.status || "Active";
  const applicationStarted = a.createdAt || (v.status && !['Active', 'Registered', 'Abandoned'].includes(v.status)) || v.draftTravelDate;
  let displayStatus = rawStatus;
  
  if (rawStatus === 'review') displayStatus = 'Under Review';
  else if (rawStatus === 'submitted') displayStatus = 'Submitted';
  else if (rawStatus === 'approved') displayStatus = 'Approved';
  else if (rawStatus === 'rejected') displayStatus = 'Rejected';
  else if (rawStatus === 'cancelled') displayStatus = 'Cancelled';
  else if (['pending', 'pending_payment', 'doc_pending', 'drive_link_pending'].includes(rawStatus)) {
    displayStatus = 'Pending';
  }

  const row = [
    v.visitorId || "",                                   // A: Visitor ID
    formatDateDDMMYYYY(v.firstVisitAt),                  // B: Visit Date
    formatDateDDMMYYYY(v.lastActiveAt),                  // C: Last Active
    a.countryName || v.country || "",                    // D: Selected Country
    formatDateDDMMYYYY(applicationStarted ? (a.createdAt || v.updatedAt || v.lastActiveAt) : ""), // E: Start Application
    formatDateDDMMYYYY(a.travelDate || v.draftTravelDate), // F: Travel Start Date
    formatDateDDMMYYYY(a.returnDate || v.draftReturnDate), // G: Travel End Date
    a.travellerCount ? `'${a.travellerCount}` : (v.draftTravellerCount ? `'${v.draftTravellerCount}` : ""), // H: Travelers
    docUploadStatus,                                     // I: Document Upload
    registrationStatus,                                  // J: Registration
    v.currentPage || "/",                                // K: Current Page
    u.accountId ? `'${u.accountId}` : "",                // L: A/c ID
    a.applicationId || "",                               // M: Application ID
    u.phone || a.phone || "",                            // N: Phone No.
    a.email || u.email || "",                            // O: Email
    u.name || nameEntered || "",                         // P: Name
    t.amount || a.fee || "",                             // Q: Fee
    paymentDate,                                         // R: Payment Date
    transactionId,                                       // S: Transaction
    a.paymentStatus || t.status || "",                   // T: Payment Status
  ];

  const travelers = Array.isArray(a.travellerDocuments) ? a.travellerDocuments : (Array.isArray(a.travelers) ? a.travelers : []);
  const numTravelers = Math.max(1, parseInt(a.travellerCount) || travelers.length);
  
  for (let i = 0; i < 10; i++) {
    const travelerNo = i + 1;
    if (i < numTravelers) {
      const traveler = travelers.find(tr => Number(tr.travelerNo) === travelerNo) || travelers[i] || {};
      let tStatus = traveler.status ? String(traveler.status).toLowerCase().replace(' ', '_') : rawStatus;
      
      let displayTStatus = "Pending";
      if (tStatus === 'review' || tStatus === 'under_review') displayTStatus = 'Under Review';
      else if (tStatus === 'submitted') displayTStatus = 'Submitted';
      else if (tStatus === 'approved') displayTStatus = 'Approved';
      else if (tStatus === 'rejected') displayTStatus = 'Rejected';
      
      row.push(displayTStatus);
    } else {
      row.push("");
    }
  }

  return row;
};

/**
 * Upserts a single unified row in the Google Sheet.
 * Real-Time sync. Performs null-protection for existing data.
 */
// Mutex to prevent race conditions during rapid tracking events
let upsertQueue = Promise.resolve();

const upsertRow = async (data, spreadsheetId) => {
  return new Promise((resolve, reject) => {
    upsertQueue = upsertQueue.then(async () => {
      try {
        const sheets = await getSheetsClient();
        if (!spreadsheetId) {
          throw new Error('Spreadsheet ID is required.');
        }
      
        console.log(`[GoogleSheets Sync] upsertRow called. Application: ${data.application?.applicationId}, Visitor: ${data.visitor?.visitorId}, User: ${data.user?._id}`);
        
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetTitle = spreadsheet.data.sheets[0].properties.title;

  const Settings = require('../models/Settings');
  const settings = await Settings.findOne({}) || {};
  const fileUploadEnabled = settings.enableFileUpload !== false;

  const a = data.application || {};
  const t = data.transaction || {};

  const normalizedPaymentStatus = String(a.paymentStatus || t.status || "").trim().toLowerCase();
  const isPaymentCompleted = a.isPaid === true || ["paid", "completed", "success", "captured"].includes(normalizedPaymentStatus);

  if (isPaymentCompleted && a.status !== 'approved' && a.status !== 'rejected' && a.status !== 'cancelled') {
    const requiredDocs = Array.isArray(a.requiredDocuments) && a.requiredDocuments.length
      ? a.requiredDocuments
      : ['passport'];
    const normalized = requiredDocs.map((key) => String(key || "").trim()).filter(Boolean);
    const unique = Array.from(new Set(normalized));
    const optionalKeys = fileUploadEnabled === false
      ? []
      : unique.filter((key) => key !== "passport");
    
    const requiredKeys = ["passport", ...optionalKeys];

    const travellers = Array.isArray(a.travellerDocuments) ? a.travellerDocuments : [];
    const travellerCount = Math.max(1, a.travellerCount || 1);
    let allUploaded = true;
    for (let tNo = 1; tNo <= travellerCount; tNo += 1) {
      const tr = travellers.find((entry) => Number(entry?.travelerNo) === tNo);
      if (!tr) {
        allUploaded = false;
        break;
      }
      const docs = tr.documents || {};
      for (const key of requiredKeys) {
        const val = typeof docs.get === 'function' ? docs.get(key) : docs[key];
        if (!val || typeof val !== 'string' || !val.trim()) {
          allUploaded = false;
          break;
        }
      }
      if (!allUploaded) break;
    }
    
    if (allUploaded) {
      data.application = { ...data.application, status: 'review' };
    }
  }

  // Fetch all existing data to find matches and do null-protection
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A:AD`,
  });

  const allRows = response.data.values || [];
  let rowIndex = -1;
  let existingRow = [];
  
  const vId = data.visitor?.visitorId;
  const appId = data.application?.applicationId;

  // Match by Application ID first (Col N - index 13), then Visitor ID (Col A - index 0)
  // Search backwards to prioritize the most recent row (in case of duplicate merged visitor IDs)
  for (let i = allRows.length - 1; i >= 1; i--) {
    const row = allRows[i];
    if (appId && row[12] === appId) {
      rowIndex = i + 1; // 1-indexed for Sheets
      existingRow = row;
      break;
    }
    
    if (vId && row[0] === vId) {
      if (appId) {
        if (!row[12] && rowIndex === -1) {
          rowIndex = i + 1;
          existingRow = row;
        }
      } else {
        if (rowIndex === -1) {
          rowIndex = i + 1;
          existingRow = row;
        }
      }
    }
  }

  const newRow = mapDataToRow(data);

  if (rowIndex !== -1) {
    // Merge new data over existing data (null protection)
    const mergedRow = newRow.map((newVal, idx) => {
      const existingVal = existingRow[idx];
      if (newVal === "" || newVal === null || newVal === undefined) {
        return existingVal || ""; // keep existing if new is empty
      }
      return newVal;
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A${rowIndex}:AD${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [mergedRow],
      },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetTitle}'!A:AD`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [newRow],
      },
    });
  }
      } catch (err) {
        reject(err);
      }
      resolve();
    });
  });
};

/**
 * Polls the Google Sheet for changes to the Status column (Column W).
 * Compares with MongoDB and updates the database if necessary.
 */
const pollSheetForStatusUpdates = async (spreadsheetId) => {
  try {
    const sheets = await getSheetsClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitle = spreadsheet.data.sheets[0].properties.title;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetTitle}'!A:U`,
    });

    const allRows = response.data.values || [];
    if (allRows.length <= 1) return; // No data yet

    // We only need the mongoose models inside here to avoid circular dependencies
    const Application = require('../models/Application');
    const Visitor = require('../models/Visitor');

    // 0 = Visitor ID (Col A)
    // 12 = App ID (Col M)
    // 20 = Status (Col U)
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const visitorId = row[0];
      const appId = row[12];
      const sheetStatus = (row[20] || "").trim();

      if (!sheetStatus) continue; // Skip if no status

      let dbStatus = sheetStatus;
      if (sheetStatus === 'Under Review') dbStatus = 'review';
      else if (sheetStatus === 'Submitted') dbStatus = 'submitted';
      else if (sheetStatus === 'Approved') dbStatus = 'approved';
      else if (sheetStatus === 'Rejected') dbStatus = 'rejected';
      else if (sheetStatus === 'Pending') dbStatus = 'pending';
      else if (sheetStatus === 'Cancelled') dbStatus = 'cancelled';

      if (appId) {
        // Find application by ID
        const app = await Application.findOne({ applicationId: appId });
        if (app && app.status !== dbStatus) {
          console.log(`[GoogleSheets Sync] Detected status change for App ${appId}: ${app.status} -> ${dbStatus}`);
          // Disable the hook so we don't cause an infinite loop back to Google Sheets!
          await Application.updateOne({ _id: app._id }, { status: dbStatus });
        }
      }
      // Note: We intentionally do NOT fallback to updating Visitor status here. 
      // The sheet's status column contains Application statuses ('Pending', 'Approved', etc.) 
      // which are not valid enums for the Visitor schema. Updating the Visitor with these
      // would corrupt the document and prevent future .save() operations.
    }
  } catch (err) {
    console.error("[GoogleSheets Sync] Polling error:", err);
  }
};

const renameVisitorIdInSheet = async (oldVisitorId, newVisitorId, spreadsheetId) => {
  try {
    const sheets = await getSheetsClient();
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required.');
    }
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitle = spreadsheet.data.sheets[0].properties.title;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetTitle}'!A:A`,
    });

    const allRows = response.data.values || [];
    let rowIndex = -1;
    for (let i = allRows.length - 1; i >= 1; i--) {
      if (allRows[i][0] === oldVisitorId) {
        rowIndex = i + 1; // 1-indexed for sheets.spreadsheets.values.update
        break;
      }
    }

    if (rowIndex !== -1) {
      console.log(`[GoogleSheets Sync] Renaming orphaned visitor row ${oldVisitorId} to ${newVisitorId} at row ${rowIndex}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetTitle}'!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newVisitorId]]
        }
      });
    }
  } catch (err) {
    console.error("[GoogleSheets Sync] Rename row error:", err);
  }
};

module.exports = {
  initializeSheet,
  upsertRow,
  renameVisitorIdInSheet,
  pollSheetForStatusUpdates
};

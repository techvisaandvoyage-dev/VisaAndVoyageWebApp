/**
 * Google Apps Script for Real-Time Sync with MongoDB
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any existing code and paste this entire file.
 * 4. Update the WEBHOOK_URL variable to your production backend URL.
 * 5. Save the project (Ctrl+S / Cmd+S).
 * 6. Go to the "Triggers" menu (alarm clock icon on the left).
 * 7. Click "Add Trigger" (bottom right).
 * 8. Set up the trigger exactly like this:
 *    - Choose which function to run: processEdit
 *    - Select event source: From spreadsheet
 *    - Select event type: On edit
 * 9. Click Save and allow the Google Permissions popup.
 */

// UPDATE THIS TO YOUR PRODUCTION OR NGROK URL:
const WEBHOOK_URL = 'https://api.visavo.in/api/google/webhook';

// This must match exactly what is in your server/.env file
const WEBHOOK_SECRET = 'MySuperSecretVisaAndVoyage8765!';

function processEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const range = e.range;
  
  // We only care about single cell edits for the webhook (to avoid complex range parsing)
  if (range.getNumRows() > 1 || range.getNumColumns() > 1) {
    return; // Ignore multi-cell edits (e.g., bulk clear)
  }

  const rowNumber = range.getRow();
  const colNumber = range.getColumn();

  // Skip header row edits
  if (rowNumber === 1) return;

  // Get headers to determine which column was edited
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const editedColumnName = headers[colNumber - 1];

  // List of read-only columns that we should ignore (or revert, but for now we just ignore webhook sync)
  const readOnlyColumns = [
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
    'Created Date',
    'Payment Transaction',
    'User ID',
    'Visitor ID'
  ];

  if (readOnlyColumns.includes(editedColumnName)) {
    // Optionally: e.range.setValue(e.oldValue); to revert edits to read-only columns
    return;
  }

  // Get the Application ID (always in Column A, index 0)
  const applicationId = sheet.getRange(rowNumber, 1).getValue();

  if (!applicationId) {
    // If there's no application ID on this row, it's not a valid record yet
    return;
  }

  const newValue = e.value !== undefined ? e.value : ""; // e.value is undefined if the cell is cleared
  const oldValue = e.oldValue !== undefined ? e.oldValue : "";

  const payload = {
    spreadsheetId: e.source.getId(),
    sheetName: sheetName,
    rowNumber: rowNumber,
    applicationId: applicationId,
    editedColumn: editedColumnName,
    newValue: newValue,
    oldValue: oldValue,
    timestamp: new Date().toISOString(),
    adminEmail: Session.getActiveUser().getEmail() // Note: May be empty for non-Google Workspace accounts
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-webhook-secret': WEBHOOK_SECRET,
      'Bypass-Tunnel-Reminder': 'true'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (err) {
    console.error("Failed to send webhook: " + err.message);
  }
}

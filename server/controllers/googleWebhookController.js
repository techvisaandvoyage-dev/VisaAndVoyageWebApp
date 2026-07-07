const Application = require('../models/Application');
const googleSheetsService = require('../services/googleSheetsService');

// Helper to translate Google Sheet Column Name to MongoDB Field Name
const columnToFieldMap = {
  'Admin Remark': 'adminRemark',
  'Interview Date': 'interviewDate',
  'Assigned Agent': 'assignedAgent',
  'Priority': 'priority',
  'Hotel': 'hotel',
  'Insurance': 'insurance',
  'Visa Category': 'visaType',
  'Action': 'action',
  'Notes': 'notes'
};

const handleWebhook = async (req, res) => {
  try {
    const {
      spreadsheetId,
      sheetName,
      rowNumber,
      applicationId,
      editedColumn,
      oldValue,
      newValue,
      timestamp,
      adminEmail
    } = req.body;

    console.log(`\n[GOOGLE WEBHOOK RECEIVED] -> Changed ${editedColumn} to ${newValue} for Application ${applicationId}`);

    const application = await Application.findOne({ applicationId });
    if (!application) {
      console.warn(`[GOOGLE WEBHOOK ERROR] Application ${applicationId} not found in database.`);
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // 1. Conflict Handling (Optimistic Locking)
    // Compare edit timestamp from Google Sheet with updatedAt in MongoDB
    // Allow a 5-second buffer for processing delays
    const sheetTime = new Date(timestamp).getTime();
    const dbTime = new Date(application.updatedAt).getTime();
    
    if (sheetTime < dbTime - 5000) {
      console.warn(`[Google Webhook] Conflict detected for ${applicationId}. Sheet edit is older than DB.`);
      
      // We should ideally sync the latest DB state back to the sheet to fix it for the admin
      await googleSheetsService.upsertRow(application, spreadsheetId);
      
      return res.status(409).json({ 
        success: false, 
        message: 'Conflict: Database has newer data. Sheet will be updated automatically.' 
      });
    }

    const fieldName = columnToFieldMap[editedColumn];
    const updater = adminEmail || 'Google Sheet Admin';

    // 2. Add Audit Log Entry
    application.auditLog.push({
      timestamp: new Date(timestamp),
      action: 'SHEET_EDIT',
      adminName: updater,
      source: 'GOOGLE_SHEET',
      fieldName,
      previousValue: oldValue || '',
      newValue: newValue || '',
      remark: `Changed ${editedColumn}`
    });

    // 3. Handle Special Action Column Workflows
    if (editedColumn === 'Action') {
      if (newValue === 'APPROVE') {
        application.status = 'approved';
        application.approvedDate = new Date();
        application.approvedBy = updater;
        
        application.timeline.push({
          status: 'approved',
          action: 'Action set to APPROVE',
          adminName: updater,
          remark: 'Application approved via Google Sheets'
        });
        
        // TODO: Trigger Email/WhatsApp Notifications for APPROVE

      } else if (newValue === 'REJECT') {
        application.status = 'rejected';
        application.rejectReason = 'Rejected via Google Sheets'; // Default reason
        
        application.timeline.push({
          status: 'rejected',
          action: 'Action set to REJECT',
          adminName: updater,
          remark: 'Application rejected via Google Sheets'
        });
        
        // TODO: Trigger Email/WhatsApp Notifications for REJECT

      } else if (newValue === 'HOLD') {
        application.status = 'review';
        
        application.timeline.push({
          status: 'review',
          action: 'Action set to HOLD',
          adminName: updater,
          remark: 'Application placed on hold via Google Sheets'
        });
      } else if (newValue === 'REQUEST_DOCUMENT') {
        // Custom status for waiting on documents (assuming 'pending' or similar based on schema)
        application.status = 'pending';
        
        application.timeline.push({
          status: 'pending',
          action: 'Requested Documents',
          adminName: updater,
          remark: 'Documents requested via Google Sheets'
        });
        
        // TODO: Trigger Email/WhatsApp

      } else if (newValue === 'REQUEST_PAYMENT') {
        application.paymentStatus = 'pending_payment';
        
        application.timeline.push({
          status: 'pending',
          action: 'Requested Payment',
          adminName: updater,
          remark: 'Payment requested via Google Sheets'
        });
        
        // TODO: Trigger Reminder
      }

      // We need to clear the Action cell in Google Sheets, but we don't block the response
      // It will also be cleared implicitly when the Mongoose hook re-syncs, but clearing it explicitly is safer.
      googleSheetsService.clearActionCell(spreadsheetId, rowNumber).catch(err => {
        console.error('Failed to clear action cell:', err);
      });

    } else {
      // 4. Update Regular Field
      // Basic type casting
      if (fieldName === 'interviewDate') {
        application[fieldName] = newValue ? new Date(newValue) : null;
      } else {
        application[fieldName] = newValue;
      }
    }

    // 5. Save Application
    // We pass { source: 'GOOGLE_SHEET' } to avoid infinite sync loops back to Google Sheets.
    // However, if the Action column was changed, we WANT to sync it back so the Status updates in the sheet.
    // If it was just a regular field, we can skip the sync.
    const saveOptions = editedColumn === 'Action' ? {} : { source: 'GOOGLE_SHEET' };
    
    await application.save(saveOptions);

    res.status(200).json({ success: true, message: 'Update processed successfully' });
  } catch (error) {
    console.error('Google Webhook Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  handleWebhook
};

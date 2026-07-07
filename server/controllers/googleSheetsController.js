const Application = require('../models/Application');
const { getOrCreateSpreadsheet, initializeSheet, writeDataToSheet, readDataFromSheet, clearActionCell } = require('../services/googleSheetsService');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const { getApplicationProgress, resolveApplicationStatus } = require('../utils/applicationProgress');

const getPhoneForApplication = async (userId) => {
  if (!userId) return '';
  try {
    const user = await User.findById(userId);
    return user ? user.phone || '' : '';
  } catch (err) {
    return '';
  }
};

const formatStatus = (status) => {
  switch (status) {
    case 'submitted': return 'Submitted';
    case 'pending_payment': return 'Pending Payment';
    case 'pending': return 'Pending Documents';
    case 'drive_link_pending': return 'Upload Drive Link';
    case 'doc_pending': return 'Pending Review';
    case 'review': return 'Under Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default: return status || '';
  }
};

/**
 * Export Filtered Applications
 */
exports.exportToGoogleSheet = async (req, res) => {
  try {
    const { status, countryName, travelDateStr, applicationIds } = req.body;
    const filters = {};

    if (Array.isArray(applicationIds) && applicationIds.length > 0) {
      filters.applicationId = { $in: applicationIds };
    } else {
      if (status) filters.status = status;
      if (countryName) filters.countryName = countryName;
      if (travelDateStr) {
        // Very basic example filter for month. You may adjust according to actual frontend inputs.
        const date = new Date(travelDateStr);
        if (!isNaN(date)) {
           filters.travelDate = {
             $gte: new Date(date.getFullYear(), date.getMonth(), 1),
             $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
           };
        }
      }
    }

    const applications = await Application.find(filters).populate('user').lean();
    if (applications.length === 0) {
      return res.status(404).json({ message: 'No applications found matching the filters.' });
    }

    const data = applications; // Pass raw Mongoose docs to the service

    const spreadsheetId = await getOrCreateSpreadsheet();
    await initializeSheet(spreadsheetId);
    await writeDataToSheet(spreadsheetId, data);

    res.status(200).json({ 
      success: true, 
      message: 'Exported successfully to Google Sheets.',
      spreadsheetId,
      exportedCount: data.length
    });
  } catch (error) {
    console.error('[Export Google Sheet Error]', error);
    res.status(500).json({ success: false, message: 'Failed to export to Google Sheets.', error: error.message });
  }
};

/**
 * Preview Sync from Google Sheet
 */
exports.previewGoogleSheet = async (req, res) => {
  try {
    const spreadsheetId = await getOrCreateSpreadsheet();
    const rows = await readDataFromSheet(spreadsheetId);

    const result = {
      rowsFound: rows.length,
      matchedIds: 0,
      invalidIds: 0,
      duplicateIds: 0,
      rowsToUpdate: 0,
      rowsToSkip: 0,
      details: []
    };

    const seenIds = new Set();
    const validActions = ['APPROVE', 'REJECT', 'SUBMITTED'];

    for (const row of rows) {
      if (!row.applicationId) {
        result.invalidIds++;
        result.rowsToSkip++;
        continue;
      }

      if (seenIds.has(row.applicationId)) {
        result.duplicateIds++;
        result.rowsToSkip++;
        continue;
      }
      seenIds.add(row.applicationId);

      const app = await Application.findOne({ applicationId: row.applicationId });
      if (!app) {
        result.invalidIds++;
        result.rowsToSkip++;
        continue;
      }

      result.matchedIds++;

      const hasValidAction = validActions.includes(row.action);
      const hasChangedRemark = row.adminRemark && row.adminRemark !== app.adminRemark;

      if (hasValidAction || hasChangedRemark) {
        result.rowsToUpdate++;
        result.details.push({
          applicationId: row.applicationId,
          rowIndex: row.rowIndex,
          action: row.action,
          remark: row.adminRemark
        });
      } else {
        result.rowsToSkip++;
      }
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[Preview Google Sheet Error]', error);
    res.status(500).json({ success: false, message: 'Failed to read from Google Sheets.', error: error.message });
  }
};

/**
 * Sync from Google Sheet
 */
exports.syncGoogleSheet = async (req, res) => {
  try {
    const spreadsheetId = await getOrCreateSpreadsheet();
    const rows = await readDataFromSheet(spreadsheetId);

    const validActions = ['APPROVE', 'REJECT', 'SUBMITTED'];
    let updatedCount = 0;
    let skippedCount = 0;

    // Admin performing the action
    const adminName = req.user ? (req.user.name || req.user.email) : 'System (Google Sheets Sync)';

    for (const row of rows) {
      if (!row.applicationId) {
         skippedCount++;
         continue;
      }

      const action = row.action;
      const remark = row.adminRemark;
      
      const isActionValid = validActions.includes(action);
      const hasChangedRemark = remark !== undefined && remark !== null; // Will verify difference below

      if (!isActionValid && !hasChangedRemark) {
        skippedCount++;
        continue; // Nothing to do
      }

      const app = await Application.findOne({ applicationId: row.applicationId }).populate('user');
      if (!app) {
        skippedCount++;
        continue;
      }

      let didUpdate = false;
      const previousStatus = app.status;

      // Update Remark if changed
      if (hasChangedRemark && remark !== app.adminRemark) {
        app.adminRemark = remark;
        didUpdate = true;
      }

      // Process Action
      if (isActionValid) {
        didUpdate = true;
        let newStatus = app.status;

        if (action === 'APPROVE') {
          newStatus = 'approved';
          app.approvedDate = new Date();
          app.approvedBy = adminName;
        } else if (action === 'REJECT') {
          newStatus = 'rejected';
          app.rejectReason = remark || 'Rejected via Google Sheets sync';
        } else if (action === 'SUBMITTED') {
          newStatus = 'submitted';
        }

        app.status = newStatus;

        // Add to timeline
        app.timeline.push({
          timestamp: new Date(),
          status: newStatus,
          action: action,
          adminName: adminName,
          remark: remark
        });

        // Add to audit log
        app.auditLog.push({
          timestamp: new Date(),
          action: action,
          adminName: adminName,
          previousStatus: previousStatus,
          newStatus: newStatus,
          source: 'Google Sheet',
          remark: remark
        });

        // Send Email & WhatsApp if Approved or Rejected
        if (action === 'APPROVE' || action === 'REJECT') {
          const subject = action === 'APPROVE' ? 'Your Visa Application has been Approved' : 'Update on your Visa Application';
          const emailMessage = action === 'APPROVE' 
            ? `<p>Dear ${app.firstName},</p><p>Great news! Your visa application (ID: <strong>${app.applicationId}</strong>) has been <strong>approved</strong>.</p>`
            : `<p>Dear ${app.firstName},</p><p>We regret to inform you that your visa application (ID: <strong>${app.applicationId}</strong>) has been <strong>rejected</strong>.</p><p>Reason: ${app.rejectReason}</p>`;

          // Dispatch email asynchronously
          sendEmail({
            email: app.email,
            subject,
            html: emailMessage
          }).catch(e => console.error('Failed to send email during sync', e));

          // TODO: Implement actual WhatsApp sending if required.
          console.log(`[WhatsApp Mock] Sending WhatsApp to ${app.user?.phone || app.email}: ${subject}`);
        }

        // Clear action cell in Google Sheets after successful processing
        try {
          await clearActionCell(spreadsheetId, row.rowIndex);
        } catch (e) {
          console.error(`Failed to clear action cell for row ${row.rowIndex}`, e);
        }
      }

      if (didUpdate) {
        await app.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Sync completed successfully.',
      updatedCount,
      skippedCount
    });

  } catch (error) {
    console.error('[Sync Google Sheet Error]', error);
    res.status(500).json({ success: false, message: 'Failed to sync with Google Sheets.', error: error.message });
  }
};

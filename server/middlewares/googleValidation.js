const validateGoogleWebhook = (req, res, next) => {
  const {
    spreadsheetId,
    sheetName,
    rowNumber,
    applicationId,
    editedColumn,
    newValue,
    timestamp
  } = req.body;

  if (!spreadsheetId || !applicationId || !editedColumn || !timestamp || !rowNumber) {
    return res.status(400).json({
      success: false,
      message: 'Missing required webhook payload fields'
    });
  }

  // Validate editedColumn against allowed editable columns
  const allowedColumns = [
    'Admin Remark',
    'Interview Date',
    'Assigned Agent',
    'Priority',
    'Hotel',
    'Insurance',
    'Visa Category',
    'Action',
    'Notes'
  ];

  if (!allowedColumns.includes(editedColumn)) {
    return res.status(400).json({
      success: false,
      message: `Edits to column '${editedColumn}' are not supported or it is read-only.`
    });
  }

  if (editedColumn === 'Action') {
    const validActions = ['APPROVE', 'REJECT', 'HOLD', 'REQUEST_DOCUMENT', 'REQUEST_PAYMENT', ''];
    if (!validActions.includes(newValue)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Action value'
      });
    }
  }

  next();
};

module.exports = {
  validateGoogleWebhook
};

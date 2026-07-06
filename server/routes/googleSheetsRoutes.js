const express = require('express');
const router = express.Router();
const googleSheetsController = require('../controllers/googleSheetsController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.post('/export', protect, requireAdmin, googleSheetsController.exportToGoogleSheet);
router.get('/preview', protect, requireAdmin, googleSheetsController.previewGoogleSheet);
router.post('/sync', protect, requireAdmin, googleSheetsController.syncGoogleSheet);

module.exports = router;

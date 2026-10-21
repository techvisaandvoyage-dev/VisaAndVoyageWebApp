const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
  initVisitor,
  startSession,
  trackEvent,
  getOverview,
  getFunnel,
  getVisitors,
  getVisitorDetails,
  getUnifiedApplications
} = require('../controllers/analyticsController');

// --- Public / Client Endpoints ---
router.post('/visitor', initVisitor);
router.post('/session', startSession);
router.post('/event', trackEvent);

// --- Protected Admin Endpoints ---
router.get('/admin/overview', protect, requireAdmin, getOverview);
router.get('/admin/funnel', protect, requireAdmin, getFunnel);
router.get('/admin/visitors', protect, requireAdmin, getVisitors);
router.get('/admin/visitors/:visitorId', protect, requireAdmin, getVisitorDetails);
router.get('/admin/applications-unified', protect, requireAdmin, getUnifiedApplications);

module.exports = router;

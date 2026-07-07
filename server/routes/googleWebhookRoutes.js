const express = require('express');
const router = express.Router();
const googleWebhookController = require('../controllers/googleWebhookController');
const { validateGoogleWebhook } = require('../middlewares/googleValidation');

// Route is exposed, we rely on a secret token or simply obscurity/validation for now
// A production setup could also include a shared secret in the webhook payload
router.post('/webhook', validateGoogleWebhook, googleWebhookController.handleWebhook);

module.exports = router;

const express = require('express');
const router = express.Router();
const { loginAdmin, changePassword } = require('../controllers/adminController');
const { getAllApplications, getApplicationById, updateApplicationByAdmin, updateApplicationStatus, uploadApprovedVisaFile, downloadApplicationDocument } = require('../controllers/applicationController');
const { getSettings, updateSettings, uploadSeoAssets } = require('../controllers/settingsController');
const {
  getAuthSettings,
  updateSmsSettings,
  updateWhatsappSettings,
  updateEmailSettings,
  updatePrioritySettings,
  updateTestingSettings,
} = require('../controllers/authSettingsController');
const { getAllTransactions } = require('../controllers/paymentController');
const {
  getCountries,
  addCountry,
  updateCountry,
  deleteCountry,
  uploadCountryImage,
  refreshUnsplashCountryImages,
  bulkUpdateCountryVisibility,
  resetCountryPopularity,
  resetAllCountryPopularity,
  updateFeesBulk,
  saveAllFeeConfigs,
  getServiceFeeCountryOverrides,
  upsertServiceFeeCountryOverride,
  removeServiceFeeCountryOverride,
} = require('../controllers/countryController');
const {
  createStaticPage,
  deleteStaticPage,
  getAdminPageById,
  getAdminPages,
  toggleStaticPageStatus,
  updateStaticPage,
  uploadStaticPageImage,
} = require('../controllers/staticPageController');
const blogAdmin = require('../controllers/blogAdminController');
const { listCategoriesAdmin } = require('../controllers/blogCategoryController');
const {
  getFeeManagerRows,
  convertFeeManagerValues,
  updateFeeManagerRow,
} = require('../controllers/feeManagerController');
const {
  getAdminFooterSocialIcons,
  createFooterSocialIcon,
  updateFooterSocialIcon,
  deleteFooterSocialIcon,
} = require('../controllers/footerSocialIconController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage for country banner images
const countryImagesDir = path.join(__dirname, '..', 'uploads', 'country-images');
if (!fs.existsSync(countryImagesDir)) fs.mkdirSync(countryImagesDir, { recursive: true });
const pageMediaDir = path.join(__dirname, '..', 'uploads', 'page-media');
if (!fs.existsSync(pageMediaDir)) fs.mkdirSync(pageMediaDir, { recursive: true });
const visaFilesDir = path.join(__dirname, '..', 'uploads', 'visa-files');
if (!fs.existsSync(visaFilesDir)) fs.mkdirSync(visaFilesDir, { recursive: true });

const countryImageStorage = multer.memoryStorage();
const pageMediaStorage = multer.memoryStorage();
const visaFileStorage = multer.memoryStorage();
const countryImageUpload = multer({
  storage: countryImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    /^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'));
  },
});
const pageMediaUpload = multer({
  storage: pageMediaStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    /^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'));
  },
});
const visaFileUpload = multer({
  storage: visaFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    allowedMimeTypes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only PDF, PNG, JPG, JPEG, and WEBP files are allowed'));
  },
});
const seoAssetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    /^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'));
  },
});
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.put('/change-password', protect, requireAdmin, changePassword);

router.get('/applications', protect, requireAdmin, getAllApplications);
router.get('/applications/download-document', protect, requireAdmin, downloadApplicationDocument);
router.get('/applications/:id', protect, requireAdmin, getApplicationById);
router.put('/applications/:id', protect, requireAdmin, updateApplicationByAdmin);
router.post('/applications/:id/visa-file', protect, requireAdmin, visaFileUpload.single('visaFile'), uploadApprovedVisaFile);
router.put('/applications/:id/status', protect, requireAdmin, updateApplicationStatus);

// Admin Settings routes
router.get('/settings', protect, requireAdmin, getSettings);
router.put('/settings', protect, requireAdmin, updateSettings);
router.post(
  '/settings/seo-assets',
  protect,
  requireAdmin,
  seoAssetUpload.fields([{ name: 'favicon', maxCount: 1 }]),
  uploadSeoAssets
);
router.get('/auth-settings', protect, requireAdmin, getAuthSettings);
router.put('/auth-settings/sms', protect, requireAdmin, updateSmsSettings);
router.put('/auth-settings/whatsapp', protect, requireAdmin, updateWhatsappSettings);
router.put('/auth-settings/email', protect, requireAdmin, updateEmailSettings);
router.put('/auth-settings/priority', protect, requireAdmin, updatePrioritySettings);
router.put('/auth-settings/testing', protect, requireAdmin, updateTestingSettings);

// Admin Transactions route
router.get('/transactions', protect, requireAdmin, getAllTransactions);
router.put('/fees/bulk-update', protect, requireAdmin, updateFeesBulk);
router.put('/fees/save-all', protect, requireAdmin, saveAllFeeConfigs);
router.get('/service-fee-overrides', protect, requireAdmin, getServiceFeeCountryOverrides);
router.put('/service-fee-overrides/:countryId', protect, requireAdmin, upsertServiceFeeCountryOverride);
router.delete('/service-fee-overrides/:countryId', protect, requireAdmin, removeServiceFeeCountryOverride);

router.get('/fee-manager', protect, requireAdmin, getFeeManagerRows);
router.post('/fee-manager/convert', protect, requireAdmin, convertFeeManagerValues);
router.put('/fee-manager/:countryId', protect, requireAdmin, updateFeeManagerRow);

router.get('/footer-social-icons', protect, requireAdmin, getAdminFooterSocialIcons);
router.post('/footer-social-icons', protect, requireAdmin, createFooterSocialIcon);
router.put('/footer-social-icons/:id', protect, requireAdmin, updateFooterSocialIcon);
router.delete('/footer-social-icons/:id', protect, requireAdmin, deleteFooterSocialIcon);

// Country management (admin only)
router.get('/countries-list', protect, requireAdmin, getCountries);
router.post('/countries/visibility', protect, requireAdmin, bulkUpdateCountryVisibility);
router.post('/countries/reset-popularity', protect, requireAdmin, resetAllCountryPopularity);
router.post('/countries/:id/reset-popularity', protect, requireAdmin, resetCountryPopularity);
router.post('/countries/upload-image', protect, requireAdmin, countryImageUpload.single('image'), uploadCountryImage);
router.post('/countries/refresh-unsplash-images', protect, requireAdmin, refreshUnsplashCountryImages);
router.post('/countries', protect, requireAdmin, addCountry);
router.put('/countries/:id', protect, requireAdmin, updateCountry);
router.delete('/countries/:id', protect, requireAdmin, deleteCountry);

// Static pages CMS
router.get('/pages', protect, requireAdmin, getAdminPages);
router.get('/pages/:id', protect, requireAdmin, getAdminPageById);
router.post('/pages/upload-image', protect, requireAdmin, pageMediaUpload.single('image'), uploadStaticPageImage);
router.post('/pages', protect, requireAdmin, createStaticPage);
router.put('/pages/:id', protect, requireAdmin, updateStaticPage);
router.patch('/pages/:id/toggle-status', protect, requireAdmin, toggleStaticPageStatus);
router.delete('/pages/:id', protect, requireAdmin, deleteStaticPage);

// Visa blog CMS
router.get('/blog-categories', protect, requireAdmin, listCategoriesAdmin);
router.get('/blogs', protect, requireAdmin, blogAdmin.listAdminBlogs);
router.get('/comments', protect, requireAdmin, blogAdmin.listAdminComments);
router.delete('/comments/:id', protect, requireAdmin, blogAdmin.adminDeleteComment);
router.patch('/blog/:id/feature', protect, requireAdmin, blogAdmin.toggleFeatureBlog);
router.patch('/comments/:id/pin', protect, requireAdmin, blogAdmin.togglePinComment);
router.get('/blog-reports', protect, requireAdmin, blogAdmin.listReports);
router.patch('/blog-reports/:id', protect, requireAdmin, blogAdmin.updateReport);

module.exports = router;

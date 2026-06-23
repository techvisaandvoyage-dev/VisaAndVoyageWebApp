const fs = require('fs');

const file = 'c:/Users/yashr/OneDrive/Desktop/Projects/VB/server/controllers/countryController.js';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\\n');
const validLines = lines.slice(0, 3554);
const newEnd = \`

module.exports = {
  getCountries,
  getCountryBySlug,
  getPopularCountries,
  trackCountryVisit,
  addCountry,
  updateCountry,
  deleteCountry,
  uploadCountryImage,
  refreshUnsplashCountryImages,
  getGlobalCountryDefaults,
  getServiceFeeCountryOverrides,
  upsertServiceFeeCountryOverride,
  removeServiceFeeCountryOverride,
  getGovernmentFeeCountryOverrides,
  upsertGovernmentFeeCountryOverride,
  removeGovernmentFeeCountryOverride,
  updateGlobalBasePrice,
  updateGlobalGovernmentFee,
  updateFeesBulk,
  saveAllFeeConfigs,
  updateGlobalVisaType,
  updateGlobalValidity,
  updateGlobalLengthOfStay,
  updateGlobalEntryType,
  updateGlobalProcessingDays,
  updateGlobalRequiredDocuments,
  updateGlobalOptionalDocuments,
  updateDocumentSectionCopy,
  manageCustomDocuments,
  updateCountryDisplayToggles,
  bulkUpdateCountryVisibility,
  resetCountryPopularity,
  resetAllCountryPopularity,
};
\`;

fs.writeFileSync(file, validLines.join('\\n') + newEnd, 'utf8');
console.log('Fixed exports and duplicate lines.');

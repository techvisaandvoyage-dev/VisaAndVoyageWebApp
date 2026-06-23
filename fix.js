const fs = require('fs');
let data = fs.readFileSync('server/controllers/countryController.js', 'utf8');

data = data.replace(
  /const serviceFeeCountryOverrides = normalizeServiceFeeCountryOverrides\([\s\S]*?await settings\.save\(\);\s+}/,
  `$&
    const governmentFeeCountryOverrides = normalizeServiceFeeCountryOverrides(
      settings?.governmentFeeCountryOverrides,
      activeCountryIds
    );
    if (
      serializeServiceFeeCountryOverrides(governmentFeeCountryOverrides) !==
      serializeServiceFeeCountryOverrides(settings?.governmentFeeCountryOverrides || [])
    ) {
      settings.governmentFeeCountryOverrides = governmentFeeCountryOverrides;
      await settings.save();
    }`
);

data = data.replace(
  /governmentFeeScopeTargets: normalizeFeeScopeTargetConfig\([\s\S]*? activeCountryIds\s*\),/,
  `$&
        governmentFeeCountryOverrides: formatServiceFeeCountryOverrideRows(
          governmentFeeCountryOverrides,
          activeCountries
        ),`
);

fs.writeFileSync('server/controllers/countryController.js', data);
console.log('Done');

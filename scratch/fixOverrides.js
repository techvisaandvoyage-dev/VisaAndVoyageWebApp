const fs = require('fs');
const p = 'admin/src/components/controls/VisaDetailsTable.jsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Fix isUsingGlobal
content = content.replace(
/const isUsingGlobal = \(country, field, overrides\) => \{[\s\S]*?\};/,
`const isUsingGlobal = (country, field, overrides) => {
  const id = String(country._id || country.slug || country.id);
  const overrideDoc = overrides && overrides[id];
  if (!overrideDoc) return true;
  const useGlobalKey = \`useGlobal\${field.charAt(0).toUpperCase() + field.slice(1)}\`;
  return overrideDoc[useGlobalKey] !== false;
};`);

// 2. Fix resolveEffectiveValue (and remove getVisaStateForCountry)
content = content.replace(
/const getVisaStateForCountry = \(id, overrides, defConfig\) => \{[\s\S]*?const resolveEffectiveValue = \(country, field, overrides, defConfig\) => \{[\s\S]*?\};/m,
`const resolveEffectiveValue = (country, field, overrides, defConfig) => {
  const id = String(country._id || country.slug || country.id);
  const overrideDoc = overrides && overrides[id];
  const useGlobalKey = \`useGlobal\${field.charAt(0).toUpperCase() + field.slice(1)}\`;
  
  if (overrideDoc && overrideDoc[useGlobalKey] === false) {
    return overrideDoc[field] || "";
  }
  return defConfig ? defConfig[field] || "" : "";
};`);

// 3. Fix setCellValue
content = content.replace(
/setDirtyRows\(\(prev\) => \{\s*const row = \{ \.\.\.\(prev\[id\] \|\| \{\}\) \};\s*row\[field\] = value;\s*return \{ \.\.\.prev, \[id\]: row \};\s*\}\);/,
`const useGlobalKey = \`useGlobal\${field.charAt(0).toUpperCase() + field.slice(1)}\`;
    const useGlobal = value === globalVal;
    setDirtyRows((prev) => {
      const row = { ...(prev[id] || {}) };
      row[field] = value;
      row[useGlobalKey] = useGlobal;
      return { ...prev, [id]: row };
    });`);

// 4. Fix handleCountryEditSave filtering
content = content.replace(
/const fields = \[\"visaType\", \"entryType\", \"validity\", \"processingDays\", \"lengthOfStay\", \"requiredDocuments\"\];\s*for \(const key of fields\) \{\s*if \(updated\[key\] !== undefined\) payload\[key\] = updated\[key\];\s*\}/m,
`const fields = ["visaType", "entryType", "validity", "processingDays", "lengthOfStay", "requiredDocuments", "optionalDocuments"];
    for (const key of fields) {
      if (updated[key] !== undefined) payload[key] = updated[key];
      const useGlobalKey = \`useGlobal\${key.charAt(0).toUpperCase() + key.slice(1)}\`;
      if (updated[useGlobalKey] !== undefined) payload[useGlobalKey] = updated[useGlobalKey];
    }`);
content = content.replace(
/payload\.useCustomVisaTypes = updated\.useCustomVisaTypes;\s*payload\.useCustomVisaTypes = updated\.useCustomVisaTypes;\s*/,
`payload.customVisaTypes = updated.customVisaTypes;
      payload.useCustomVisaTypes = updated.useCustomVisaTypes;
      if (updated.useGlobalCustomVisaTypes !== undefined) payload.useGlobalCustomVisaTypes = updated.useGlobalCustomVisaTypes;`);

// 5. Fix handleSave dirtyRows filtering
content = content.replace(
/if \(key\.startsWith\(\"_original_\"\) \|\| key\.startsWith\(\"useGlobal\"\)\) continue;/g,
`if (key.startsWith("_original_")) continue;`);

fs.writeFileSync(p, content);
console.log('Fixed VisaDetailsTable granular overrides');

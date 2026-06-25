const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../admin/src/components/controls/VisaDetailsTable.jsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Replace resolveEffectiveValue & isUsingGlobal
content = content.replace(
/const resolveEffectiveValue = \(country, field, globalDefaults\) => \{[\s\S]*?const isUsingGlobal = \(country, field\) => \{[\s\S]*?\};/m,
`const getVisaStateForCountry = (id, overrides, defConfig) => {
  if (overrides && overrides[id]) return { isDefault: false, data: overrides[id] };
  return { isDefault: true, data: defConfig || {} };
};

const resolveEffectiveValue = (country, field, overrides, defConfig) => {
  const state = getVisaStateForCountry(country._id || country.slug || country.id, overrides, defConfig);
  return state.data[field] || "";
};

const isUsingGlobal = (country, field, overrides) => {
  const id = String(country._id || country.slug || country.id);
  return !(overrides && overrides[id]);
};`
);

// 2. State hooks
content = content.replace(
  /const \[globalDefaults, setGlobalDefaults\] = useState\(\{\}\);/,
  `const [globalDefaults, setGlobalDefaults] = useState({});
  const [visaConfigDefault, setVisaConfigDefault] = useState({});
  const [visaConfigOverrides, setVisaConfigOverrides] = useState({});`
);

// 3. Display Countries Filter
content = content.replace(
  /const effective = \(col in draft\) \? draft\[col\] : resolveEffectiveValue\(c, col, globalDefaults\);/,
  `const effective = (col in draft) ? draft[col] : resolveEffectiveValue(c, col, visaConfigOverrides, visaConfigDefault);`
);
content = content.replace(
  /}, \[countries, activeCountries, showActiveOnly, searchQuery, columnFilters, dirtyRows, globalDefaults\]\);/,
  `}, [countries, activeCountries, showActiveOnly, searchQuery, columnFilters, dirtyRows, visaConfigOverrides, visaConfigDefault]);`
);

// 4. loadData
content = content.replace(
  /const \[defaultsRes, visaTypesRes\] = await Promise.all\(\[[\s\S]*?api.get\("\/visa-types"\),\s*\]\);[\s\S]*?setVisaTypes\(visaTypesRes\.data\.visaTypes \|\| \[\]\);\s*\}/m,
  `const [visaRes, defaultsRes, visaTypesRes] = await Promise.all([
        api.get("/admin/visa"),
        api.get("/admin/control/country-defaults"),
        api.get("/visa-types"),
      ]);
      if (visaRes.data?.success) {
        setVisaConfigDefault(visaRes.data.default || {});
        const map = {};
        (visaRes.data.overrides || []).forEach(o => { map[o.countryId] = o; });
        setVisaConfigOverrides(map);
      }
      if (defaultsRes.data?.success) {
        setGlobalDefaults(defaultsRes.data.defaults || {});
        if (defaultsRes.data.documentCatalog) {
          setDocumentCatalog(defaultsRes.data.documentCatalog);
        }
      }
      if (visaTypesRes.data?.success) {
        setVisaTypes(visaTypesRes.data.visaTypes || []);
      }`
);

// 5. handleBulkApply (Updates DEFAULT and clears overrides for selected countries instantly)
content = content.replace(
  /const handleBulkApply = useCallback\(\(\) => \{[\s\S]*?showToast\(`Applied to \$\{selectedIds.length\} countries`, "success"\);\s*\}, \[bulkValues, selectedIds, displayCountries, globalDefaults, showToast\]\);/m,
  `const handleBulkApply = useCallback(async () => {
    const fieldsWithValues = Object.entries(bulkValues).filter(([, v]) => v !== "" && v !== undefined && v !== null);
    if (fieldsWithValues.length === 0) {
      showToast("Set at least one field value before applying.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { selectedCountries: selectedIds };
      fieldsWithValues.forEach(([field, value]) => {
        if (field === "customVisaTypes") {
          payload.customVisaTypes = (value || []).map(name => ({ id: name, name, active: true }));
        } else {
          payload[field] = value;
        }
      });
      const { data } = await api.post("/admin/visa/default", payload);
      if (data?.success) {
        showToast("Default visa configuration updated successfully", "success");
        setBulkValues({});
        setSelectedIds([]);
        await loadData();
      }
    } catch (err) {
      showToast("Failed to apply bulk update", "error");
    } finally {
      setSaving(false);
    }
  }, [bulkValues, selectedIds, loadData, showToast]);`
);

// 6. handleSave (Saves individual rows as overrides)
content = content.replace(
  /const handleSave = useCallback\(async \(\) => \{[\s\S]*?setSaving\(false\);\s*\}, \[dirtyRows, countries, fetchCountries, loadData, showToast, visaTypes\]\);/m,
  `const handleSave = useCallback(async () => {
    const dirtyIds = Object.keys(dirtyRows);
    if (dirtyIds.length === 0) {
      showToast("No changes to save.", "info");
      return;
    }
    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of dirtyIds) {
      const country = findCountry(countries, id);
      if (!country) { failCount++; continue; }
      const changes = dirtyRows[id];
      const payload = {};

      for (const [key, value] of Object.entries(changes)) {
        if (key.startsWith("_original_") || key.startsWith("useGlobal")) continue;
        if (key === "customVisaTypes") {
          payload.customVisaTypes = (value || []).map((name) => ({ id: name, name, active: true }));
          continue;
        }
        payload[key] = value;
      }

      try {
        const { data } = await api.put(\`/admin/visa/\${id}\`, payload);
        if (data?.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      await fetchCountries();
      await loadData();
      setDirtyRows({});
      showToast(\`\${successCount} countr\${successCount === 1 ? "y" : "ies"} updated.\${failCount > 0 ? \` \${failCount} failed.\` : ""}\`, failCount > 0 ? "warning" : "success");
    } else {
      showToast("Failed to save changes.", "error");
    }
    setSaving(false);
  }, [dirtyRows, countries, fetchCountries, loadData, showToast]);`
);

// 7. Fix renderCell
content = content.replace(
  /const effective = hasDraftVal \? draftVal : resolveEffectiveValue\(country, field, globalDefaults\);/g,
  `const effective = hasDraftVal ? draftVal : resolveEffectiveValue(country, field, visaConfigOverrides, visaConfigDefault);`
);
content = content.replace(
  /const usingGlobal = hasDraftVal \? \(draft\[\`useGlobal\$\{field\.charAt\(0\)\.toUpperCase\(\) \+ field\.slice\(1\)\}\`\] !== false\) : isUsingGlobal\(country, field\);/g,
  `const usingGlobal = hasDraftVal ? false : isUsingGlobal(country, field, visaConfigOverrides);`
);
content = content.replace(
  /<span className="text-\[9px\] text-text-muted truncate">global<\/span>/g,
  `<span className="text-[9px] text-text-muted truncate">default</span>`
);

// 8. Fix "Apply to Selected" button in Bulk Edit Panel
content = content.replace(
  /onClick=\{handleBulkApply\}\s*className="px-4 py-2 rounded-xl bg-cyan text-white text-sm font-semibold hover:bg-cyan\/90 transition-colors shrink-0"/g,
  `onClick={handleBulkApply}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-cyan text-white text-sm font-semibold hover:bg-cyan/90 transition-colors shrink-0"`
);

// One more place: inside setCellValue, it refers to globalDefaults.
content = content.replace(
  /const globalVal = globalDefaults\[globalKey\];/g,
  `const globalVal = visaConfigDefault[field];`
);

// And remove useGlobal logic from setCellValue
content = content.replace(
  /const useGlobal = value === globalVal;\s*setDirtyRows\(\(prev\) => \{\s*const row = \{ \.\.\.\(prev\[id\] \|\| \{\}\) \};\s*row\[field\] = value;\s*row\[useGlobalKey\] = useGlobal;\s*if \(useGlobal\) \{\s*row\[\`_original_\$\{field\}\`\] = undefined;\s*\} else \{\s*row\[\`_original_\$\{field\}\`\] = country\[field\];\s*\}\s*return \{ \.\.\.prev, \[id\]: row \};\s*\}\);/m,
  `setDirtyRows((prev) => {
      const row = { ...(prev[id] || {}) };
      row[field] = value;
      return { ...prev, [id]: row };
    });`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Done rewriting VisaDetailsTable');

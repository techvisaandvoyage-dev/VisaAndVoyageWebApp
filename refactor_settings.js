const fs = require('fs');
const file = 'c:/Users/yashr/OneDrive/Desktop/Projects/Meraki Movies/VB/admin/src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update isControlsTab
content = content.replace(
  'const isControlsTab = ["controls", "landing-page", "cards", "footer", "system-display", "activity"].includes(activeTab);',
  'const isControlsTab = ["controls", "landing-page", "cards", "footer", "settings", "activity"].includes(activeTab);'
);

// 2. Update controlGroups
const systemDisplayGroupRegex = /[ \t]*\{\s*key:\s*"system-display",[\s\S]*?label:\s*"Site maintenance mode"\s*\}\s*,\s*\],\s*\},/m;
const newSettingsGroup = `    {
      key: "settings",
      label: "Settings",
      icon: Settings,
      description: "Maintenance and configuration",
      sections: [
        { key: "password-update", label: "Password Update" },
        {
          key: "system-display",
          label: "System Display",
          children: [
            { key: "maintenance-mode", label: "Site maintenance mode" },
          ],
        },
        { key: "seo-manager", label: "SEO manager" },
      ],
    },`;
content = content.replace(systemDisplayGroupRegex, newSettingsGroup);

// 3. Extract Security Card using exact regex
const securityCardRegex = /^[ \t]*\{\/\*\s*Security Card\s*\*\/\}\s*<Card>[\s\S]*?<\/Card>/m;
const securityMatch = content.match(securityCardRegex);
if (!securityMatch) {
  console.error("Missing Security Card");
  process.exit(1);
}
const securityBlock = securityMatch[0];

// 4. Extract SeoManagerPanel
const seoMatch = content.match(/<SeoManagerPanel\s*\/>/);
if (!seoMatch) {
  console.error("Missing SeoManagerPanel");
  process.exit(1);
}
const seoBlock = seoMatch[0];

// 5. Remove activeTab === "settings" block safely
const settingsStart = content.indexOf('{activeTab === "settings" && (');
if (settingsStart !== -1) {
  const settingsEnd = content.indexOf('</motion.div>\n          )}', settingsStart) + '</motion.div>\n          )}'.length;
  if (settingsEnd > settingsStart) {
    content = content.substring(0, settingsStart) + content.substring(settingsEnd);
  }
}

// 6. Remove activeTab === "seo" block safely
const seoStart = content.indexOf('{activeTab === "seo" && (');
if (seoStart !== -1) {
  const seoEnd = content.indexOf('</motion.div>\n          )}', seoStart) + '</motion.div>\n          )}'.length;
  if (seoEnd > seoStart) {
    content = content.substring(0, seoStart) + content.substring(seoEnd);
  }
}

// 7. Inject wrapped blocks near maintenance-mode
const wrappedSecurity = `              <div className={isControlSectionVisible("password-update") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>\n${securityBlock}\n              </div>\n`;
const wrappedSeo = `              <div className={isControlSectionVisible("seo-manager") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>\n                <Card>\n                  ${seoBlock}\n                </Card>\n              </div>\n`;

const maintenanceModeStr = '<div className={isControlSectionVisible("maintenance-mode")';
const maintenanceModeIdx = content.indexOf(maintenanceModeStr);
if (maintenanceModeIdx !== -1) {
  content = content.substring(0, maintenanceModeIdx) + wrappedSecurity + wrappedSeo + content.substring(maintenanceModeIdx);
} else {
  console.error("Could not find maintenance mode placeholder.");
  process.exit(1);
}

fs.writeFileSync(file, content);
console.log("Successfully refactored settings tab layout correctly!");

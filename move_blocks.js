const fs = require('fs');
const file = 'c:/Users/yashr/OneDrive/Desktop/Projects/Meraki Movies/VB/admin/src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Use regex to find the actual SettingsSectionCard blocks
const razorpayRegex = /^[ \t]*<SettingsSectionCard\s+title="Payments - Razorpay"[\s\S]*?<\/SettingsSectionCard>/m;
const unsplashRegex = /^[ \t]*<SettingsSectionCard\s+title="Country images - Unsplash"[\s\S]*?<\/SettingsSectionCard>/m;

const razorpayMatch = content.match(razorpayRegex);
const unsplashMatch = content.match(unsplashRegex);

if (!razorpayMatch || !unsplashMatch) {
    console.error("Could not find the original blocks in settings tab.");
    process.exit(1);
}

const razorpayBlock = razorpayMatch[0];
const unsplashBlock = unsplashMatch[0];

// Remove the original blocks from the settings tab
content = content.replace(razorpayBlock, '');
content = content.replace(unsplashBlock, '');

// Now define regex to find the placeholders
const razorpayPlaceholderRegex = /^[ \t]*<div className=\{isControlSectionVisible\("payments-razorpay"\)[^>]*>[\s\S]*?Razorpay configuration coming soon![\s\S]*?<\/div>\s*<\/Card>\s*<\/div>/m;
const unsplashPlaceholderRegex = /^[ \t]*<div className=\{isControlSectionVisible\("country-images"\)[^>]*>[\s\S]*?Unsplash image integration coming soon![\s\S]*?<\/div>\s*<\/Card>\s*<\/div>/m;

// Create the new wrapped content
// We need to keep the outer div but replace the <Card> inside with the actual SettingsSectionCard
const newRazorpayContent = `              <div className={isControlSectionVisible("payments-razorpay") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>\n${razorpayBlock}\n              </div>`;
const newUnsplashContent = `              <div className={isControlSectionVisible("country-images") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>\n${unsplashBlock}\n              </div>`;

if (!razorpayPlaceholderRegex.test(content) || !unsplashPlaceholderRegex.test(content)) {
    console.error("Could not find placeholders");
    process.exit(1);
}

content = content.replace(razorpayPlaceholderRegex, newRazorpayContent);
content = content.replace(unsplashPlaceholderRegex, newUnsplashContent);

fs.writeFileSync(file, content);
console.log("Successfully replaced and moved the blocks!");

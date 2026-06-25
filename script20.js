const fs = require('fs');
const file = 'admin/src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

let rzStart = lines.findIndex(l => l.includes('<SettingsSectionCard') && lines[l.indexOf('<SettingsSectionCard')+1] && lines[l.indexOf('<SettingsSectionCard')+1].includes('Payments - Razorpay'));
if (rzStart === -1) rzStart = lines.findIndex(l => l.includes('title=\"Payments - Razorpay\"')) - 1;
let rzEnd = lines.findIndex((l, i) => i > rzStart && l.includes('</SettingsSectionCard>'));
const razorpayCode = lines.slice(rzStart, rzEnd + 1).join('\n');

let unStart = lines.findIndex(l => l.includes('<SettingsSectionCard') && lines[l.indexOf('<SettingsSectionCard')+1] && lines[l.indexOf('<SettingsSectionCard')+1].includes('Country images - Unsplash'));
if (unStart === -1) unStart = lines.findIndex(l => l.includes('title=\"Country images - Unsplash\"')) - 1;
let unEnd = lines.findIndex((l, i) => i > unStart && l.includes('</SettingsSectionCard>'));
const unsplashCode = lines.slice(unStart, unEnd + 1).join('\n');

let secStart = lines.findIndex(l => l.includes('{/* Security Card */}'));
let secEnd = lines.findIndex((l, i) => i > secStart && l.includes('</Card>'));
const securityCode = lines.slice(secStart, secEnd + 1).join('\n');

let rzPlaceStart = lines.findIndex(l => l.includes('isControlSectionVisible(\"payments-razorpay\")'));
let rzPlaceEnd = lines.findIndex((l, i) => i > rzPlaceStart && l.trim() === '</div>');
let rzPlaceholder = lines.slice(rzPlaceStart, rzPlaceEnd + 1).join('\n');
let rzReplacement = '<div className={isControlSectionVisible(\"payments-razorpay\") ? \"w-full max-w-none flex-1 xl:col-span-2 self-stretch\" : \"hidden\"}>\n' + razorpayCode + '\n</div>';
content = content.replace(rzPlaceholder, rzReplacement);

let unPlaceStart = lines.findIndex(l => l.includes('isControlSectionVisible(\"country-images\")'));
let unPlaceEnd = lines.findIndex((l, i) => i > unPlaceStart && l.trim() === '</div>');
let unPlaceholder = lines.slice(unPlaceStart, unPlaceEnd + 1).join('\n');
let unReplacement = '<div className={isControlSectionVisible(\"country-images\") ? \"w-full max-w-none flex-1 xl:col-span-2 self-stretch\" : \"hidden\"}>\n' + unsplashCode + '\n</div>';
content = content.replace(unPlaceholder, unReplacement);

let passPlaceStart = lines.findIndex(l => l.includes('isControlSectionVisible(\"password-update\")'));
let passPlaceEnd = lines.findIndex((l, i) => i > passPlaceStart && l.includes('</Card>') && lines[i+1] && lines[i+1].trim() === '</div>');
let passPlaceholder = lines.slice(passPlaceStart, passPlaceEnd + 2).join('\n');
let passReplacement = '<div className={isControlSectionVisible(\"password-update\") ? \"w-full max-w-none flex-1 xl:col-span-2 self-stretch\" : \"hidden\"}>\n' + securityCode + '\n</div>';
content = content.replace(passPlaceholder, passReplacement);

let setStart = content.indexOf('{activeTab === \"settings\" && (');
let setEnd = content.indexOf(')}', setStart);
let sectionToDel = content.substring(setStart, setEnd + 2);
content = content.replace(sectionToDel, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Success');

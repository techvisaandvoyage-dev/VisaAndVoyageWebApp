const fs = require('fs');
const file = 'c:/Users/yashr/OneDrive/Desktop/Projects/Meraki Movies/VB/admin/src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const razorpayStart = content.indexOf('              <SettingsSectionCard\n                title="Payments - Razorpay"');
const razorpayEnd = content.indexOf('              </SettingsSectionCard>', razorpayStart) + '              </SettingsSectionCard>'.length;
const razorpayBlock = content.substring(razorpayStart, razorpayEnd);

const unsplashStart = content.indexOf('              <SettingsSectionCard\n                title="Country images - Unsplash"');
const unsplashEnd = content.indexOf('              </SettingsSectionCard>', unsplashStart) + '              </SettingsSectionCard>'.length;
const unsplashBlock = content.substring(unsplashStart, unsplashEnd);

// Delete the original blocks
// Determine which one comes first to avoid index shifting problems, or just delete from the end.
// We know Razorpay comes first.
if (razorpayStart < unsplashStart) {
  content = content.substring(0, unsplashStart) + content.substring(unsplashEnd + 1);
  content = content.substring(0, razorpayStart) + content.substring(razorpayEnd + 1);
}

// Create the new wrappers
const newUnsplash = '              <div className={isControlSectionVisible("country-images") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>\n' +
unsplashBlock + '\n              </div>';

const newRazorpay = '              <div className={isControlSectionVisible("payments-razorpay") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>\n' +
razorpayBlock + '\n              </div>';

// Replace Unsplash placeholder
const uStartStr = '              <div className={isControlSectionVisible("country-images") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>';
const uEndStr = 'Unsplash image integration coming soon!\n                  </div>\n                </Card>\n              </div>';
const uStartIdx = content.indexOf(uStartStr);
const uEndIdx = content.indexOf(uEndStr, uStartIdx) + uEndStr.length;
const uPlaceholder = content.substring(uStartIdx, uEndIdx);
content = content.replace(uPlaceholder, newUnsplash);

// Replace Razorpay placeholder
const rStartStr = '              <div className={isControlSectionVisible("payments-razorpay") ? "w-full max-w-none flex-1 xl:col-span-2 self-stretch" : "hidden"}>';
const rEndStr = 'Razorpay configuration coming soon!\n                  </div>\n                </Card>\n              </div>';
const rStartIdx = content.indexOf(rStartStr);
const rEndIdx = content.indexOf(rEndStr, rStartIdx) + rEndStr.length;
const rPlaceholder = content.substring(rStartIdx, rEndIdx);
content = content.replace(rPlaceholder, newRazorpay);

fs.writeFileSync(file, content);

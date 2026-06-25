const fs = require('fs');
const file = 'admin/src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find and remove Unsplash tail
let unIdx = content.indexOf('Unsplash image integration coming soon!');
if (unIdx !== -1) {
  let divStart = content.lastIndexOf('</div>', unIdx);
  // Find the closing </div> of that orphaned block
  let divEnd = content.indexOf('</div>', content.indexOf('</Card>', unIdx));
  let toRemove = content.substring(divStart, divEnd + 6);
  content = content.replace(toRemove, '');
}

// Find and remove Razorpay tail
let rzIdx = content.indexOf('Razorpay configuration coming soon!');
if (rzIdx !== -1) {
  let divStart = content.lastIndexOf('</div>', rzIdx);
  let divEnd = content.indexOf('</div>', content.indexOf('</Card>', rzIdx));
  let toRemove = content.substring(divStart, divEnd + 6);
  content = content.replace(toRemove, '');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Success');

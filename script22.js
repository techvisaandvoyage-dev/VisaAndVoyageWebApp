const fs = require('fs');
let content = fs.readFileSync('admin/src/pages/Dashboard.jsx', 'utf8');
const lines = content.split('\n');

// Find the start of the orphaned block
let startIdx = lines.findIndex((l, i) => l.includes('id=\"setting-razorpay-key\"') && i > 10400);
if (startIdx !== -1) {
  // we want to delete from startIdx down to the closing )} of that block.
  let endIdx = lines.findIndex((l, i) => l.includes(')}') && i > startIdx && i < 10650);
  console.log('Start:', startIdx, 'End:', endIdx);
  lines.splice(startIdx, endIdx - startIdx + 1);
  fs.writeFileSync('admin/src/pages/Dashboard.jsx', lines.join('\n'), 'utf8');
} else {
  console.log('Not found');
}

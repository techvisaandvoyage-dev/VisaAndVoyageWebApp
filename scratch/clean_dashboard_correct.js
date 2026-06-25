const fs = require('fs');
const path = require('path');

const filePath = "c:\\Users\\yashr\\OneDrive\\Desktop\\Projects\\Meraki Movies\\VB\\admin\\src\\pages\\Dashboard.jsx";
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(/\r?\n/);

console.log('Original total lines:', lines.length);

// Find the start of the orphaned section (must be after line 10000)
let startIdx = -1;
for (let i = 10000; i < lines.length; i++) {
  if (lines[i].includes('id="setting-razorpay-secret"')) {
    startIdx = i;
    break;
  }
}

if (startIdx === -1) {
  console.error('Could not find orphaned start index after line 10000!');
  process.exit(1);
}

// Find the end of the orphaned section
const endIdx = lines.findIndex(line => line.includes('COUNTRIES WITH BANNER (UNSPLASH / UPLOADS)'));
if (endIdx === -1) {
  console.error('Could not find end index!');
  process.exit(1);
}

console.log('Orphan start line index (0-indexed):', startIdx, 'Content:', lines[startIdx]);
console.log('Orphan end line index (0-indexed):', endIdx, 'Content:', lines[endIdx]);

// We want to delete from the start of the orphaned inputs/cards.
// Let's trace back a bit to see if there are empty lines before startIdx that we should clean up,
// or if we should delete starting exactly at the line with `id="setting-razorpay-secret"` but wait:
// Let's see what is right before startIdx.
// Usually, it's:
//           {activeTab === "seo" && (
//             ...
//           )}
//
//           
//                     id="setting-razorpay-secret"
// So the lines between `)}` (for seo tab) and `id="setting-razorpay-secret"` are just whitespace/empty.
// Let's start deletion from the line after `)}` of the SEO tab.
let deleteStart = startIdx;
while (deleteStart > 0 && lines[deleteStart - 1].trim() === '') {
  deleteStart--;
}

// We want to delete up to the line right before the banner comment.
const deleteEnd = endIdx;

console.log('Deleting from line', deleteStart + 1, 'to line', deleteEnd);
console.log('First deleted line:', lines[deleteStart]);
console.log('Last deleted line:', lines[deleteEnd - 1]);

const keptLinesBefore = lines.slice(0, deleteStart);
const keptLinesAfter = lines.slice(deleteEnd);

const newContent = keptLinesBefore.concat(keptLinesAfter).join(originalLineEndings);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully cleaned Dashboard.jsx. New total lines:', keptLinesBefore.length + keptLinesAfter.length);

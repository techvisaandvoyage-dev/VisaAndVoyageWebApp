const fs = require('fs');
const path = require('path');

const filePath = "c:\\Users\\yashr\\OneDrive\\Desktop\\Projects\\Meraki Movies\\VB\\admin\\src\\pages\\Dashboard.jsx";
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for consistent processing
const originalLineEndings = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(/\r?\n/);

console.log('Original total lines:', lines.length);

// Find the start of the orphaned section
const startIdx = lines.findIndex(line => line.includes('id="setting-razorpay-secret"'));
if (startIdx === -1) {
  console.error('Could not find start index!');
  process.exit(1);
}

// Find the end of the orphaned section (which is right before the banner comment)
const endIdx = lines.findIndex(line => line.includes('COUNTRIES WITH BANNER (UNSPLASH / UPLOADS)'));
if (endIdx === -1) {
  console.error('Could not find end index!');
  process.exit(1);
}

console.log('Start index of orphan (0-indexed):', startIdx, 'Line content:', lines[startIdx]);
console.log('End index (0-indexed):', endIdx, 'Line content:', lines[endIdx]);

// The line immediately preceding startIdx (line 10462) is empty/whitespace. Let's start deletion from there.
// We want to delete up to the line before the comment (which has the closing braces).
// Let's trace back from endIdx to find the closing braces.
let deleteStart = startIdx;
while (deleteStart > 0 && lines[deleteStart - 1].trim() === '') {
  deleteStart--;
}

let deleteEnd = endIdx;
while (deleteEnd > deleteStart && !lines[deleteEnd - 1].includes(')')) {
  deleteEnd--;
}
// We want to delete up to deleteEnd.
console.log('Deleting from line', deleteStart + 1, 'to line', deleteEnd);
console.log('First deleted line:', lines[deleteStart]);
console.log('Last deleted line:', lines[deleteEnd - 1]);

const keptLinesBefore = lines.slice(0, deleteStart);
const keptLinesAfter = lines.slice(deleteEnd);

const newContent = keptLinesBefore.concat(keptLinesAfter).join(originalLineEndings);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully updated Dashboard.jsx. New total lines:', keptLinesBefore.length + keptLinesAfter.length);

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin/src/pages/Dashboard.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find a snippet that has the bad characters
const badSnippetIndex = content.indexOf('→');
if (badSnippetIndex !== -1) {
  console.log("Original (bad):", content.substring(badSnippetIndex - 20, badSnippetIndex + 20));
} else {
  console.log("No → found.");
}

const buffer = Buffer.from(content, 'latin1');
const fixedContent = buffer.toString('utf8');

const fixedSnippetIndex = fixedContent.indexOf('→');
if (fixedSnippetIndex !== -1) {
  console.log("Fixed:", fixedContent.substring(fixedSnippetIndex - 20, fixedSnippetIndex + 20));
} else {
  console.log("No → found in fixed content.");
}

// Check for ₹ (Rupee)
const badRupeeIndex = content.indexOf('₹');
if (badRupeeIndex !== -1) {
  console.log("Original Rupee (bad):", content.substring(badRupeeIndex - 20, badRupeeIndex + 20));
}

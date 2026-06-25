const fs = require('fs');
let content = fs.readFileSync('client/src/pages/CountryDetails.jsx', 'utf8');

// 1. SUB_NAV replacement
content = content.replace(
  '{ id: "how-it-works", label: "How it works" },',
  '...(countryDisplay?.showHowItWorks !== false ? [{ id: "how-it-works", label: "How it works" }] : []),'
);
content = content.replace(
  '...(countryDisplay?.showRequiredDocuments !== false\n          ? [{ id: "document-requirements", label: "Document Requirements" }]\n          : []),',
  '...(countryDisplay?.showRequiredDocuments !== false && countryDisplay?.showDestinationDocuments !== false\n          ? [{ id: "document-requirements", label: "Document Requirements" }]\n          : []),'
);
content = content.replace(
  '{ id: "why-book-now", label: "Why book now?" },',
  '...(countryDisplay?.showWhyBookNow !== false ? [{ id: "why-book-now", label: "Why book now?" }] : []),'
);
content = content.replace(
  '{ id: "whats-included", label: "What\'s Included" },',
  '...(countryDisplay?.showWhatsIncluded !== false ? [{ id: "whats-included", label: "What\'s Included" }] : []),'
);
content = content.replace(
  '{ id: "faqs", label: "FAQs" },',
  '...(countryDisplay?.showFaqs !== false ? [{ id: "faqs", label: "FAQs" }] : []),'
);

// 2. Sections
// how-it-works
content = content.replace(
  /<motion\.section\s+id="how-it-works"/g,
  '{countryDisplay?.showHowItWorks !== false && (\n      <motion.section\n        id="how-it-works"'
);
content = content.replace(
  /<\/ol>\s*<\/motion\.section>/g,
  '</ol>\n      </motion.section>\n      )}'
);

// document-requirements
content = content.replace(
  /{countryDisplay\?\.showRequiredDocuments !== false && \(\s*<motion\.section\s+id="document-requirements"/g,
  '{countryDisplay?.showRequiredDocuments !== false && countryDisplay?.showDestinationDocuments !== false && (\n        <motion.section\n          id="document-requirements"'
);

// why-book-now
content = content.replace(
  /<motion\.section id="why-book-now"/g,
  '{countryDisplay?.showWhyBookNow !== false && (\n      <motion.section id="why-book-now"'
);
content = content.replace(
  /<\/div>\s*<\/div>\s*<\/motion\.section>/g,
  '</div>\n          </div>\n      </motion.section>\n      )}'
);

// whats-included
content = content.replace(
  /<motion\.section\s+id="whats-included"/g,
  '{countryDisplay?.showWhatsIncluded !== false && (\n      <motion.section\n        id="whats-included"'
);
content = content.replace(
  /<\/div>\s*<\/motion\.section>/g,
  '</div>\n      </motion.section>\n      )}'
);

// faqs
content = content.replace(
  /<motion\.section\s+id="faqs"/g,
  '{countryDisplay?.showFaqs !== false && (\n      <motion.section\n        id="faqs"'
);
// faqs closing
content = content.replace(
  /<\/div>\s*<\/motion\.section>\s*<\/>/g,
  '</div>\n      </motion.section>\n      )}\n    </>'
);

fs.writeFileSync('client/src/pages/CountryDetails.jsx', content);
console.log('Done!');

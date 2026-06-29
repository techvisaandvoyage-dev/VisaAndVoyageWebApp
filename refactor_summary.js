const fs = require('fs');
let code = fs.readFileSync('client/src/pages/ApplicationSummaryPage.jsx', 'utf8');

// Generalize buildTravelerPassportSuccessMap
code = code.replace(
  /const buildTravelerPassportSuccessMap = \(\{ application, summaryData, uploadSuccesses, travelerCount \}\) => \{/g,
  'const buildTravelerDocSuccessMap = ({ application, summaryData, uploadSuccesses, travelerCount, requiredDocs = ["passport"] }) => {'
);
code = code.replace(
  /Array\.from\(\{ length: travelerCount \}\)\.forEach\(\(\_, index\) => \{[\s\S]*?if \(hasUploadedPassport\(travelerEntry\)\) \{[\s\S]*?merged\[\\$\{travelerNo\}-passport\\] = true;[\s\S]*?\}[\s\S]*?\}\);/g,
  Array.from({ length: travelerCount }).forEach((_, index) => {
    const travelerNo = index + 1;
    const travelerEntry = Array.isArray(application?.travellerDocuments)
      ? application.travellerDocuments.find((entry) => Number(entry?.travelerNo) === travelerNo)
      : null;
    requiredDocs.forEach(docKey => {
      if (merged[\\-\\]) return;
      const docs = travelerEntry?.documents;
      let hasDoc = false;
      if (docs instanceof Map) hasDoc = Boolean(docs.get(docKey));
      else if (typeof docs?.get === "function") hasDoc = Boolean(docs.get(docKey));
      else if (typeof docs === "object") hasDoc = Boolean(docs[docKey]);
      if (hasDoc) {
        merged[\\-\\] = true;
      }
    });
  });
);

// Generalize getTravelerPassportDetail
code = code.replace(
  /const getTravelerPassportDetail = \(application, travelerNo\) => \{/g,
  'const getTravelerDocDetail = (application, travelerNo, docKey = "passport") => {'
);
code = code.replace(/docs\.get\("passport"\)/g, 'docs.get(docKey)');
code = code.replace(/docs\?\.passport/g, 'docs?.[docKey]');
code = code.replace(/details\.get\("passport"\)/g, 'details.get(docKey)');
code = code.replace(/details\?\.passport/g, 'details?.[docKey]');

code = code.replace(
  /const getTravelerPassportDetailFromSummaryData = \(summaryData, travelerNo\) => \{/g,
  'const getTravelerDocDetailFromSummaryData = (summaryData, travelerNo, docKey = "passport") => {'
);
code = code.replace(
  /const getTravelerPassportDetailForSummary = \(application, summaryData, travelerNo\) =>[\s\S]*?getTravelerPassportDetailFromSummaryData\(summaryData, travelerNo\);/g,
  const getTravelerDocDetailForSummary = (application, summaryData, travelerNo, docKey = "passport") =>
  getTravelerDocDetail(application, travelerNo, docKey) ||
  getTravelerDocDetailFromSummaryData(summaryData, travelerNo, docKey);
);

// Replace usages
code = code.replace(/buildTravelerPassportSuccessMap/g, 'buildTravelerDocSuccessMap');
code = code.replace(/getTravelerPassportDetailForSummary/g, 'getTravelerDocDetailForSummary');

// Inside component: pass requiredDocs
code = code.replace(
  /useMemo\([\s\S]*?buildTravelerDocSuccessMap\(\{[\s\S]*?travelerCount,[\s\S]*?\}\),/g,
  useMemo(
    () =>
      buildTravelerDocSuccessMap({
        application,
        summaryData,
        uploadSuccesses,
        travelerCount,
        requiredDocs: country?.requiredDocuments || ["passport"],
      }),
);

fs.writeFileSync('client/src/pages/ApplicationSummaryPage.jsx', code);
console.log("Refactored phase 1 successfully");

const fs = require('fs');
const path = require('path');

const replacements = {
  '→': '→',
  '—': '—',
  '₹': '₹',
  '’': '’',
  '‘': '‘',
  '“': '“',
  '”': '”',
  '•': '•',
  '…': '…',
  '–': '–',
  '”': '”' // fallback
};

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory() && name !== 'node_modules' && name !== '.git') {
            walkSync(filePath, callback);
        }
    });
}

let totalFixed = 0;

walkSync(__dirname, function(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.md')) return;
    
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch(e) { return; }
    
    let matchCount = 0;
    for (const [bad, good] of Object.entries(replacements)) {
      const regex = new RegExp(bad, 'g');
      const count = (content.match(regex) || []).length;
      if (count > 0) {
        content = content.replace(regex, good);
        matchCount += count;
      }
    }

    if (matchCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${matchCount} encoding errors in ${filePath}`);
      totalFixed += matchCount;
    }
});

console.log(`Total encoding errors fixed: ${totalFixed}`);

const fs = require('fs');
const path = require('path');

const srcDir = __dirname;

const replacements = [
  { regex: /#7c3aed/gi, replace: '#22c55e' }, // primary
  { regex: /#6d28d9/gi, replace: '#16a34a' }, // primary-hover
  { regex: /#ec4899/gi, replace: '#4ade80' }, // accent
  { regex: /#db2777/gi, replace: '#15803d' }, // accent-dark
  { regex: /#f43f5e/gi, replace: '#4ade80' }, // secondary accent hover
  { regex: /Purple-Pink/gi, replace: 'Leaf Green-White' },
  { regex: /purple/gi, replace: 'green' },
  { regex: /Pink/g, replace: 'White' },
  { regex: /pink/g, replace: 'white' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      if (file === 'replace_colors.js') continue;
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      for (const rule of replacements) {
        newContent = newContent.replace(rule.regex, rule.replace);
      }
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Done.');

const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('uppercase')) {
        // Simple regex to remove the exact word uppercase surrounded by word boundaries
        content = content.replace(/\buppercase\b/g, '');
        // Clean up double spaces that might be left
        content = content.replace(/ \s+/g, ' '); 
        content = content.replace(/\" /g, '\"');
        content = content.replace(/\' /g, '\'');
        content = content.replace(/\` /g, '\`');
        content = content.replace(/ \`/g, '\`');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('./src');
console.log('Done removing uppercase classes.');

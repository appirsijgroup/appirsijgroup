const fs = require('fs');
const path = require('path');

function getAllFiles(dir, extensions) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.startsWith('.')) {
      files = files.concat(getAllFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Remove console.log, console.info, console.debug, console.warn (but not console.error)
  // This pattern handles multi-line console statements by using [\s\S]*? (non-greedy match of any char including newlines)
  content = content.replace(/console\.(log|info|debug|warn)\s*\([\s\S]*?\);?\s*\n?/g, '');

  // Clean up multiple empty lines (more than 2 consecutive)
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  // Remove empty lines at end of file
  content = content.replace(/\s+$/, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Main execution
console.log('Removing all console logs from source code...\n');

const srcDir = path.join(__dirname, 'src');
const files = getAllFiles(srcDir, ['.ts', '.tsx']);

console.log(`Found ${files.length} TypeScript files\n`);

let modifiedCount = 0;
files.forEach(file => {
  const relativePath = path.relative(__dirname, file);
  if (removeConsoleLogs(file)) {
    console.log(`Cleaned: ${relativePath}`);
    modifiedCount++;
  }
});

console.log(`\nCompleted! ${modifiedCount} files modified`);
console.log(`You can now run: npm run build\n`);

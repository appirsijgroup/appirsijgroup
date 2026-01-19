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

  // Remove ALL console statements: log, error, warn, debug, info
  const lines = content.split('\n');
  const filteredLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip lines that contain only console calls (not wrapped in if statements)
    const consoleRegex = /^\s*console\.(log|error|warn|debug|info)\s*\(/;

    if (consoleRegex.test(line)) {
      // Check if this is part of a development check
      const prevLine = i > 0 ? lines[i - 1] : '';
      if (prevLine.includes('process.env.NODE_ENV') || prevLine.includes('process.env.NODE_ENV') !== -1) {
        // Keep this line, it's wrapped in a development check
        filteredLines.push(line);
      } else {
        // Remove this line
        // Also check if the next lines are part of the same console statement
        let openParens = (line.match(/\(/g) || []).length;
        let closeParens = (line.match(/\)/g) || []).length;
        let j = i + 1;

        // Skip continuation lines until we find the closing semicolon
        while (j < lines.length && openParens > closeParens) {
          const nextLine = lines[j];
          openParens += (nextLine.match(/\(/g) || []).length;
          closeParens += (nextLine.match(/\)/g) || []).length;
          j++;
        }

        // Also skip the line with the closing semicolon/paren
        i = j - 1;
      }
    } else {
      filteredLines.push(line);
    }
    i++;
  }

  content = filteredLines.join('\n');

  // Clean up multiple empty lines (more than 2 consecutive)
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Main execution
console.log('🧹 Removing ALL console statements (log, error, warn, debug, info)...\n');

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

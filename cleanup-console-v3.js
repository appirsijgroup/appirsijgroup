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

function removeConsoleStatements(content) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Patterns to match various console statement forms:
    // 1. Standalone: console.log(...)
    // 2. Dev-wrapped: if (process.env.NODE_ENV === 'development') console.log(...)
    // 3. Conditional: if (condition) console.log(...)
    // 4. Try-catch: } catch (e) { console.error(...); }
    // 5. Console methods: log, error, warn, debug, info, time, timeEnd, table, trace, assert

    const patterns = [
      // Standalone console statements
      /^console\.(log|error|warn|debug|info|time|timeEnd|table|trace|assert)\s*\(/,

      // Development-wrapped console statements
      /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*["']development["']\s*\)\s*console\.(log|error|warn|debug|info|time|timeEnd|table|trace|assert)\s*\(/,

      // Conditional console statements (one-line if)
      /if\s*\([^)]+\)\s*console\.(log|error|warn|debug|info|time|timeEnd|table|trace|assert)\s*\(/,

      // Console in catch block
      /}\s*catch\s*\([^)]*\)\s*\{\s*console\.(log|error|warn|debug|info)\s*\(/,

      // Console assignment (console.log = function(){})
      /console\.(log|error|warn|info|debug)\s*=\s*(function|\()/,

      // Store console.error reference
      /const\s+\w+\s*=\s*console\.(error|log)/,
    ];

    let matches = false;
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        matches = true;
        break;
      }
    }

    if (matches) {
      // This is a console statement, skip it
      // Check if it spans multiple lines
      let openCount = (line.match(/\(/g) || []).length;
      let closeCount = (line.match(/\)/g) || []).length;
      let openBrace = (line.match(/\{/g) || []).length;
      let closeBrace = (line.match(/\}/g) || []).length;
      let j = i + 1;

      // Skip continuation lines
      while (j < lines.length && (openCount > closeCount || openBrace > closeBrace)) {
        const nextLine = lines[j];
        openCount += (nextLine.match(/\(/g) || []).length;
        closeCount += (nextLine.match(/\)/g) || []).length;
        openBrace += (nextLine.match(/\{/g) || []).length;
        closeBrace += (nextLine.match(/\}/g) || []).length;
        j++;
      }

      // Move to next line after the console statement
      i = j;
      continue;
    }

    // Keep non-console lines
    result.push(line);
    i++;
  }

  // Clean up excessive blank lines (more than 2)
  let cleaned = result.join('\n').replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

function main() {
  console.log('🧹 Removing ALL console statements (log, error, warn, debug, info)...\n');

  const srcDir = path.join(__dirname, 'src');
  const files = getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);

  console.log(`Found ${files.length} files\n`);

  let modifiedCount = 0;
  let totalRemoved = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      // Count console statements before
      const beforeMatches = content.match(/console\.(log|error|warn|debug|info)/g) || [];

      if (beforeMatches.length > 0) {
        const cleaned = removeConsoleStatements(content);

        // Count console statements after
        const afterMatches = cleaned.match(/console\.(log|error|warn|debug|info)/g) || [];
        const removed = beforeMatches.length - afterMatches.length;

        if (cleaned !== originalContent) {
          fs.writeFileSync(file, cleaned, 'utf8');
          modifiedCount++;
          totalRemoved += removed;

          const relativePath = path.relative(__dirname, file);
          console.log(`✓ ${relativePath}: removed ${removed} console statement(s)`);
        }
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   - Files modified: ${modifiedCount}`);
  console.log(`   - Console statements removed: ${totalRemoved}`);
  console.log(`   - Total files processed: ${files.length}\n`);
}

main();

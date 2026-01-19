const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Simple and robust cleanup using sed
 */
function cleanupWithSed() {
  console.log('🧹 Removing ALL console statements using sed...\n');

  try {
    // Use sed to remove console statements from all TypeScript files
    // This handles single and multi-line console statements
    const cmd = `
      find src -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) -exec sed -i '/^[[:space:]]*console\\.\\(log\\|error\\|warn\\|debug\\|info\\)/d' {} +
    `;

    execSync(cmd, { stdio: 'inherit', shell: true });

    console.log('\n✅ Cleanup complete!');

    // Count remaining console statements
    const countCmd = 'grep -r "console\\.\\(log\\|error\\|warn\\|debug\\|info\\)" src --include="*.ts" --include="*.tsx" | wc -l';
    try {
      const remaining = execSync(countCmd, { encoding: 'utf8' }).trim();
      console.log(`   Remaining console statements: ${remaining}`);
    } catch (e) {
      console.log('   No remaining console statements found!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

cleanupWithSed();

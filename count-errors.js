const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Menghitung ESLint Errors...\n');

try {
    const eslintOutput = execSync('npx eslint "src/**/*.tsx" "src/**/*.ts" --format json', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000
    });

    const data = JSON.parse(eslintOutput);

    const totalErrors = data.reduce((sum, f) => sum + f.messages.length, 0);
    const byRule = {};

    data.forEach(file => {
        file.messages.forEach(msg => {
            const rule = msg.ruleId || 'unknown';
            byRule[rule] = (byRule[rule] || 0) + 1;
        });
    });

    console.log('📊 Total ESLint Errors:', totalErrors);
    console.log('\n🔝 Top 15 Error Categories:\n');

    Object.entries(byRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([rule, count], index) => {
            console.log(`  ${(index + 1).toString().padStart(2)}. ${rule}: ${count}`);
        });

    console.log(`\n${'='.repeat(60)}\n`);

} catch (error) {
    console.error('❌ Error running ESLint:', error.message);
    process.exit(1);
}

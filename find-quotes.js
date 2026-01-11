const fs = require('fs');
const path = require('path');

// Files to check
const filesToCheck = [
    'src/components/Alquran.tsx',
    'src/components/Bookmarks.tsx',
    'src/components/MenteeGuidanceView.tsx',
    'src/components/MentorDashboard.tsx',
    'src/components/Pengaturan.tsx',
];

console.log('🔍 Searching for unescaped quotes in JSX...\n');

filesToCheck.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    console.log(`\n📄 ${filePath}:`);

    let found = false;
    lines.forEach((line, index) => {
        // Look for patterns like: <tag>..."text"...</tag> or <tag>...'text'...</tag>
        // But NOT attributes (things with =)
        const lineNum = index + 1;

        // Check for quotes in JSX content (not attributes)
        // Pattern 1: >"something"<
        if (/>[^<>]*"[^<>]*</.test(line)) {
            console.log(`  Line ${lineNum}: Found quote: ${line.trim().substring(0, 80)}`);
            found = true;
        }
        // Pattern 2: >'something'<
        if (/>[^<>]*'[^<>]*</.test(line)) {
            console.log(`  Line ${lineNum}: Found apostrophe: ${line.trim().substring(0, 80)}`);
            found = true;
        }
    });

    if (!found) {
        console.log(`  ℹ️  No obvious unescaped quotes found`);
    }
});

console.log('\n✨ Done! Review the output above to identify lines that need fixing.');

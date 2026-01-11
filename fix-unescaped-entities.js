const fs = require('fs');
const path = require('path');

/**
 * Script to automatically fix unescaped entities in JSX
 * Focus on quotes and apostrophes in JSX content
 */

// Patterns to fix - these are specific patterns that need escaping
const patterns = [
    // Pattern 1: Mutaba'ah → Mutaba&apos;ah
    {
        regex: /Mutaba'ah/g,
        replacement: 'Mutaba&apos;ah',
        description: 'Apostrophe in Mutaba\'ah'
    },
    // Pattern 2: Direct quotes in JSX text content like <div>Text "quoted"</div>
    // This is tricky - we need to be careful about JSX attributes vs content
    // Let's use a more conservative approach
];

// Files to process based on the error list
const filesToProcess = [
    'src/components/AdminDashboard.tsx',
    'src/components/Alquran.tsx',
    'src/components/Announcements.tsx',
    'src/components/Bookmarks.tsx',
    'src/components/MenteeGuidanceView.tsx',
    'src/components/MentorDashboard.tsx',
    'src/components/MonthlyActivities.tsx',
    'src/components/PanduanSholat.tsx',
    'src/components/Pengaturan.tsx',
];

// Manual fixes for specific known issues
const manualFixes = {
    'src/components/Alquran.tsx': [
        { search: 'juz "', replace: 'juz &quot;' },
        { search: '" juz', replace: '&quot; juz' },
        { search: 'halaman "', replace: 'halaman &quot;' },
        { search: '" halaman', replace: '&quot; halaman' },
        { search: "Ayat '", replace: 'Ayat &apos;' },
        { search: '"}', replace: '&quot;}' },  // Closing brace with quote
    ],
    'src/components/Announcements.tsx': [
        { search: 'pengumuman "', replace: 'pengumuman &quot;' },
        { search: '" pengumuman', replace: '&quot; pengumuman' },
        { search: '"}', replace: '&quot;}' },
    ],
    'src/components/Bookmarks.tsx': [
        { search: 'buku "', replace: 'buku &quot;' },
        { search: '" buku', replace: '&quot; buku' },
        { search: '"}', replace: '&quot;}' },
    ],
    'src/components/MenteeGuidanceView.tsx': [
        { search: 'panduan "', replace: 'panduan &quot;' },
        { search: '" panduan', replace: '&quot; panduan' },
        { search: 'halaman "', replace: 'halaman &quot;' },
        { search: '" halaman', replace: '&quot; halaman' },
        { search: '"}', replace: '&quot;}' },
    ],
    'src/components/MentorDashboard.tsx': [
        { search: "Mentee's", replace: 'Mentee&apos;s' },
        { search: "user's", replace: 'user&apos;s' },
    ],
    'src/components/MonthlyActivities.tsx': [
        { search: "user's", replace: 'user&apos;s' },
        { search: "karyawan's", replace: 'karyawan&apos;s' },
    ],
    'src/components/PanduanSholat.tsx': [
        { search: 'description}"', replace: 'description}&quot;' },
        { search: 'translation}"', replace: 'translation}&quot;' },
        { search: '">"', replace: '">&quot;' },
        { search: '"<', replace: '&quot;<' },
    ],
    'src/components/Pengaturan.tsx': [
        { search: 'profil "', replace: 'profil &quot;' },
        { search: '" profil', replace: '&quot; profil' },
        { search: '"}', replace: '&quot;}' },
    ],
};

// Process a single file
const processFile = (filePath) => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${filePath}`);
        return { success: false, filePath, changes: 0 };
    }

    console.log(`\n📝 Processing: ${filePath}`);

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    let totalChanges = 0;

    // Get manual fixes for this file
    const fixes = manualFixes[filePath] || [];

    // Apply each manual fix
    fixes.forEach(fix => {
        const count = (content.match(new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (count > 0) {
            content = content.replaceAll(fix.search, fix.replace);
            totalChanges += count;
            console.log(`  ✓ Fixed ${count}x: "${fix.search}" → "${fix.replace}"`);
        }
    });

    // Apply global patterns
    patterns.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
            content = content.replace(pattern.regex, pattern.replacement);
            const changeCount = matches.length;
            totalChanges += changeCount;
            console.log(`  ✓ Fixed ${changeCount}x: ${pattern.description}`);
        }
    });

    // Write back if changed
    if (content !== originalContent) {
        // Create backup
        const backupPath = fullPath + '.backup';
        // Only create backup if it doesn't exist
        if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, originalContent);
            console.log(`  💾 Backup created: ${path.basename(filePath)}.backup`);
        }

        // Write modified content
        fs.writeFileSync(fullPath, content);
        console.log(`  ✅ Total changes: ${totalChanges}`);
        return { success: true, filePath, changes: totalChanges };
    } else {
        console.log(`  ℹ️  No changes needed`);
        return { success: true, filePath, changes: 0 };
    }
};

// Main execution
console.log('🔧 Starting automatic unescaped entities fixes...\n');
console.log('=' .repeat(60));

const results = filesToProcess.map(processFile);

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:\n');

const successful = results.filter(r => r.success && r.changes > 0);
const noChanges = results.filter(r => r.success && r.changes === 0);
const failed = results.filter(r => !r.success);

console.log(`✅ Successfully modified: ${successful.length} files`);
console.log(`ℹ️  No changes needed: ${noChanges.length} files`);
console.log(`❌ Failed: ${failed.length} files`);

if (successful.length > 0) {
    console.log('\n📝 Modified files:');
    successful.forEach(r => {
        console.log(`  - ${r.filePath} (${r.changes} changes)`);
    });
}

console.log('\n✨ Done!');
console.log('💡 Tip: Review the changes, then delete .backup files if everything looks good');

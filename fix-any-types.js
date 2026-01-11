const fs = require('fs');
const path = require('path');

/**
 * Script to automatically fix common `any` type usage
 * Focus on the most common patterns found in error.md
 */

// Map of file paths to their patterns
const patterns = [
    // Pattern 1: const result: any = await importUsers(file)
    {
        regex: /const result: any = await importUsers\(file\);/g,
        replacement: 'const result: ImportUsersResult = await importUsers(file);',
        description: 'API response from importUsers'
    },
    // Pattern 2: failed: { record: any, reason: string }[]
    {
        regex: /failed: \{ record: any, reason: string \}\[\]/g,
        replacement: 'failed: FailedOperationRecord[]',
        description: 'Failed operation records'
    },
    // Pattern 3: failed: { record: any, reason: string }[]; (with semicolon)
    {
        regex: /failed: \{ record: any, reason: string \}\[];/g,
        replacement: 'failed: FailedOperationRecord[];',
        description: 'Failed operation records with semicolon'
    },
    // Pattern 4: Promise<{ ... failed: { record: any, reason: string }[] }>
    {
        regex: /Promise<\{([^}]*failed: \{ record: any, reason: string \}\[\][^}]*)\}>/g,
        replacement: (match) => {
            return match.replace(/failed: \{ record: any, reason: string \}\[]/g, 'failed: FailedOperationRecord[]');
        },
        description: 'Promise with failed records'
    },
    // Pattern 5: catch (error: any)
    {
        regex: /catch \(error: any\)/g,
        replacement: 'catch (error: unknown)',
        description: 'Error catch blocks (error)'
    },
    // Pattern 6: catch (err: any) - more common
    {
        regex: /catch \(err: any\)/g,
        replacement: 'catch (err: unknown)',
        description: 'Error catch blocks (err)'
    },
    // Pattern 7: catch (geoError: any)
    {
        regex: /catch \(geoError: any\)/g,
        replacement: 'catch (geoError: unknown)',
        description: 'Geolocation error catch'
    },
    // Pattern 8: useState<{ ... failed: { record: any, reason: string }[] } | null>
    {
        regex: /useState<\{([^}]*failed: \{ record: any, reason: string \}\[\][^}]*)\} \| null>/g,
        replacement: (match) => {
            return match.replace(/failed: \{ record: any, reason: string \}\[]/g, 'failed: FailedOperationRecord[]');
        },
        description: 'useState with failed records'
    },
    // Pattern 9: } as any;
    {
        regex: /\} as any;/g,
        replacement: '} as unknown;',
        description: 'Type assertion as any'
    },
];

// Files to process
const filesToProcess = [
    'src/components/AdminDashboard.tsx',
    'src/components/AttendanceModal.tsx',
    'src/components/JadwalSholat.tsx',
    'src/components/Login.tsx',
    'src/components/MentorDashboard.tsx',
    'src/components/migrations.ts',
    'src/components/MyDashboard.tsx',
    'src/components/Persetujuan.tsx',
    'src/components/PresensiComponent.tsx',
    'src/components/PresensiSimple.tsx',
    'src/components/RapotView.tsx',
    'src/components/ReportGenerator.tsx',
    'src/containers/DashboardContainer.tsx',
    'src/contexts/AppContext.tsx',
];

// Ensure imports are added
const ensureImports = (content, filePath) => {
    const needsImportTypes = [
        'ImportUsersResult',
        'FailedOperationRecord',
        'BulkOperationResult',
        'BulkOperationResultWithError'
    ];

    const usedTypes = needsImportTypes.filter(type => content.includes(type));

    if (usedTypes.length === 0) return content;

    // Check if file already imports from types
    const hasTypesImport = content.includes('from \'../types\'') || content.includes('from "../types"') ||
                           content.includes('from \'../../types\'') || content.includes('from "../../types"') ||
                           content.includes('from \'../types\'') || content.includes('from "../types"');

    if (!hasTypesImport) {
        // Find the last import line
        const importRegex = /^import .+;$/gm;
        const imports = content.match(importRegex);

        if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            const lastImportIndex = content.lastIndexOf(lastImport);
            const insertIndex = lastImportIndex + lastImport.length;

            // Determine import path based on file location
            let importPath = '../types';
            if (filePath.includes('src/containers/') || filePath.includes('src/contexts/')) {
                importPath = '../types';
            } else if (filePath.includes('src/components/')) {
                importPath = '../types';
            }

            const importStatement = `\nimport { ${usedTypes.join(', ')} } from '${importPath}';`;

            content = content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
        }
    } else {
        // Update existing import to include new types
        const typesImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"](.*\/types)['"]/;
        const match = content.match(typesImportRegex);

        if (match) {
            const existingTypesStr = match[1];
            const existingTypes = existingTypesStr.split(',').map(t => t.trim()).filter(t => t);
            const newTypes = usedTypes.filter(t => !existingTypes.includes(t));

            if (newTypes.length > 0) {
                const allTypes = [...existingTypes, ...newTypes].join(', ');
                const newImport = `import { ${allTypes} } from "${match[2]}"`;
                content = content.replace(typesImportRegex, newImport);
            }
        }
    }

    return content;
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

    // Apply each pattern
    patterns.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
            content = content.replace(pattern.regex, pattern.replacement);
            const changeCount = matches.length;
            totalChanges += changeCount;
            console.log(`  ✓ Fixed ${changeCount}x: ${pattern.description}`);
        }
    });

    // Ensure necessary imports are present
    if (totalChanges > 0) {
        content = ensureImports(content, filePath);
    }

    // Write back if changed
    if (content !== originalContent) {
        // Create backup
        const backupPath = fullPath + '.backup';
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  💾 Backup created: ${path.basename(filePath)}.backup`);

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
console.log('🔧 Starting automatic `any` type fixes...\n');
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

console.log('\n✨ Done! Backups created with .backup extension');
console.log('💡 Tip: Run tests to verify changes, then delete .backup files');

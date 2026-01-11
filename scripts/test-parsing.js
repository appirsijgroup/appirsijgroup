/**
 * Test CSV Parsing
 */
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'employessdata.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

function parseCSV(text) {
    const lines = text.split('\n');
    const employees = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === '') continue;

        const matches = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                matches.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        matches.push(current.trim());

        if (matches.length >= 8) {
            employees.push({
                hospital_id: matches[0],
                id: matches[1],
                name: matches[2].replace(/^"|"$/g, '').trim(),
                unit: matches[3],
                bagian: matches[4],
                profession_category: matches[5].toUpperCase() === 'MEDIS' ? 'MEDIS' : 'NON MEDIS',
                profession: matches[6] === '-' ? null : matches[6],
                gender: matches[7],
                _raw_fields: matches.length,
                _all_fields: matches
            });
        }
    }

    return employees;
}

const employees = parseCSV(csvContent);

console.log('Total parsed:', employees.length);
console.log('\nFirst 10 employees:');
employees.slice(0, 10).forEach((emp, idx) => {
    console.log(`${idx + 1}. ${emp.name} (${emp.id})`);
    console.log(`   Gender: "${emp.gender}"`);
    console.log(`   Fields: ${emp._raw_fields}`);
    console.log(`   All fields:`, emp._all_fields);
    console.log('');
});

// Count genders
const genderCount = {};
employees.forEach(emp => {
    genderCount[emp.gender] = (genderCount[emp.gender] || 0) + 1;
});

console.log('\nGender distribution:');
Object.entries(genderCount).sort((a, b) => b[1] - a[1]).forEach(([gender, count]) => {
    console.log(`  ${gender}: ${count}`);
});

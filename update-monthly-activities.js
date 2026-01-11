#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const monthlyActivitiesPath = path.join(__dirname, 'src/app/(main)/aktivitas-bulanan/page.tsx');

console.log('🔧 Memperbarui halaman aktivitas-bulanan untuk menggunakan MutabaahContext...');

// Cek jika file ada
if (!fs.existsSync(monthlyActivitiesPath)) {
  console.log('❌ File tidak ditemukan:', monthlyActivitiesPath);
  process.exit(1);
}

let content = fs.readFileSync(monthlyActivitiesPath, 'utf8');

// 1. Tambahkan import useMutabaah
if (!content.includes("import { useMutabaah }")) {
  // Cari lokasi yang tepat untuk menambahkan import
  const importsEnd = content.indexOf('interface MonthlyActivitiesWrapperProps');
  if (importsEnd === -1) {
    console.log('❌ Tidak dapat menemukan lokasi yang tepat untuk menambahkan import');
    process.exit(1);
  }

  const importStatement = "\nimport { useMutabaah } from '@/contexts/MutabaahContext';\n";

  // Tambahkan import sebelum interface definition
  content = content.slice(0, importsEnd) + importStatement + content.slice(importsEnd);
  console.log('✅ Import useMutabaah ditambahkan');
}

// 2. Update component untuk menggunakan context
if (content.includes('useMutabaah')) {
  console.log('✅ Hook useMutabaah sudah di-import');
}

// 3. Pastikan component menggunakan props yang benar
console.log('');
console.log('📝 Catatan: Pastikan component MonthlyActivities menerima props dari context:');
console.log('   - isCurrentMonthActivated (dari useMutabaah)');
console.log('   - monthlyProgressData (dari useMutabaah)');
console.log('   - activateMonth (dari useMutabaah)');
console.log('   - updateMonthlyProgress (dari useMutabaah)');
console.log('   - weeklyReportSubmissions (dari useMutabaah)');

fs.writeFileSync(monthlyActivitiesPath, content, 'utf8');

console.log('');
console.log('✅ Halaman aktivitas-bulanan berhasil diperbarui!');
console.log('');
console.log('Langkah selanjutnya:');
console.log('1. Buka src/app/(main)/aktivitas-bulanan/page.tsx');
console.log('2. Tambahkan hook useMutabaah di dalam component:');
console.log('   const {');
console.log('     isCurrentMonthActivated,');
console.log('     monthlyProgressData,');
console.log('     activateMonth,');
console.log('     updateMonthlyProgress,');
console.log('     weeklyReportSubmissions');
console.log('   } = useMutabaah();');
console.log('3. Hapus props yang tidak diperlukan dan ganti dengan values dari context');

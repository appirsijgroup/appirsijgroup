# Panduan Memperbaiki Data Attendance yang Tercampur

## 📋 Ringkasan Masalah

Data attendance tercampur karena ada **1 record team attendance** yang tersimpan di tabel yang salah:

```
❌ entity_id: "team-28927ce8-5e28-4eca-8613-020c1a87f222" di attendance_records (SALAH)
✅ entity_id: "maghrib", "isya", "dzuhur", "jumat", "ashar", "subuh" di attendance_records (BENAR)
```

### **Struktur Database yang Seharusnya:**

| Tabel | Kegunaan | Contoh entity_id |
|-------|----------|-----------------|
| `attendance_records` | Presensi sholat harian | subuh, dzuhur, ashar, maghrib, isya, jumat |
| `team_attendance_records` | Presensi kegiatan team | UUID session (KIE, Doa Bersama) |
| `activity_attendance` | Presensi kegiatan terjadwal | UUID activity (Kajian Selasa, Pengajian) |

---

## 🛠️ Langkah-Langkah Perbaikan

### **STEP 1: Cek Kondisi Data Saat Ini**

Jalankan script ini di Supabase SQL Editor atau via CLI:

```bash
# Jika menggunakan Supabase CLI
supabase db execute --file scripts/check-mixed-attendance-data.sql
```

Atau jalankan query di Supabase Dashboard:
- Buka Supabase Dashboard → SQL Editor
- Copy dan paste isi dari `scripts/check-mixed-attendance-data.sql`
- Jalankan query

**Hasil yang diharapkan:**
- `team_records_in_wrong_table`: 0 (setelah perbaikan)
- `prayer_records_in_correct_table`: > 0
- `team_records_in_correct_table`: > 0

---

### **STEP 2: Migrasi Data ke Tabel yang Benar**

⚠️ **BACKUP DULU!** Pastikan Anda sudah backup database sebelum menjalankan migrasi.

```bash
# Backup database
supabase db dump -f backup-before-fix.sql

# Jalankan migrasi
supabase db execute --file supabase/migrations/fix_mixed_attendance_data.sql
```

Atau via Supabase Dashboard:
1. Buka Supabase Dashboard → SQL Editor
2. Copy dan paste isi dari `supabase/migrations/fix_mixed_attendance_data.sql`
3. Jalankan per step (ada komentar di dalam script)
4. Verifikasi hasil setelah setiap step

**Yang dilakukan script ini:**
1. Backup data ke `attendance_records_backup_before_fix`
2. Pindahkan data dari `attendance_records` ke `team_attendance_records`
3. Hapus data yang sudah dipindahkan dari `attendance_records`
4. Verifikasi hasil migrasi

---

### **STEP 3: Tambahkan Constraint untuk Mencegah Kekambuhan**

Setelah data bersih, tambahkan constraint untuk mencegah pencampuran di masa depan:

```bash
supabase db execute --file supabase/migrations/add_attendance_validation_constraint.sql
```

Atau via Supabase Dashboard:
1. Buka Supabase Dashboard → SQL Editor
2. Copy dan paste isi dari `supabase/migrations/add_attendance_validation_constraint.sql`
3. Jalankan query

**Yang dilakukan constraint ini:**
- Menolak insert dengan `entity_id` format `"team-*"` ke `attendance_records`
- Menambahkan foreign key constraint di `team_attendance_records`
- Memberikan error yang jelas jika ada yang mencoba insert ke tabel yang salah

---

### **STEP 4: Update Kode Aplikasi (Opsional tapi Disarankan)**

Untuk double protection di level aplikasi, gunakan validasi service:

```typescript
import { safeSubmitAttendance, validateEntityId } from '@/services/attendanceValidationService';

// Contoh 1: Saat submit attendance
const result = await safeSubmitAttendance(
    employeeId,
    entityId,  // Akan divalidasi
    status,
    reason
);

if (!result.success) {
    alert(result.error);  // "Entity ID team-xxx adalah team session..."
    return;
}

// Example 2: Validasi manual
const validation = validateEntityId(entityId);
if (!validation.isValid) {
    console.error(validation.error);
    console.log('Gunakan tabel:', validation.suggestedTable);
}
```

Tambahkan juga monitoring saat app startup:

```typescript
// Di _app.tsx atau root component
import { logMixedDataWarning } from '@/services/attendanceValidationService';

useEffect(() => {
    logMixedDataWarning().then(check => {
        if (check.hasMixedData) {
            // Send alert to admin, log ke external service, etc.
        }
    });
}, []);
```

---

## 📊 Verifikasi Setelah Perbaikan

Jalankan lagi script check:

```bash
supabase db execute --file scripts/check-mixed-attendance-data.sql
```

**Hasil yang diharapkan:**

```
team_records_in_wrong_table: 0
prayer_records_in_correct_table: 6 (subuh, dzuhur, ashar, maghrib, isya, jumat)
team_records_in_correct_table: 1 (atau lebih, tergantung jumlah kegiatan team)
affected_employees: 0
```

---

## 🔍 Cara Mencegah di Kode Aplikasi

### ❌ **JANGAN** Lakukan Ini:

```typescript
// SALAH - Langsung submit tanpa cek
await submitAttendance(employeeId, 'team-xxx-xxx', 'hadir');
// Ini akan menyimpan team attendance ke attendance_records!
```

### ✅ **LAKUKAN** Ini:

```typescript
// BENAR - Cek dulu apakah ini team session
const isTeamSession = activityId.startsWith('team-');

if (isTeamSession) {
    // Gunakan team attendance service
    await createTeamAttendanceRecord({
        sessionId: activityId.replace('team-', ''),
        userId: employeeId,
        userName: employeeName,
        // ... data lainnya
    });
} else {
    // Gunakan regular attendance service
    await submitAttendance(employeeId, activityId, status, reason);
}
```

Contoh yang sudah benar di kode Anda:
- `src/app/(main)/kegiatan/page.tsx:94-180` ✅
- `src/app/(main)/admin/page.tsx:462-500` ✅

---

## 📁 File yang Sudah Dibuat

Berikut file yang sudah saya buat untuk Anda:

| File | Kegunaan |
|------|----------|
| `supabase/migrations/fix_mixed_attendance_data.sql` | Script migrasi untuk memperbaiki data |
| `supabase/migrations/add_attendance_validation_constraint.sql` | Script untuk tambah constraint validasi |
| `scripts/check-mixed-attendance-data.sql` | Script untuk mengecek kondisi data |
| `src/services/attendanceValidationService.ts` | Service untuk validasi di level aplikasi |
| `FIX_MIXED_ATTENDANCE_DATA.md` | Dokumentasi ini |

---

## 🚨 Rollback (Jika Ada Masalah)

Jika setelah migrasi ada masalah, Anda bisa rollback:

```sql
-- 1. Restore data dari backup
INSERT INTO attendance_records
SELECT * FROM attendance_records_backup_before_fix;

-- 2. Hapus data yang salah pindah
DELETE FROM team_attendance_records
WHERE created_at >= '2026-01-20'; -- Sesuaikan dengan tanggal migrasi

-- 3. Hapus constraint
ALTER TABLE attendance_records
DROP CONSTRAINT attendance_records_entity_id_format_check;
```

---

## ❓ FAQ

**Q: Kenapa bisa tercampur?**
A: Kemungkinan ada kode yang langsung submit `entity_id = "team-xxx"` ke `attendance_records` tanpa cek dulu.

**Q: Apakah data akan hilang setelah migrasi?**
A: TIDAK. Data hanya dipindahkan ke tabel yang benar. Backup juga tersimpan di `attendance_records_backup_before_fix`.

**Q: Apakah perlu downtime saat migrasi?**
A: Tidak perlu, tapi sebaiknya jalankan saat traffic rendah. Migrasi hanya butuh beberapa detik.

**Q: Bagaimana jika ada duplicate data?**
A: Script migrasi menggunakan `ON CONFLICT DO NOTHING` jadi tidak akan create duplicate.

---

## ✅ Checklist

Sebelum dan sesudah migrasi:

- [ ] Backup database
- [ ] Cek kondisi data dengan `check-mixed-attendance-data.sql`
- [ ] Jalankan `fix_mixed_attendance_data.sql`
- [ ] Verifikasi hasil migrasi
- [ ] Jalankan `add_attendance_validation_constraint.sql`
- [ ] Update kode aplikasi untuk gunakan `safeSubmitAttendance`
- [ ] Test di staging environment
- [ ] Deploy ke production
- [ ] Monitor beberapa hari setelahnya

---

## 📞 Bantuan

Jika ada masalah atau pertanyaan:
1. Cek log Supabase Dashboard
2. Jalankan `check-mixed-attendance-data.sql` untuk diagnose
3. Cek backup table `attendance_records_backup_before_fix`

---

**Last Updated:** 2026-01-20
**Status:** Ready to Execute

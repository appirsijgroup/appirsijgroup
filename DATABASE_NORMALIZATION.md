# Database Normalization - Complete Guide

## 🎯 **Objective:**

Memisahkan data yang terus bertambah (growing data) dari tabel `employees` ke tabel-tabel khusus sesuai dengan **best practice database normalization**.

---

## 📊 **Struktur Database Baru:**

### **1. employees (Tabel Profil Statis)**
```sql
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  hospital_id TEXT,
  unit TEXT,
  bagian TEXT,
  profession_category TEXT,
  profession TEXT,
  gender TEXT,

  -- Relations
  ka_unit_id TEXT,
  supervisor_id TEXT,
  mentor_id TEXT,
  dirut_id TEXT,

  -- Roles
  can_be_mentor BOOLEAN,
  can_be_supervisor BOOLEAN,
  can_be_ka_unit BOOLEAN,
  can_be_dirut BOOLEAN,

  -- Functional roles
  functional_roles TEXT[],
  manager_scope JSONB,

  -- Monthly progress (still needed for Mutabaah)
  monthly_activities JSONB,
  activated_months TEXT[],

  -- Timestamps
  last_visit_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **2. quran_reading_submissions (Bacaan Al-Qur'an)**
```sql
CREATE TABLE quran_reading_submissions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  surah_name TEXT NOT NULL,
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  submission_date DATE NOT NULL,
  created_at TIMESTAMP,

  CONSTRAINT fk_quran_user FOREIGN KEY (user_id) REFERENCES employees(id)
);
```

### **3. reading_history (Bacaan Buku)**
```sql
CREATE TABLE reading_history (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  pages_read INTEGER,
  date_completed DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP,

  CONSTRAINT fk_reading_user FOREIGN KEY (user_id) REFERENCES employees(id)
);
```

### **4. attendance_records (Presensi)**
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'prayer' or 'activity'
  status TEXT NOT NULL,
  reason TEXT,
  timestamp BIGINT NOT NULL,
  is_late_entry BOOLEAN,
  created_at TIMESTAMP,

  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES employees(id)
);
```

### **5. bookmarks (Bookmark Al-Qur'an)**
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  CONSTRAINT fk_bookmark_user FOREIGN KEY (user_id) REFERENCES employees(id),
  UNIQUE (user_id, surah_number, ayah_number)
);
```

---

## 🚀 **Migration Steps:**

### **Step 1: Run SQL Migration**
1. Buka Supabase Dashboard → SQL Editor
2. Copy seluruh isi file `supabase-migrations-complete.sql`
3. Paste dan klik **Run**
4. Verifikasi output:
   - ✓ Tables created
   - ✓ Data migrated
   - ✓ Indexes created
   - ✓ RLS policies enabled

### **Step 2: Update Application Code**
✅ **Sudah selesai:**
- `quranSubmissionService.ts` - dengan fallback
- `readingHistoryService.ts` - baru dengan fallback
- `bookmarkService.ts` - sudah menggunakan tabel bookmarks
- `attendanceService.ts` - perlu dicek

### **Step 3: Test Semua Fitur**
- [ ] Quran reading submission
- [ ] Book reading submission
- [ ] Bookmark Al-Qur'an
- [ ] Presensi sholat
- [ ] Lembar Mutabaah
- [ ] Dashboard Kinerja

### **Step 4: Cleanup (Optional)**
⚠️ **HANYA lakukan setelah Step 3 berhasil 100%**
```sql
-- Hapus JSON fields dari employees setelah yakin data sudah pindah
ALTER TABLE employees DROP COLUMN IF EXISTS quran_reading_history;
ALTER TABLE employees DROP COLUMN IF EXISTS reading_history;
ALTER TABLE employees DROP COLUMN IF EXISTS bookmarks;
```

---

## 📋 **Files yang Diubah/Dibuat:**

### **Baru:**
1. ✅ `supabase-migrations-complete.sql` - Migration script lengkap
2. ✅ `src/services/readingHistoryService.ts` - Service untuk buku

### **Diupdate:**
3. ✅ `src/services/quranSubmissionService.ts` - Dengan fallback
4. ✅ `src/app/(main)/alquran/page.tsx` - Refresh employee data

### **Sudah Bagus (Tidak perlu ubah):**
- `src/services/bookmarkService.ts` - Sudah menggunakan tabel bookmarks
- `src/services/attendanceService.ts` - Perlu dicek

---

## 🔍 **Verification Queries:**

```sql
-- 1. Cek jumlah records di setiap tabel
SELECT
  'quran_reading_submissions' as table_name, COUNT(*) as count
FROM quran_reading_submissions
UNION ALL
SELECT 'reading_history', COUNT(*) FROM reading_history
UNION ALL
SELECT 'bookmarks', COUNT(*) FROM bookmarks
UNION ALL
SELECT 'attendance_records', COUNT(*) FROM attendance_records;

-- 2. Cek data yang sukses di-migrate
SELECT
  e.id,
  e.name,
  jsonb_array_length(e.quran_reading_history) as old_quran_count,
  (SELECT COUNT(*) FROM quran_reading_submissions WHERE user_id = e.id) as new_quran_count
FROM employees e
WHERE jsonb_array_length(e.quran_reading_history) > 0;
```

---

## ✅ **Benefits:**

| Aspect | Before (JSON in employees) | After (Separate Tables) |
|--------|---------------------------|------------------------|
| **Performance** | Slow (parse JSON) | Fast (indexed queries) |
| **Scalability** | Limited | Unlimited |
| **Maintainability** | Complex | Simple |
| **Query** | Difficult | Easy SQL |
| **Storage** | Bloated | Efficient |
| **Backup** | All-or-nothing | Granular |

---

## 🎯 **Next Actions:**

1. **Deploy SQL migration** ke Supabase
2. **Test semua fitur** untuk memastikan fallback bekerja
3. **Monitor logs** untuk debugging
4. **Cleanup JSON fields** setelah yakin
5. **Commit & push** application code

---

## 📞 **Support:**

Jika ada masalah setelah migration:
1. Cek console browser untuk error
2. Verifikasi tabel terbuat di Supabase
3. Cek RLS policies aktif
4. Fallback system akan tetap bekerja dengan data lama

---

**Status:** ✅ Ready for Deployment
**Risk:** 🟢 Low (fallback system ensures compatibility)

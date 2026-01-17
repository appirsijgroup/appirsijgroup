# 🚀 Panduan Setup Activities Table

## Masalah
Data activities belum masuk ke tabel Supabase. Berikut adalah solusi lengkap untuk memperbaikinya.

---

## ✅ Solusi Cepat (Rekomendasi)

### Opsi 1: Jalankan SQL di Supabase Dashboard (Paling Mudah)

1. **Buka Supabase Dashboard**
   - Login ke https://supabase.com/dashboard
   - Pilih project Anda

2. **Buka SQL Editor**
   - Klik menu "SQL Editor" di sidebar
   - Klik "New Query"

3. **Copy-Paste SQL berikut:**

```sql
-- =====================================================
-- COMPLETE ACTIVITIES SETUP
-- =====================================================

-- Create activities table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activities'
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE activities (
            id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_by_name TEXT NOT NULL,
            participant_ids TEXT[] DEFAULT '{}',
            zoom_url TEXT,
            youtube_url TEXT,
            activity_type TEXT CHECK (activity_type IN ('Umum', 'Kajian Selasa', 'Pengajian Persyarikatan')),
            status TEXT CHECK (status IN ('scheduled', 'postponed', 'cancelled')) DEFAULT 'scheduled',
            audience_type TEXT NOT NULL CHECK (audience_type IN ('public', 'rules', 'manual')),
            audience_rules JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_activities_date ON activities(date);
        CREATE INDEX idx_activities_type ON activities(activity_type);
        CREATE INDEX idx_activities_status ON activities(status);

        RAISE NOTICE '✅ activities table created';
    ELSE
        RAISE NOTICE '✅ activities table already exists';
    END IF;
END $$;

-- Create activity_attendance table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'activity_attendance'
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE activity_attendance (
            id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
            activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak-hadir', 'izin', 'sakit')),
            reason TEXT,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_late_entry BOOLEAN DEFAULT false,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(activity_id, employee_id)
        );

        CREATE INDEX idx_activity_attendance_activity ON activity_attendance(activity_id);
        CREATE INDEX idx_activity_attendance_employee ON activity_attendance(employee_id);
        CREATE INDEX idx_activity_attendance_status ON activity_attendance(status);

        RAISE NOTICE '✅ activity_attendance table created';
    ELSE
        RAISE NOTICE '✅ activity_attendance table already exists';
    END IF;
END $$;

-- Insert sample data
DO $$
DECLARE
    activity_count INTEGER;
    admin_id TEXT;
    admin_name TEXT;
    today_date TEXT;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM activities;

    IF activity_count = 0 THEN
        SELECT id, name INTO admin_id, admin_name
        FROM employees
        WHERE role IN ('admin', 'super-admin')
        LIMIT 1;

        IF admin_id IS NULL THEN
            admin_id := 'admin-placeholder';
            admin_name := 'System Admin';
        END IF;

        today_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

        INSERT INTO activities (name, description, date, start_time, end_time, created_by, created_by_name, activity_type, audience_type, status) VALUES
            ('Kajian Rutin Selasa', 'Kajian rutin mingguan yang membahas tafsir Al-Quran dan hadis.', today_date::DATE + INTERVAL '1 day', '10:00', '11:30', admin_id, admin_name, 'Kajian Selasa', 'public', 'scheduled'),
            ('Pengajian Persyarikatan', 'Pengajian rutin untuk persyarikatan setiap shift pagi.', today_date, '07:00', '07:30', admin_id, admin_name, 'Pengajian Persyarikatan', 'public', 'scheduled'),
            ('Pelatihan Leadership', 'Pelatihan kepemimpinan untuk karyawan terpilih.', today_date::DATE + INTERVAL '2 days', '13:00', '15:00', admin_id, admin_name, 'Umum', 'public', 'scheduled'),
            ('Seminar Kesehatan', 'Seminar kesehatan untuk semua staff.', today_date::DATE + INTERVAL '3 days', '09:00', '12:00', admin_id, admin_name, 'Umum', 'public', 'scheduled');

        RAISE NOTICE '✅ Inserted 4 sample activities';
    ELSE
        RAISE NOTICE 'ℹ️ Activities table already has data';
    END IF;
END $$;

-- Verification
SELECT 'activities' as table_name, COUNT(*) as row_count FROM activities
UNION ALL
SELECT 'activity_attendance', COUNT(*) FROM activity_attendance;
```

4. **Klik "Run"** (atau tekan Ctrl+Enter)

5. **Cek Hasil:**
   - Jika berhasil, akan muncul: `✅ activities table created`
   - Di bawahnya akan ada table count

---

### Opsi 2: Gunakan File Migration

Jika Anda punya akses ke Supabase CLI:

```bash
# Jalankan migration lengkap
supabase migration up --file supabase-migrations/complete-activities-setup.sql
```

Atau jalankan file SQL ini di Supabase Dashboard SQL Editor:
- File: `supabase-migrations/complete-activities-setup.sql`
- Copy semua isi file
- Paste di SQL Editor
- Run

---

## 🔍 Verifikasi Setup

### 1. Cek di Supabase Dashboard

**Table Editor:**
1. Buka menu "Table Editor"
2. Cari tabel `activities`
3. Klik untuk melihat isinya
4. Harus ada minimal 4 sample data

**SQL Editor Verification:**
```sql
-- Cek apakah tabel exists
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('activities', 'activity_attendance');

-- Lihat semua activities
SELECT * FROM activities ORDER BY date, start_time;

-- Count activities
SELECT COUNT(*) as total_activities FROM activities;
```

### 2. Cek di Aplikasi

1. **Start aplikasi:**
   ```bash
   npm run dev
   ```

2. **Login sebagai employee**

3. **Buka halaman:**
   - `/kegiatan` - Halaman Kegiatan

4. **Buka Browser Console:**
   - Tekan F12
   - Cek logs untuk:
     - `✅ Loaded X activities from Supabase`
     - `📋 Loading activities from Supabase...`

5. **Test Fitur:**
   - Cek apakah activities muncul di table
   - Klik tombol "Hadir" untuk test attendance
   - Cek console untuk error

---

## 🛠️ Troubleshooting

### Masalah 1: "Table activities does not exist"

**Solusi:**
```sql
-- Jalankan di SQL Editor
SELECT * FROM information_schema.tables
WHERE table_name = 'activities';
```

Jika tidak ada hasil, jalankan setup SQL di atas.

---

### Masalah 2: "Permission denied" atau RLS Error

**Solusi:**
```sql
-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'activities';

-- Pastikan user punya akses
-- Anda mungkin perlu adjust RLS policies
```

---

### Masalah 3: Activities muncul tapi attendance tidak bisa disubmit

**Solusi:**
```sql
-- Cek apakah activity_attendance table exists
SELECT * FROM information_schema.tables
WHERE table_name = 'activity_attendance';

-- Jika tidak ada, jalankan:
-- (copy dari create-activity-attendance-table.sql)
```

---

### Masalah 4: Sample data tidak ter-insert

**Penyebab:** Tidak ada user dengan role admin/super-admin

**Solusi:**
```sql
-- Cek apakah ada admin user
SELECT id, name, role FROM employees WHERE role IN ('admin', 'super-admin');

-- Jika kosong, insert manual dengan employee ID yang sudah ada:
INSERT INTO activities (
    name, description, date, start_time, end_time,
    created_by, created_by_name, activity_type, audience_type, status
) VALUES (
    'Test Activity',
    'This is a test activity',
    '2025-01-20',
    '10:00',
    '11:00',
    'YOUR_EMPLOYEE_ID',  -- Ganti dengan ID employee yang ada
    'Your Name',
    'Umum',
    'public',
    'scheduled'
);
```

---

## 📋 Struktur Database

### Tabel `activities`
```
- id (TEXT, UUID)
- name (TEXT)
- description (TEXT, nullable)
- date (TEXT) - Format: YYYY-MM-DD
- start_time (TEXT) - Format: HH:MM
- end_time (TEXT) - Format: HH:MM
- created_by (TEXT) - Employee ID
- created_by_name (TEXT)
- participant_ids (TEXT[])
- zoom_url (TEXT, nullable)
- youtube_url (TEXT, nullable)
- activity_type (TEXT) - 'Umum', 'Kajian Selasa', 'Pengajian Persyarikatan'
- status (TEXT) - 'scheduled', 'postponed', 'cancelled'
- audience_type (TEXT) - 'public', 'rules', 'manual'
- audience_rules (JSONB, nullable)
- created_at (TIMESTAMPTZ)
```

### Tabel `activity_attendance`
```
- id (TEXT, UUID)
- activity_id (TEXT) - FK ke activities.id
- employee_id (TEXT) - FK ke employees.id
- status (TEXT) - 'hadir', 'tidak-hadir', 'izin', 'sakit'
- reason (TEXT, nullable)
- submitted_at (TIMESTAMPTZ)
- is_late_entry (BOOLEAN)
- notes (TEXT, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- UNIQUE(activity_id, employee_id)
```

---

## ✅ Checklist Setup

- [ ] Tabel `activities` sudah dibuat
- [ ] Tabel `activity_attendance` sudah dibuat
- [ ] Sample data sudah di-insert (minimal 1 activity)
- [ ] Indexes sudah dibuat
- [ ] RLS policies sudah di-setup
- [ ] Aplikasi bisa load activities
- [ ] Tombol "Hadir"/"Tidak Hadir" berfungsi
- [ ] Attendance tersimpan di database

---

## 🎯 Next Steps

Setelah setup berhasil:

1. **Customize Activities:**
   - Edit sample activities sesuai kebutuhan
   - Tambah activities baru melalui UI (jika ada) atau SQL

2. **Test Flow:**
   - Login sebagai employee
   - Buka halaman Kegiatan
   - Test submit attendance
   - Verifikasi di database

3. **Monitoring:**
   - Cek Table Editor di Supabase Dashboard
   - Monitor logs untuk error

---

## 📞 Butuh Bantuan?

Jika masih ada masalah:

1. Cek browser console untuk error message
2. Cek Supabase logs (Dashboard → Logs)
3. Verifikasi environment variables di `.env.local`
4. Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` benar

---

**Last Updated:** 2025-01-17
**Status:** Ready to use ✅

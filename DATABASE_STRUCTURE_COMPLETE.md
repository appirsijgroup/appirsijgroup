# 📋 STRUKTUR DATABASE & DATA SYNC LENGKAP

## **TABEL-TABEL YANG ADA:**

### **1. activities**
Kegiatan terjadwal: Kajian Selasa, Pengajian Persyarikatan, Umum

```sql
activities
├── id (UUID)
├── name (TEXT) ✅ ADA
├── description (TEXT)
├── date (TEXT) ✅ ADA
├── start_time (TEXT) ✅ ADA
├── end_time (TEXT) ✅ ADA
├── created_by (TEXT)
├── created_by_name (TEXT)
├── participant_ids (TEXT[])
├── zoom_url (TEXT)
├── youtube_url (TEXT)
├── activity_type (TEXT: 'Umum' | 'Kajian Selasa' | 'Pengajian Persyarikatan') ✅ ADA
├── status (TEXT: 'scheduled' | 'postponed' | 'cancelled') ✅ ADA
├── audience_type (TEXT: 'public' | 'rules' | 'manual') ✅ ADA
├── audience_rules (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ) ✅ DITAMBAHKAN
```

### **2. team_attendance_sessions**
Sesi presensi team: KIE, Doa Bersama

```sql
team_attendance_sessions
├── id (UUID)
├── creator_id (TEXT) ✅ ADA
├── creator_name (TEXT) ✅ ADA
├── type (TEXT: 'KIE' | 'Doa Bersama') ✅ ADA
├── date (TEXT) ✅ ADA
├── start_time (TEXT) ✅ ADA
├── end_time (TEXT) ✅ ADA
├── audience_type (TEXT: 'rules' | 'manual') → ❌ TIDAK ADA 'public'
├── audience_rules (JSONB) ✅ ADA
├── manual_participant_ids (TEXT[]) ✅ ADA
├── present_user_ids (TEXT[]) ✅ ADA
├── attendance_mode (TEXT: 'leader' | 'self') ✅ ADA
├── zoom_url (TEXT)
├── youtube_url (TEXT)
├── created_at (TIMESTAMPTZ) ✅ ADA
├── updated_at (TIMESTAMPTZ) ✅ ADA
└── status (TEXT) ❌ TIDAK ADA - perlu ditambah
```

### **3. activity_attendance**
Presensi untuk activities

```sql
activity_attendance
├── id (UUID)
├── activity_id (UUID) → activities(id) ✅ ADA
├── employee_id (TEXT) → employees(id) ✅ ADA
├── status (TEXT: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit') ✅ ADA
├── reason (TEXT)
├── submitted_at (TIMESTAMPTZ) ✅ ADA
├── is_late_entry (BOOLEAN) ✅ ADA
├── notes (TEXT)
├── ip_address (TEXT)
├── created_at (TIMESTAMPTZ) ✅ ADA
└── updated_at (TIMESTAMPTZ) ✅ ADA
```

### **4. team_attendance_records**
Presensi untuk team sessions

```sql
team_attendance_records
├── id (UUID)
├── session_id (UUID) → team_attendance_sessions(id) ✅ ADA
├── user_id (TEXT) → employees(id) ✅ ADA
├── user_name (TEXT) ✅ ADA
├── attended_at (BIGINT) ✅ ADA
├── session_type (TEXT) ✅ ADA
├── session_date (TEXT) ✅ ADA
├── session_start_time (TEXT) ✅ ADA
├── session_end_time (TEXT) ✅ ADA
├── created_at (TIMESTAMPTZ) ✅ ADA
```

### **5. attendance_records**
Presensi sholat harian (subuh, dzuhur, ashar, maghrib, isya, jumat)

```sql
attendance_records
├── id (UUID)
├── employee_id (TEXT) → employees(id) ✅ ADA
├── entity_id (TEXT: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya' | 'jumat') ✅ ADA
├── status (TEXT: 'hadir' | 'tidak-hadir') ✅ ADA
├── reason (TEXT)
├── timestamp (TIMESTAMPTZ) ✅ ADA
├── is_late_entry (BOOLEAN) ✅ ADA
├── location (TEXT)
├── created_at (TIMESTAMPTZ) ✅ ADA
└── updated_at (TIMESTAMPTZ) ✅ ADA
```

### **6. employee_monthly_activities**
Aktivitas bulanan karyawan

```sql
employee_monthly_activities
├── employee_id (TEXT) → employees(id) ✅ PRIMARY KEY
├── monthly_activities (JSONB) ✅ ADA
├── updated_at (TIMESTAMPTZ)
```

---

## **ALUR DATA YANG BENAR:**

### **Create Activity Flow:**
```
User isi form (Create Activity Page)
    ↓
Component → handleCreateActivity()
    ↓
activityStore.addActivity(activity)
    ↓
scheduledActivityService.createActivity()
    ↓
Convert camelCase → snake_case ⚠️ CRITICAL
    ↓
INSERT INTO activities (snake_case columns)
    ↓
Supabase returns data (snake_case)
    ↓
Convert snake_case → camelCase ⚠️ CRITICAL
    ↓
Update store state
    ↓
UI refreshes
```

### **Create Team Session Flow:**
```
User isi form (Create Session Page)
    ↓
Component → handleCreateSessions()
    ↓
activityStore.addTeamAttendanceSessions(sessions)
    ↓
teamAttendanceService.createTeamAttendanceSession()
    ↓
INSERT INTO team_attendance_sessions
    ↓
Supabase returns data
    ↓
Update store state
    ↓
UI refreshes
```

### **Display Activities Flow:**
```
User opens /kegiatan
    ↓
kegiatan/page.tsx → useEffect
    ↓
loadActivities() + loadTeamSessions()
    ↓
activityStore.loadActivitiesFromSupabase()
    ↓
scheduledActivityService.getActivitiesForEmployee()
    ↓
SELECT * FROM activities WHERE status = 'scheduled'
    ↓
Convert snake_case → camelCase ⚠️ CRITICAL
    ↓
Filter by audienceType (public/rules/manual)
    ↓
activityStore.loadTeamAttendanceSessionsFromSupabase()
    ↓
SELECT * FROM team_attendance_sessions
    ↓
Convert snake_case → camelCase ⚠️ CRITICAL
    ↓
ActivityTable receives data
    ↓
Display in UI
```

### **Submit Attendance Flow:**

**Untuk Activity:**
```
User klik "Hadir"
    ↓
handleHadir() → check isTeamSession
    ↓
scheduledActivityService.submitScheduledAttendance()
    ↓
UPSERT INTO activity_attendance
    ↓
UPDATE employee_monthly_activities (monthlyActivities)
    ↓
Update local state
```

**Untuk Team Session:**
```
User klik "Hadir"
    ↓
handleHadir() → check isTeamSession
    ↓
teamAttendanceService.createTeamAttendanceRecord()
    ↓
INSERT INTO team_attendance_records
    ↓
Update local state
```

---

## **⚠️ POINT-POINT KRUSIAL YANG SERING ERROR:**

### **1. snake_case vs camelCase (PALING SERING!)**
- Database: snake_case (`start_time`, `audience_type`, `zoom_url`)
- TypeScript: camelCase (`startTime`, `audienceType`, `zoomUrl`)
- **Solution:** SELALU convert saat insert/update!

### **2. audience_type Values**
- Activities: `'public'`, `'rules'`, `'manual'` ✅
- Team Sessions: `'rules'`, `'manual'` → ❌ **TIDAK ADA 'public'!**
- **Solution:** Tambah 'public' ke constraint

### **3. status Column**
- Activities: ✅ ADA (`scheduled`, `postponed`, `cancelled`)
- Team Sessions: ❌ **TIDAK ADA**
- **Solution:** Tambah kolom status

### **4. updated_at Column**
- Activities: ❌ Belum ada di beberapa versi
- Team Sessions: ✅ ADA
- **Solution:** Tambah kolom + trigger

### **5. RLS Policies**
- Sering terlalu ketat → Error 401/42501
- **Solution:** Gunakan policy permissive `WITH CHECK (true)`

---

## **✅ CHECKLIST SEBELUM PRODUCTION:**

- [ ] Semua tabel punya `updated_at` column
- [ ] Semua tabel punya `status` column (jika perlu)
- [ ] `audience_type` support 'public' untuk semua tabel
- [ ] RLS policies permissive untuk development
- [ ] Service functions convert snake_case ↔ camelCase
- [ ] Tidak ada hardcoded field names
- [ ] Error handling di semua service calls
- [ ] Loading states di semua UI components
- [ ] Test create → read → update → delete flow
- [ ] Test filter/sort di UI
- [ ] Test submit attendance flow
- [ ] Verify data consistency across tables

---

## **🔧 YANG PERLU DIPERBAIKI:**

1. ✅ Tambah `status` column ke `team_attendance_sessions`
2. ✅ Ubah constraint `audience_type` untuk izinkan 'public'
3. ✅ Set semua data ke 'public' untuk testing
4. ✅ Fix semua RLS policies ke permissive
5. ✅ Pastikan convert snake_case ↔ camelCase di SEMUA service functions

---

**Last Updated:** 2026-01-20
**Status:** Ready for execution

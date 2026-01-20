# SUMMARY: Semua Jenis Kegiatan dan Tabel Presensi

## 1. TEAM SESSIONS (KIE & Doa Bersama)
- **Prefix ID**: `team-`
- **Tabel Presensi**: `team_attendance_records` ✅
- **Status**: SUDAH JALAN (bisa tercatat)
- **Flow**: 
  - klik HADIR → check if starts with 'team-' → createTeamAttendanceRecord() → team_attendance_records

## 2. SCHEDULED ACTIVITIES (Kajian, Pengajian, dll)
- **Prefix ID**: UUID langsung (tanpa prefix)
- **Tabel Presensi**: `activity_attendance` ❌
- **Status**: MASIH ERROR 406
- **Flow**:
  - klik HADIR → check if NOT starts with 'team-' → submitScheduledAttendance() → activity_attendance

## 3. PRAYER ATTENDANCE (Sholat)
- **Entity ID**: 'subuh', 'dzuhur', etc
- **Tabel Presensi**: `attendance_records`
- **Status**: Terpisah, tidak lewat halaman Kegiatan

---
## MASALAH UTAMA:
- activity_attendance tabel ADA tapi masih error 406 (Not Acceptable)
- Biasanya karena RLS policy masih aktif
- Solusi: DISABLE RLS untuk activity_attendance

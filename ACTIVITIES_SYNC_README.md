# Activities Table Synchronization Documentation

## Overview
Tabel `activities` telah disinkronkan dengan aplikasi. Dokumentasi ini menjelaskan integrasi lengkap antara tabel `activities` di Supabase dan aplikasi frontend.

## Tabel `activities` di Supabase

### Struktur Tabel
```sql
CREATE TABLE activities (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
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
```

### Field Penjelasan
- **id**: Unique identifier (UUID)
- **name**: Nama kegiatan
- **description**: Deskripsi kegiatan (opsional)
- **date**: Tanggal kegiatan (format YYYY-MM-DD)
- **start_time**: Waktu mulai (format HH:MM)
- **end_time**: Waktu selesai (format HH:MM)
- **created_by**: ID employee yang membuat kegiatan
- **created_by_name**: Nama employee yang membuat kegiatan
- **participant_ids**: Array ID employee (untuk audience_type 'manual')
- **zoom_url**: Link Zoom (opsional)
- **youtube_url**: Link YouTube (opsional)
- **activity_type**: Jenis kegiatan ('Umum', 'Kajian Selasa', 'Pengajian Persyarikatan')
- **status**: Status kegiatan ('scheduled', 'postponed', 'cancelled')
- **audience_type**: Tipe audiens ('public', 'rules', 'manual')
- **audience_rules**: Rules untuk filtering audiens (JSONB)

## Service Layer

### File: `src/services/activitiesService.ts`

Service ini menyediakan fungsi CRUD untuk activities:

#### Fungsi Utama:

1. **getAllActivities()**: Ambil semua activities
2. **getActivitiesByDateRange(startDate, endDate)**: Ambil activities berdasarkan range tanggal
3. **getActivityById(id)**: Ambil activity berdasarkan ID
4. **getActivitiesForEmployee(employee, startDate?, endDate?, statusFilter?)**: Ambil activities yang visible untuk employee tertentu
5. **getUpcomingActivities(employee)**: Ambil upcoming activities untuk employee
6. **getTodayActivities(employee)**: Ambil activities hari ini untuk employee
7. **createActivity(activity, creatorName)**: Buat activity baru
8. **updateActivity(id, updates)**: Update activity
9. **deleteActivity(id)**: Hapus activity

### Contoh Penggunaan:

```typescript
import { getAllActivities, getActivitiesForEmployee, createActivity } from '@/services/activitiesService';

// Ambil semua activities (admin view)
const allActivities = await getAllActivities();

// Ambil activities untuk employee tertentu
const employeeActivities = await getActivitiesForEmployee(employee);

// Buat activity baru
const newActivity = await createActivity({
  name: 'Kajian Rutin',
  description: 'Kajian mingguan',
  date: '2025-01-20',
  startTime: '10:00',
  endTime: '11:30',
  createdBy: 'employee-id',
  participantIds: [],
  activityType: 'Kajian Selasa',
  status: 'scheduled',
  audienceType: 'public'
}, 'Nama Pembuat');
```

## Store Layer (Zustand)

### File: `src/store/activityStore.ts`

Store mengelola state activities secara global dengan persistensi.

#### State:
- `activities`: Array of Activity
- `isLoadingActivities`: Boolean loading status
- `activitiesError`: Error message jika ada

#### Methods:
- `loadActivitiesFromSupabase(employeeId?)`: Load activities dari Supabase
  - Jika `employeeId` diberikan: load activities spesifik untuk employee
  - Jika tidak: load semua activities (admin view)
- `addActivity(activity)`: Tambah activity ke store
- `updateActivity(activityId, updates)`: Update activity di store
- `deleteActivity(activityId)`: Hapus activity dari store

### Contoh Penggunaan di Component:

```typescript
import { useActivityStore } from '@/store/store';

function MyComponent() {
  const { activities, isLoadingActivities, loadActivitiesFromSupabase } = useActivityStore();

  useEffect(() => {
    // Load activities saat component mount
    loadActivitiesFromSupabase(employeeId);
  }, [employeeId]);

  if (isLoadingActivities) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {activities.map(activity => (
        <div key={activity.id}>{activity.name}</div>
      ))}
    </div>
  );
}
```

## Integrasi di Components

### 1. **Kegiatan Page** (`src/app/(main)/kegiatan/page.tsx`)
- Menampilkan semua activities yang visible untuk logged-in employee
- Load activities saat mount menggunakan `loadActivitiesFromSupabase(loggedInEmployee.id)`
- Menampilkan attendance buttons (Hadir/Tidak Hadir)

### 2. **DashboardContainer** (`src/containers/DashboardContainer.tsx`)
- Load activities secara global saat application mount
- Menyediakan activities ke seluruh aplikasi melalui store

### 3. **ActivityTable** (`src/components/ActivityTable.tsx`)
- Component untuk menampilkan activities dalam bentuk table
- Filter activities berdasarkan audience_type dan audience_rules
- Support untuk both regular activities dan team attendance sessions

## Audience Targeting System

### Public Audience
```typescript
{
  audienceType: 'public'
}
```
Semua employee bisa melihat dan mengikuti activity ini.

### Manual Audience
```typescript
{
  audienceType: 'manual',
  participantIds: ['emp-1', 'emp-2', 'emp-3']
}
```
Hanya employee yang ada di `participantIds` yang bisa melihat activity ini.

### Rules Audience
```typescript
{
  audienceType: 'rules',
  audienceRules: {
    hospitalIds: ['hospital-1'],
    units: ['Keperawatan', 'Farmasi'],
    bagians: ['Rawat Inap', 'IGD'],
    professionCategories: ['MEDIS'],
    professions: ['Perawat', 'Dokter']
  }
}
```
Hanya employee yang match dengan rules yang bisa melihat activity ini.

## Attendance System

Attendance disimpan di tabel `attendances` dengan struktur:
```json
{
  "activity-id": {
    "status": "hadir",
    "timestamp": 1234567890,
    "reason": null,
    "isLateEntry": false
  }
}
```

### Submit Attendance:
Gunakan `submitAttendance` function dari `attendanceService`:

```typescript
import { submitAttendance } from '@/services/attendanceService';

await submitAttendance(
  employeeId,
  activityId,
  'hadir', // atau 'tidak-hadir'
  activityName
);
```

## Migration

### File: `supabase-migrations/ensure-activities-table.sql`

Migration ini memastikan:
1. Tabel `activities` exists dengan struktur yang benar
2. Indexes tercreated
3. Sample data inserted (jika tabel kosong)

### Running Migration:

Jika menggunakan Supabase CLI:
```bash
supabase db push
```

Jika menggunakan Supabase Dashboard:
1. Buka SQL Editor di Supabase Dashboard
2. Copy-paste isi dari `ensure-activities-table.sql`
3. Run query

## Testing

### Manual Testing:
1. Login sebagai employee
2. Buka halaman `/kegiatan`
3. Pastikan activities muncul (jika ada)
4. Coba submit attendance
5. Cek console untuk logs

### Sample Data:
Jika tabel kosong, migration akan otomatis insert 2 sample activities:
- Kajian Rutin Selasa (besok, 10:00-11:30)
- Pengajian Persyarikatan (hari ini, 07:00-07:30)

## Troubleshooting

### Activities tidak muncul:
1. Cek browser console untuk error logs
2. Pastikan `loadActivitiesFromSupabase()` dipanggil
3. Cek Supabase logs untuk query errors
4. Verifikasi bahwa tabel `activities` exists di Supabase

### Audience filtering tidak bekerja:
1. Cek `audience_type` dan `audience_rules` di database
2. Verifikasi data employee (hospital_id, unit, bagian, dll)
3. Cek fungsi `doesEmployeeMatchRules()` di `activitiesService.ts`

### Attendance tidak tersimpan:
1. Cek service `attendanceService.ts`
2. Verifikasi tabel `attendances` exists
3. Cek RLS policies di Supabase

## Best Practices

1. **Selalu gunakan service layer** untuk semua operasi database
2. **Load activities melalui store** untuk memanfaatkan caching
3. **Filter activities by employee** untuk security dan performance
4. **Gunakan audience_type 'public'** untuk activities yang semua employee bisa lihat
5. **Gunakan audience_type 'manual'** untuk kegiatan dengan peserta spesifik
6. **Gunakan audience_type 'rules'** untuk kegiatan dengan kriteria kompleks

## Future Enhancements

Possible improvements:
1. Real-time updates menggunakan Supabase Realtime
2. Pagination untuk large number of activities
3. Advanced filtering dan search
4. Export activities to PDF/Excel
5. Calendar view untuk activities
6. Notification untuk upcoming activities

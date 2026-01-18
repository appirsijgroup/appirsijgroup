# 🚀 Quick Start: Performance Optimization

## Apa yang Baru?

Aplikasi sekarang punya **React Query hooks** untuk data fetching yang lebih cepat dan efisien!

## ⚡ Mulai Menggunakan (3 Langkah)

### Langkah 1: Import Hooks

```typescript
// Di component Anda
import { useMe, useEmployees, useAnnouncements } from '@/hooks/queries';
```

### Langkah 2: Gunakan Hooks

```typescript
function MyComponent() {
  // Data user yang login
  const { me, isLoading, error } = useMe();

  // List employees
  const { employees, updateEmployee } = useEmployees();

  // Announcements
  const { announcements } = useAnnouncements();

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1>Welcome {me?.name}</h1>
      {/* ... */}
    </div>
  );
}
```

### Langkah 3: Selesai! ✅

Tidak perlu useEffect, useState, atau manual fetching. React Query handle semuanya!

## 📚 Contoh Lengkap

### Example: Dashboard Component

**❌ SEBELUM (Rumit & Lambat):**
```typescript
'use client';
import { useEffect, useState } from 'react';
import { useAppDataStore } from '@/store/store';

export default function Dashboard() {
  const { loggedInEmployee, loadLoggedInEmployee } = useAppDataStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await loadLoggedInEmployee(); // Fetch manual
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <DashboardContent employee={loggedInEmployee} />;
}
```

**✅ SESUDAH (Simple & Cepat):**
```typescript
'use client';
import { useMe } from '@/hooks/queries';

export default function Dashboard() {
  const { me: employee, isLoading, isError, error } = useMe();

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorMessage error={error} />;

  return <DashboardContent employee={employee} />;
}

// ⚡ 3x less code, automatic caching, better error handling!
```

## 🎯 Hooks yang Tersedia

### `useMe()` - Data User yang Login
```typescript
const { me, isLoading, updateProfile, logout } = useMe();
```

### `useEmployees()` - List Employees
```typescript
const { employees, totalCount, updateEmployee } = useEmployees({
  page: 1,
  limit: 20,
  filter: { isActive: true }
});
```

### `useAnnouncements()` - Pengumuman
```typescript
const { announcements, createAnnouncement } = useAnnouncements();
```

### `useMonthlyActivities()` - Aktivitas Bulanan
```typescript
const { monthlyActivities, updateActivities } = useMonthlyActivities(employeeId);
```

### `useReadingHistory()` - Riwayat Membaca
```typescript
const { readingHistory, submitBookReading } = useReadingHistory(employeeId);
```

### `useTodoList()` - To-Do List
```typescript
const { todos, updateTodoList } = useTodoList(employeeId);
```

## 💡 Tips & Triks

### Tip 1: Combining Multiple Queries

```typescript
function Dashboard() {
  // Multiple queries, satu loading state
  const { me, isLoading: isLoadingMe } = useMe();
  const { announcements, isLoading: isLoadingAnn } = useAnnouncements();

  const isLoading = isLoadingMe || isLoadingAnn;

  if (isLoading) return <Skeleton />;
  // ...
}
```

### Tip 2: Update Data dengan Optimistic Update

```typescript
const { updateEmployee } = useEmployees();

// UI langsung berubah tanpa tunggu server!
handleClick(() => {
  updateEmployee({ id: '123', updates: { name: 'New Name' } });
});
```

### Tip 3: Conditional Queries

```typescript
// Hanya fetch jika user adalah admin
const { data: adminData } = useQuery({
  queryKey: ['admin-data'],
  queryFn: fetchAdminData,
  enabled: user?.role === 'admin', // Conditional
});
```

## 🐛 Troubleshooting

### "Data tidak update"

**Solution:** Invalidate query setelah mutation
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['me'] });
}
```

### "Terlalu banyak re-render"

**Solution:** Gunakan `select` untuk memilih data spesifik
```typescript
const { name } = useMe({
  select: (data) => data.me.name // Hanya re-render jika name berubah
});
```

### "Stale data tampil"

**Solution:** Reduce `staleTime`
```typescript
useQuery({
  staleTime: 1000 * 30, // 30 detik saja
});
```

## 📖 Dokumentasi Lengkap

- **Migration Guide:** `REACT_QUERY_MIGRATION_GUIDE.md`
- **Implementation Summary:** `PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- **API Reference:** `src/hooks/queries/`

## 🎓 Belajar Lebih Lanjut

1. Baca `REACT_QUERY_MIGRATION_GUIDE.md`
2. Lihat contoh di `src/hooks/queries/`
3. Coba di satu component dulu
4. Tanya ke senior dev jika bingung

## ✨ Mulai Sekarang!

Pilih satu component dan migrasi sekarang:

- [ ] DashboardContainer
- [ ] MyDashboard
- [ ] AdminPage
- [ ] AnalyticsPage

**Happy Coding! 🚀**

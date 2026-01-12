# 🛠️ Cara Memperbaiki Error Infinite Recursion di Announcement Delete

## 📋 Masalah
Error: `infinite recursion detected in policy for relation "announcements" (42P17)`

Ini terjadi karena RLS Policy di Supabase menggunakan subquery yang meng-trigger policy lain secara circular.

---

## ✅ Solusi: Jalankan SQL Script

### **Langkah 1: Buka Supabase SQL Editor**

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik menu **SQL Editor** di sidebar kiri
4. Klik **New Query**

### **Langkah 2: Copy & Paste SQL Script**

Buka file: `supabase/fix_announcements_rls.sql`

Copy seluruh isi file tersebut dan paste ke SQL Editor.

### **Langkah 3: Jalankan Script**

Klik tombol **Run** (atau tekan `Ctrl+Enter`)

### **Langkah 4: Verifikasi**

Pastikan muncul output seperti ini:
```
schema | table       | policy                               | permissive | ...
--------+-------------+--------------------------------------+------------+------
public  | announcements| Enable read access for all users     | PERMISSIVE | ...
public  | announcements| Enable insert for admins and mentors | PERMISSIVE | ...
public  | announcements| Enable update for authors and admins | PERMISSIVE | ...
public  | announcements| Enable delete for authors and admins | PERMISSIVE | ...
```

---

## 🔍 Penjelasan Perbaikan

### **Masalah Lama:**
```sql
-- ❌ POLICY YANG MENYEBABKAN RECURSION
CREATE POLICY "..." ON announcements
FOR DELETE
USING (
    auth.uid()::text = author_id
    OR
    (SELECT role FROM employees WHERE id::text = auth.uid()::text) IN ('admin', 'super-admin')
    -- ^ Subquery ini memicu policy employees yang mungkin meng-reference announcements
);
```

### **Solusi Baru:**
```sql
-- ✅ POLICY TANPA RECURSION
CREATE POLICY "Enable delete for announcement authors and admins"
ON announcements
FOR DELETE
TO authenticated
USING (
    get_current_user_role() IN ('super-admin', 'admin')
    OR
    auth.uid()::text = author_id
);

-- Helper function dengan SECURITY DEFINER untuk menghindari recursion
CREATE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- Key: Run dengan privilege owner, bukan user
SET search_path = public
AS $$
    SELECT role FROM employees WHERE id::text = auth.uid()::text LIMIT 1
$$;
```

**Kenapa SECURITY DEFINER?**
- Function dijalankan dengan privilege **table owner**, bukan user yang sedang login
- Jadi tidak memicu RLS policy pada tabel `employees`
- Menghindari infinite loop

---

## 🎯 Hak Akses Setelah Perbaikan

Setelah perbaikan, berikut yang bisa menghapus announcement:

| Role | Bisa Hapus | Keterangan |
|------|-----------|-----------|
| **Super Admin** | ✅ Semua | Bisa menghapus semua announcement |
| **Admin** | ✅ Semua | Bisa menghapus semua announcement |
| **Mentor** | ✅ Milik sendiri | Hanya announcement yang mereka buat |
| **User** | ✅ Milik sendiri | Hanya announcement yang mereka buat (jika diizinkan) |

---

## 🧪 Testing Setelah Perbaikan

1. **Refresh halaman pengumuman** di aplikasi
2. Coba hapus announcement lagi
3. Seharusnya sekarang berhasil!

Jika masih gagal, buka **Browser Console** (F12) dan kirim screenshot error-nya.

---

## 📝 Troubleshooting

### **Error: "permission denied for function get_current_user_role"**

Solusi:
```sql
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_announcement(TEXT) TO authenticated;
```

### **Error: "function get_current_user_role() already exists"**

Solusi: Drop function terlebih dahulu
```sql
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS can_delete_announcement(TEXT) CASCADE;
```

Lalu jalankan ulang script utama.

---

## 🚀 Setelah Berhasil

Commit dan push file SQL ini ke repository untuk dokumentasi:

```bash
git add supabase/
git commit -m "docs: Add SQL script to fix announcements RLS policy infinite recursion"
git push
```

# DOKUMEN RESMI IMPLEMENTASI SISTEM

# Dashboard Kompetensi Al-Qur’an Karyawan

**Versi Dokumen** : 1.0
**Status** : Final – Siap Implementasi
**Sasaran Pembaca** : Developer (Frontend & Backend), IT Support, System Analyst

---

## Ringkasan Eksekutif

Dokumen ini menjadi **acuan resmi dan tunggal** dalam pembangunan *Dashboard Kompetensi Al-Qur’an Karyawan*.

Sistem ini dirancang sebagai **Spiritual Development System**, bukan alat penilaian kinerja SDM. Fokus utama adalah:

* Pemetaan kemampuan Al-Qur’an secara objektif
* Monitoring pertumbuhan (growth)
* Mendukung program pembinaan Qur’ani institusi

Seluruh implementasi **WAJIB mengacu pada dokumen ini** untuk menghindari perbedaan tafsir antara tim teknis dan pemilik proses.

---

## 1. Tujuan Sistem

Dashboard ini bertujuan untuk **memetakan, memantau, dan menumbuhkan** kompetensi Al-Qur’an karyawan secara bertahap dan beradab, tanpa fungsi punishment atau penilaian kinerja formal.

Fokus utama:

* Pemetaan kemampuan aktual
* Monitoring pertumbuhan (growth)
* Dasar penyusunan program pembinaan Qur’ani

---

## 2. Ruang Lingkup Pengukuran

Kompetensi dibagi menjadi **4 dimensi independen**.

### 2.1 Dimensi R — Kemampuan Membaca (Reading Fluency)

| Kode | Deskripsi                                    |
| ---- | -------------------------------------------- |
| R0   | Belum bisa membaca huruf Arab                |
| R1   | Bisa membaca terbata-bata                    |
| R2   | Bisa membaca lancar (tajwid belum konsisten) |
| R3   | Lancar dan stabil                            |

### 2.2 Dimensi T — Penguasaan Tajwid

| Kode | Deskripsi                                     |
| ---- | --------------------------------------------- |
| T0   | Belum mengenal tajwid                         |
| T1   | Mengenal tajwid dasar                         |
| T2   | Tajwid cukup tepat, masih ada kesalahan kecil |
| T3   | Tajwid baik dan konsisten                     |

### 2.3 Dimensi H — Hafalan

| Kode | Deskripsi              |
| ---- | ---------------------- |
| H0   | Belum memiliki hafalan |
| H1   | Juz ‘Amma              |
| H2   | 1–5 Juz                |
| H3   | 6–15 Juz               |
| H4   | 16–29 Juz              |
| H5   | 30 Juz (Hafidz)        |

### 2.4 Dimensi P — Pemahaman & Adab (Opsional)

| Kode | Deskripsi                    |
| ---- | ---------------------------- |
| P0   | Membaca tanpa memahami       |
| P1   | Mengetahui makna global      |
| P2   | Memahami ayat tematik        |
| P3   | Tadabbur dan penerapan nilai |

---

## 3. Peran Pengguna (User Roles)

### 3.1 Karyawan

* Melihat status kompetensi pribadi
* Melihat progres (history peningkatan)

### 3.2 Mentor / Tim Pembina

* Input & update hasil asesmen
* Melihat data kelompok binaan

### 3.3 Admin / Super Admin

* Akses dashboard agregat
* Mengelola master data level
* Monitoring statistik organisasi

---

## 4. Kebutuhan Backend (Database & API)

### 4.1 Tabel Master: `quran_levels`

| Field     | Type          | Keterangan         |
| --------- | ------------- | ------------------ |
| id        | uuid          | Primary key        |
| dimension | enum(R,T,H,P) | Dimensi kompetensi |
| code      | string        | Contoh: R1, T2     |
| label     | string        | Nama level         |
| order     | int           | Urutan level       |

### 4.2 Tabel Utama: `employee_quran_competency`

| Field               | Type      | Keterangan      |
| ------------------- | --------- | --------------- |
| id                  | uuid      | Primary key     |
| employee_id         | uuid      | Relasi ke user  |
| reading_level       | string    | R0–R3           |
| tajwid_level        | string    | T0–T3           |
| memorization_level  | string    | H0–H5           |
| understanding_level | string    | P0–P3           |
| assessed_at         | timestamp | Tanggal asesmen |
| assessor_id         | uuid      | Mentor/penilai  |

### 4.3 Tabel Riwayat (Growth Tracking): `employee_quran_history`

| Field       | Type      | Keterangan       |
| ----------- | --------- | ---------------- |
| id          | uuid      | Primary key      |
| employee_id | uuid      | Relasi user      |
| dimension   | enum      | R/T/H/P          |
| from_level  | string    | Level sebelumnya |
| to_level    | string    | Level baru       |
| updated_at  | timestamp | Waktu perubahan  |

---

## 5. API Endpoint (Contoh)

* `GET /quran/dashboard/summary`

  * Statistik agregat per dimensi

* `GET /quran/employee/{id}`

  * Detail kompetensi individu

* `POST /quran/assessment`

  * Input/update hasil asesmen

* `GET /quran/growth`

  * Data progres bulanan

---

## 6. Kebutuhan Frontend (UI/UX)

### 6.1 Dashboard Organisasi

* Bar chart distribusi level R, T, H, P
* Growth trend (bulanan / tahunan)

### 6.2 Heatmap Kompetensi

* Baris: karyawan
* Kolom: R | T | H | P
* Warna: merah → kuning → hijau

### 6.3 Detail Individu

* Kartu kompetensi
* Timeline progres
* Rekomendasi program pembinaan

---

## 6A. Form Asesmen Mentor (Checklist Penilaian)

### 6A.1 Asesmen Membaca (R)

**Metode:** Membaca langsung (random ayat)

Checklist:

* ☐ Mengenal huruf hijaiyah
* ☐ Tidak terhenti di setiap huruf
* ☐ Irama stabil (tidak terputus-putus)
* ☐ Kesalahan tidak mengubah makna

**Mapping Level:**

* R0: 0–1 ceklis
* R1: 2 ceklis (masih terbata)
* R2: 3 ceklis (lancar tapi belum stabil)
* R3: 4 ceklis (lancar & stabil)

---

### 6A.2 Asesmen Tajwid (T)

**Metode:** Tasmi’ terfokus (makharij & hukum bacaan)

Checklist:

* ☐ Makharij huruf tepat
* ☐ Mad dasar benar
* ☐ Ghunnah terdengar
* ☐ Qalqalah jelas
* ☐ Waqaf & ibtida’ sesuai

**Mapping Level:**

* T0: 0–1 ceklis
* T1: 2 ceklis
* T2: 3–4 ceklis
* T3: 5 ceklis

---

### 6A.3 Asesmen Hafalan (H)

**Metode:** Tasmi’ hafalan

Checklist:

* ☐ Lancar tanpa banyak koreksi
* ☐ Urutan ayat benar
* ☐ Tidak terhenti lama
* ☐ Tajwid hafalan terjaga

**Mapping Level:**

* H0: Tidak ada hafalan
* H1: Juz ‘Amma
* H2: 1–5 Juz
* H3: 6–15 Juz
* H4: 16–29 Juz
* H5: 30 Juz

---

### 6A.4 Asesmen Pemahaman & Adab (P)

**Metode:** Tanya jawab ringan / refleksi

Checklist:

* ☐ Mengetahui makna global ayat
* ☐ Dapat menjelaskan tema ayat
* ☐ Mengaitkan dengan perilaku
* ☐ Menjaga adab tilawah

**Mapping Level:**

* P0: 0 ceklis
* P1: 1 ceklis
* P2: 2–3 ceklis
* P3: 4 ceklis

---

## 7. Prinsip Desain & Etika Data

* ❌ Tidak ada ranking individu
* ❌ Tidak digunakan untuk punishment
* ✔ Fokus pembinaan & pertumbuhan
* ✔ Akses data individu dibatasi role

---

## 8. Output yang Diharapkan

* Dashboard informatif & humanis
* Dasar kebijakan pembinaan Qur’ani
* Budaya organisasi yang tumbuh bersama Al-Qur’an

---

## 9. Aturan Implementasi Wajib untuk Developer

1. **Tidak ada fitur ranking individu** dalam bentuk apa pun.
2. **Nilai hanya dapat diinput oleh Mentor** (bukan karyawan).
3. **Mapping level ditentukan oleh sistem**, bukan dipilih manual.
4. Setiap perubahan level **WAJIB tercatat di tabel histori**.
5. Dashboard manajemen **hanya menampilkan data agregat**, bukan detail personal.
6. UI harus sederhana, mobile-friendly, dan tidak memberi kesan menghakimi.

---

## 10. Definisi Selesai (Definition of Done)

Fitur dinyatakan **SELESAI** apabila:

* Form Asesmen Mentor berjalan sesuai checklist
* Level otomatis ter-generate dengan benar
* Riwayat perubahan tersimpan
* Dashboard agregat tampil akurat
* Hak akses role berfungsi

---

## 11. Penutup

> Sistem ini dibangun bukan untuk mengukur siapa paling tinggi,
> tetapi untuk memastikan **tidak ada yang tertinggal dalam perjalanan bersama Al-Qur’an**.

Dokumen ini bersifat **mengikat** bagi seluruh tim teknis dalam proses pengembangan.

---

**Disahkan oleh:**
Manajemen & Tim Pembinaan Qur’ani

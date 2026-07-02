# TugasKita — Panduan Setup

Kumpulin tugas tanpa ribet, tanpa takut dicomot. Mahasiswa upload tugas secara
privat, ketua kelas mengumpulkan semua dan dapat link Google Drive untuk dosen.

Stack: **Next.js 16** (App Router) · **Supabase** (Postgres + Auth + Storage) ·
**Tailwind + shadcn/ui** · **goey-toast** (notifikasi) · **Framer Motion** (animasi).

---

## 1. Buat proyek Supabase

1. Masuk ke [supabase.com](https://supabase.com) → **New project**.
2. Tunggu provisioning selesai (~2 menit).

## 2. Jalankan skema database

1. Buka **SQL Editor** → **New query**.
2. Salin seluruh isi [`supabase/schema.sql`](./supabase/schema.sql) → tempel → **Run**.
3. Ini membuat semua tabel, trigger profil, RLS, dan bucket storage privat `tugas`.

## 3. Konfigurasi Auth

1. **Authentication → Sign In / Providers → Email**: pastikan **Email** aktif.
2. Untuk testing cepat, matikan **Confirm email**
   (Authentication → Sign In / Providers → Email → *Confirm email* = off).
   Kalau dibiarkan on, user harus klik link verifikasi di email dulu sebelum login.

## 4. Isi environment variables

1. Salin `.env.local.example` menjadi `.env.local`.
2. Isi 3 nilai dari **Project Settings → API Keys / Data API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL proyek
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role / secret key (**rahasia**, server only)

```bash
cp .env.local.example .env.local   # lalu edit isinya
```

## 5. Jalankan

```bash
npm run dev
```

Buka http://localhost:3000

## 6. Google Drive (opsional — untuk kirim ke dosen via link)

Menggantikan tombol "Download Semua (.zip)" dengan pembuatan folder Google Drive
otomatis. Ketua kelas cukup klik satu tombol, semua file tugas diupload ke folder
Google Drive dan dapat link yang bisa dibagikan ke dosen.

### 6a. Buat kredensial Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com) → **Buat project baru**.
2. Buka **APIs & Services → Library**, cari **Google Drive API** → **Enable**.
3. Buka **APIs & Services → Credentials** → **Create Credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. Di **Authorized redirect URIs**, tambahkan:
   - `http://localhost:3000/api/drive/callback` (development)
   - `https://domain-anda.com/api/drive/callback` (production)
6. Klik **Create**, salin **Client ID** dan **Client Secret**.

### 6b. Isi environment variables

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### 6c. Jalankan migrasi database

Buka Supabase Dashboard → **SQL Editor** → jalankan isi
[`supabase/migrations/002_google_tokens.sql`](./supabase/migrations/002_google_tokens.sql).

Atau jalankan ulang [`supabase/schema.sql`](./supabase/schema.sql) (sudah termasuk
tabel `google_tokens`).

### 6d. Sambungkan akun Google

1. Jalankan `npm run dev` dan buka aplikasi.
2. Klik profil (kanan atas) → **Google Drive**.
3. Klik **Sambungkan Google Drive**.
4. Login ke akun Google yang akan dipakai sebagai penyimpanan tugas.
5. Beri izin akses Drive.
6. Setelah berhasil, status berubah menjadi "Google Drive tersambung".

---

## Cara pakai (alur)

1. **Register** — isi nama, NIM, email, password. Profil dibuat otomatis via trigger.
2. **Ketua** membuat tugas di **Buat Kelas** → dapat **invite code** 8 karakter → bagikan.
3. **Anggota** klik **Join Kelas** → masukkan invite code → tergabung.
4. Semua anggota (termasuk ketua) **upload** tugas di halaman detail. File otomatis
   di-rename `{NIM}_{Nama}.{ext}`, maks **25MB**, tipe: docx/pdf/pptx/xlsx/zip/rar.
   Mahasiswa bisa **mengganti nama file** mereka sendiri dengan klik ikon pensil.
5. **Ketua** memantau progress ("8/12 sudah upload") dan klik **Buat Link Google Drive**
   → semua file terupload ke folder Google Drive. Link siap dibagikan ke dosen.
   Alternatif: link **Download ZIP** tersedia sebagai cadangan kecil di pojok.

## Catatan desain

- **Ketua bersifat per-tugas**: siapa pun bisa membuat kelas (jadi ketua kelas itu)
  dan sekaligus ikut kelas lain sebagai anggota. Kolom `profiles.role` disimpan untuk
  kebutuhan mendatang tapi tidak membatasi pembuatan tugas.
- **Export** memakai `service_role` key di server (streaming zip via `archiver`) agar
  aman terhadap file besar dan tidak terhalang RLS storage.
- **Google Drive** memakai OAuth 2.0 dengan satu akun Google tetap. Refresh token
  disimpan di tabel `google_tokens`. Setup dilakukan sekali via halaman `/setup-google`.

## Troubleshooting

- **"new row violates row-level security"** saat upload → pastikan kamu sudah *join*
  kelasnya (anggota), dan `schema.sql` sudah dijalankan penuh.
- **Login gagal padahal password benar** → cek apakah *Confirm email* masih on; verifikasi
  email dulu atau matikan opsi tersebut.
- **Export 500 / kosong** → pastikan `SUPABASE_SERVICE_ROLE_KEY` terisi benar di `.env.local`
  lalu restart `npm run dev`.
- **Google Drive gagal "refresh token"** → buka profil → Google Drive → sambungkan ulang.
  Pastikan akun Google punya cukup storage (15GB gratis).
- **"Tidak mendapat refresh_token"** → hapus akses aplikasi di
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions),
  lalu sambungkan ulang.

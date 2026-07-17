# TugasKita

Platform kolaborasi tugas kuliah. Dosen/buat tugas, invite teman via kode, upload file, dan kelola semuanya dari satu dashboard.

## Fitur

- **Tugas Individu & Kelompok** — buat tugas dengan tipe individu atau kelompok (otomatis bagi anggota)
- **Kode Invite** — gabung ke tugas pakai kode 8 karakter, tanpa perlu daftar ulang
- **Upload File** — drag & drop file tugas, langsung tersimpan di Supabase Storage
- **Google Drive Integration** — generate folder Drive otomatis per tugas, share link ke dosen
- **Dashboard Ketua** — lihat progress submission semua anggota secara real-time
- **Kelompok Management** — atur kelompok, pilih perwakilan, track submission per kelompok
- **Dark Mode** — support light/dark theme

## Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS, shadcn/ui, Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Cloud Storage | Google Drive API |
| Deploy | Vercel |

## Struktur Database

```
profiles          → data user (nama, nim, role)
assignments       → tugas (kelas, deadline, tipe, kode invite)
assignment_members → siapa yang join ke tugas mana
assignment_kelompok → kelompok untuk tugas bertipe kelompok
kelompok_members  → anggota dalam kelompok
submissions       → file yang diupload user
```

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/Aaronabil/tugaskita.git
cd tugaskita
npm install
```

### 2. Environment Variables

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
```

### 3. Database Setup

Jalankan SQL schema di Supabase Dashboard > SQL Editor:

```bash
# Schema utama
cat supabase/schema.sql

# Migrations (jalankan urut)
cat supabase/migrations/001_gdrive.sql
cat supabase/migrations/002_google_tokens.sql
cat supabase/migrations/003_kelompok.sql
```

### 4. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Deploy

Deploy ke Vercel:

```bash
npx vercel
```

Tambahkan environment variables di Vercel Dashboard > Settings > Environment Variables.

## License

Private

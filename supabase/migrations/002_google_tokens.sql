-- ============================================================================
-- TugasKita — Migrasi: tabel penyimpanan token Google Drive
-- Jalankan di Supabase SQL Editor setelah migrasi 001 dijalankan.
-- ============================================================================

-- Menyimpan token OAuth 2.0 akun Google yang dipakai sebagai penyimpanan
-- tetap file tugas. Hanya 1 baris (singleton) karena kita pakai 1 akun tetap.
create table if not exists public.google_tokens (
  id            int primary key default 1,
  access_token  text not null,
  refresh_token text not null,
  token_expiry  timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint google_tokens_singleton check (id = 1)
);

-- Regular user tidak boleh lihat token.
alter table public.google_tokens enable row level security;

-- Hanya service_role (admin client) yang boleh baca/tulis token.
drop policy if exists "google_tokens_admin_all" on public.google_tokens;
create policy "google_tokens_admin_all"
  on public.google_tokens
  to service_role
  using (true)
  with check (true);

-- Baris pertama (singleton) diisi oleh OAuth callback.
insert into public.google_tokens (id, access_token, refresh_token, token_expiry)
values (1, '', '', now())
on conflict (id) do nothing;

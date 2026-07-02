-- ============================================================================
-- TugasKita — Skema Database Supabase (Postgres)
-- Jalankan seluruh file ini di Supabase Dashboard → SQL Editor → New query → Run.
-- Aman dijalankan ulang (idempotent) selama urutan tidak diubah.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------------

-- profiles: memperluas auth.users (dibuat otomatis via trigger saat signup)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nama       text not null,
  nim        text not null unique,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- assignments: satu baris = satu tugas kelas. Pembuatnya = ketua (admin) tugas itu.
create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  nama_kelas      text not null,
  nama_tugas      text not null,
  deskripsi       text,
  deadline        timestamptz,
  invite_code     text not null unique,        -- kode 8 karakter untuk join
  created_by      uuid not null references public.profiles(id) on delete cascade,
  tipe            text not null default 'individu' check (tipe in ('individu', 'kelompok')),
  jumlah_kelompok int,
  gdrive_folder_id text,                       -- id folder Google Drive (bila sudah digenerate)
  gdrive_link      text,                       -- link folder Drive yang dibagikan ke dosen
  created_at      timestamptz not null default now()
);

-- assignment_members: siapa saja yang tergabung di sebuah tugas
create table if not exists public.assignment_members (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  unique (assignment_id, user_id)
);

-- assignment_kelompok: kelompok untuk tugas bertipe 'kelompok'
create table if not exists public.assignment_kelompok (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  nama_kelompok text not null,
  nomor         int not null,
  unique (assignment_id, nomor)
);

-- kelompok_members: anggota dalam suatu kelompok
create table if not exists public.kelompok_members (
  id                uuid primary key default gen_random_uuid(),
  kelompok_id       uuid not null references public.assignment_kelompok(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  is_representative boolean not null default false,
  unique (kelompok_id, user_id)
);

-- submissions: file submission — 1 per user untuk individu, multiple per kelompok untuk kelompok
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kelompok_id   uuid references public.assignment_kelompok(id) on delete cascade,
  file_path     text not null,             -- path di Supabase Storage
  file_name     text not null,             -- nama bersih: {NIM}_{Nama}.{ext}
  file_size     bigint,
  uploaded_at   timestamptz not null default now()
);

-- Individu: 1 file per user per tugas. Kelompok: boleh multiple file per kelompok.
create unique index if not exists submissions_individu_unique
  on public.submissions(assignment_id, user_id)
  where kelompok_id is null;

create index if not exists idx_members_assignment on public.assignment_members(assignment_id);
create index if not exists idx_members_user       on public.assignment_members(user_id);
create index if not exists idx_subs_assignment    on public.submissions(assignment_id);
create index if not exists idx_assignments_creator on public.assignments(created_by);

-- google_tokens: menyimpan token OAuth 2.0 akun Google tetap untuk Drive.
-- Hanya 1 baris (singleton, id=1); diakses oleh service_role dari API route.
create table if not exists public.google_tokens (
  id            int primary key default 1,
  access_token  text not null,
  refresh_token text not null,
  token_expiry  timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint google_tokens_singleton check (id = 1)
);

alter table public.google_tokens enable row level security;

drop policy if exists "google_tokens_admin_all" on public.google_tokens;
create policy "google_tokens_admin_all"
  on public.google_tokens
  to service_role
  using (true)
  with check (true);

-- Baris singleton; token diisi oleh OAuth callback setup.
insert into public.google_tokens (id, access_token, refresh_token, token_expiry)
values (1, '', '', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: buat profile otomatis saat user baru mendaftar
--    nama & nim diambil dari user_metadata yang dikirim saat signUp().
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, nim, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', 'Tanpa Nama'),
    coalesce(new.raw_user_meta_data ->> 'nim', new.id::text),
    coalesce(new.raw_user_meta_data ->> 'role', 'member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. HELPER: generator invite_code 8 karakter (fallback default kolom)
--    Aplikasi juga generate kode sendiri + retry saat bentrok.
-- ---------------------------------------------------------------------------

create or replace function public.gen_invite_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- tanpa I,O,0,1,L (mudah dibaca)
  result text := '';
  i      int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.assignments        enable row level security;
alter table public.assignment_members enable row level security;
alter table public.submissions        enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- assignments ---------------------------------------------------------------
-- Siapa pun yang login boleh baca (agar bisa lookup via invite code saat join).
drop policy if exists "assignments_select_all" on public.assignments;
create policy "assignments_select_all"
  on public.assignments for select
  to authenticated
  using (true);

-- Siapa pun yang login boleh membuat tugas; ia otomatis jadi ketua tugas itu.
drop policy if exists "assignments_insert_own" on public.assignments;
create policy "assignments_insert_own"
  on public.assignments for insert
  to authenticated
  with check (created_by = (select auth.uid()));

-- Hanya pembuat yang boleh ubah / hapus tugasnya.
drop policy if exists "assignments_update_own" on public.assignments;
create policy "assignments_update_own"
  on public.assignments for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "assignments_delete_own" on public.assignments;
create policy "assignments_delete_own"
  on public.assignments for delete
  to authenticated
  using (created_by = (select auth.uid()));

-- assignment_members --------------------------------------------------------
drop policy if exists "members_select_all" on public.assignment_members;
create policy "members_select_all"
  on public.assignment_members for select
  to authenticated
  using (true);

-- User hanya bisa mendaftarkan dirinya sendiri (join).
drop policy if exists "members_insert_self" on public.assignment_members;
create policy "members_insert_self"
  on public.assignment_members for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- User boleh keluar (hapus keanggotaan sendiri); ketua boleh keluarkan anggota.
drop policy if exists "members_delete_self_or_owner" on public.assignment_members;
create policy "members_delete_self_or_owner"
  on public.assignment_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.created_by = (select auth.uid())
    )
  );

-- assignment_kelompok -------------------------------------------------------
drop policy if exists "kelompok_select_all" on public.assignment_kelompok;
create policy "kelompok_select_all"
  on public.assignment_kelompok for select
  to authenticated
  using (true);

-- Insert/update/delete hanya oleh ketua tugas.
drop policy if exists "kelompok_insert_owner" on public.assignment_kelompok;
create policy "kelompok_insert_owner"
  on public.assignment_kelompok for insert
  to authenticated
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.created_by = (select auth.uid())
    )
  );

drop policy if exists "kelompok_update_owner" on public.assignment_kelompok;
create policy "kelompok_update_owner"
  on public.assignment_kelompok for update
  to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.created_by = (select auth.uid())
    )
  );

drop policy if exists "kelompok_delete_owner" on public.assignment_kelompok;
create policy "kelompok_delete_owner"
  on public.assignment_kelompok for delete
  to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.created_by = (select auth.uid())
    )
  );

-- kelompok_members ----------------------------------------------------------
drop policy if exists "km_select_all" on public.kelompok_members;
create policy "km_select_all"
  on public.kelompok_members for select
  to authenticated
  using (true);

-- User hanya bisa mendaftarkan dirinya sendiri ke kelompok.
drop policy if exists "km_insert_self" on public.kelompok_members;
create policy "km_insert_self"
  on public.kelompok_members for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- User boleh keluar sendiri; ketua tugas boleh hapus anggota kelompok.
drop policy if exists "km_delete_self_or_owner" on public.kelompok_members;
create policy "km_delete_self_or_owner"
  on public.kelompok_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.assignment_kelompok ak
      join public.assignments a on a.id = ak.assignment_id
      where ak.id = kelompok_id and a.created_by = (select auth.uid())
    )
  );

-- submissions ---------------------------------------------------------------
-- Anggota baca miliknya/submission kelompoknya; ketua tugas baca semua.
drop policy if exists "submissions_select_own_or_owner" on public.submissions;
create policy "submissions_select_own_or_owner"
  on public.submissions for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (kelompok_id is not null and exists (
      select 1 from public.kelompok_members km
      where km.kelompok_id = submissions.kelompok_id
        and km.user_id = (select auth.uid())
    ))
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.created_by = (select auth.uid())
    )
  );

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own"
  on public.submissions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "submissions_update_own" on public.submissions;
create policy "submissions_update_own"
  on public.submissions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "submissions_delete_own" on public.submissions;
create policy "submissions_delete_own"
  on public.submissions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. STORAGE: bucket privat "tugas" + policy
--    Struktur path: {assignment_id}/{user_id}/{filename}
--    foldername(name)[1] = assignment_id, [2] = user_id
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('tugas', 'tugas', false)
on conflict (id) do nothing;

-- Upload/replace: hanya ke folder milik sendiri, dan hanya jika anggota tugas.
drop policy if exists "tugas_insert_own" on storage.objects;
create policy "tugas_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tugas'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.assignment_members m
      where m.assignment_id = ((storage.foldername(name))[1])::uuid
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "tugas_update_own" on storage.objects;
create policy "tugas_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tugas'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "tugas_delete_own" on storage.objects;
create policy "tugas_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tugas'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- Baca: file sendiri, atau ketua tugas boleh baca semua file di tugasnya.
drop policy if exists "tugas_select_own_or_owner" on storage.objects;
create policy "tugas_select_own_or_owner"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tugas'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or exists (
        select 1 from public.assignments a
        where a.id = ((storage.foldername(name))[1])::uuid
          and a.created_by = (select auth.uid())
      )
    )
  );

-- ============================================================================
-- Selesai. Salin URL & keys proyek ke .env.local (lihat SETUP.md).
-- ============================================================================

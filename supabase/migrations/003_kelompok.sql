-- ============================================================================
-- Migration 003: Tipe Assignment (Individu / Kelompok) + Group Folders
-- ============================================================================

-- 1) assignments — tambah kolom tipe & jumlah_kelompok
alter table public.assignments
  add column if not exists tipe text not null default 'individu'
    check (tipe in ('individu', 'kelompok')),
  add column if not exists jumlah_kelompok int;

-- 2) assignment_kelompok — daftar kelompok untuk tugas kelompok
create table if not exists public.assignment_kelompok (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  nama_kelompok text not null,
  nomor         int not null,
  unique (assignment_id, nomor)
);

-- 3) kelompok_members — anggota dalam suatu kelompok
create table if not exists public.kelompok_members (
  id                uuid primary key default gen_random_uuid(),
  kelompok_id       uuid not null references public.assignment_kelompok(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  is_representative boolean not null default false,
  unique (kelompok_id, user_id)
);

-- 4) submissions — tambah kelompok_id & ubah unique constraint
alter table public.submissions
  add column if not exists kelompok_id uuid references public.assignment_kelompok(id) on delete cascade;

-- Hapus unique constraint lama, ganti partial unique (cuma untuk individu)
alter table public.submissions
  drop constraint if exists submissions_assignment_id_user_id_key;

create unique index if not exists submissions_individu_unique
  on public.submissions(assignment_id, user_id)
  where kelompok_id is null;

-- 5) Indeks baru
create index if not exists idx_kelompok_assignment on public.assignment_kelompok(assignment_id);
create index if not exists idx_km_kelompok on public.kelompok_members(kelompok_id);
create index if not exists idx_km_user on public.kelompok_members(user_id);
create index if not exists idx_subs_kelompok on public.submissions(kelompok_id);

-- 6) RLS — assignment_kelompok
alter table public.assignment_kelompok enable row level security;

drop policy if exists "kelompok_select_all" on public.assignment_kelompok;
create policy "kelompok_select_all"
  on public.assignment_kelompok for select
  to authenticated
  using (true);

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

-- 7) RLS — kelompok_members
alter table public.kelompok_members enable row level security;

drop policy if exists "km_select_all" on public.kelompok_members;
create policy "km_select_all"
  on public.kelompok_members for select
  to authenticated
  using (true);

drop policy if exists "km_insert_self" on public.kelompok_members;
create policy "km_insert_self"
  on public.kelompok_members for insert
  to authenticated
  with check (user_id = (select auth.uid()));

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
    or exists (
      select 1 from public.kelompok_members rep
      where rep.kelompok_id = kelompok_members.kelompok_id
        and rep.user_id = (select auth.uid())
        and rep.is_representative = true
    )
  );

-- 8) Update RLS submissions — anggota kelompok juga bisa lihat submission kelompoknya
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

-- ============================================================================
-- TugasKita — Migrasi: integrasi Google Drive
-- Jalankan di Supabase SQL Editor bila skema awal SUDAH pernah dijalankan.
-- (Kalau membuat DB dari nol, cukup pakai schema.sql yang sudah diperbarui.)
-- ============================================================================

alter table public.assignments
  add column if not exists gdrive_folder_id text,
  add column if not exists gdrive_link text;

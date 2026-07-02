import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client (service_role) — HANYA untuk server (API export).
 * Melewati RLS, jadi jangan pernah diimpor ke kode client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

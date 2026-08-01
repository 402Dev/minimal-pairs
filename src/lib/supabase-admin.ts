import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Server-only Supabase client using the service-role key, which bypasses
 * Row Level Security. Used exclusively by /api/admin/* route handlers so
 * the hidden admin panel can read/write/delete freely without loosening
 * the public-facing RLS policies (which only allow inserts/selects).
 *
 * Never import this from client components or any code that ships to
 * the browser — the `server-only` import above makes that a build error.
 */
export const isAdminSupabaseConfigured = Boolean(isSupabaseConfigured && SUPABASE_SERVICE_ROLE_KEY);

export const supabaseAdmin: SupabaseClient | null = isAdminSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    })
  : null;

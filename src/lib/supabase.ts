import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

export const AUDIO_BUCKET = "audio-uploads";
export const RECORDINGS_TABLE = "recordings";
export const SPEAKERS_TABLE = "speakers";
export const PROMPTS_TABLE = "prompts";

/**
 * Browser/client-side Supabase client. `null` when Supabase env vars are
 * absent, in which case the app uses the local storage/SQLite fallback
 * (see /api/upload and /api/recordings).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null;

import { RECORDINGS_TABLE, supabase } from "@/lib/supabase";

/**
 * Returns the set of prompt ids a speaker has already recorded, so the
 * client can skip them — a speaker should never be shown (or able to
 * submit) the same prompt twice. Uses Supabase when configured
 * (recordings are publicly readable); otherwise the local /api/recordings
 * GET fallback (SQLite).
 */
export async function getCompletedPromptIds(speakerId: string): Promise<Set<string>> {
  if (supabase) {
    const { data, error } = await supabase
      .from(RECORDINGS_TABLE)
      .select("prompt_id")
      .eq("speaker_id", speakerId);

    if (error) {
      throw new Error(error.message);
    }
    return new Set((data ?? []).map((row) => row.prompt_id as string));
  }

  const response = await fetch(`/api/recordings?speakerId=${encodeURIComponent(speakerId)}`);
  if (!response.ok) {
    throw new Error("Failed to load recording history.");
  }
  const { promptIds } = (await response.json()) as { promptIds: string[] };
  return new Set(promptIds);
}

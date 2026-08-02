import { SPEAKERS_TABLE, supabase } from "@/lib/supabase";

interface FindOrCreateSpeakerArgs {
  name: string;
  birthYear: string;
  dialect?: string;
}

export interface SpeakerMatch {
  id: string;
  name: string;
  birthYear: string;
}

/**
 * Frictionless soft-auth: a speaker is identified by "name" + the last two
 * digits of their birth year in the Persian calendar, instead of a
 * password. Looks up an existing speaker with a matching
 * (case/whitespace-insensitive) pair before creating a new one, so the
 * same person is recognized as a returning visitor on any device. Uses
 * Supabase when configured; otherwise falls back to the local
 * /api/speakers route (SQLite). Returns the speaker's id.
 */
export async function findOrCreateSpeaker({
  name,
  birthYear,
  dialect,
}: FindOrCreateSpeakerArgs): Promise<string> {
  if (supabase) {
    const { data: existing, error: lookupError } = await supabase
      .from(SPEAKERS_TABLE)
      .select("id")
      .ilike("name", name.trim())
      .ilike("birth_year", birthYear.trim())
      .limit(1)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);

    if (existing) {
      // If they are a returning speaker but now picking a dialect (e.g. German page), update it!
      if (dialect) {
        await supabase
          .from(SPEAKERS_TABLE)
          .update({ dialect })
          .eq("id", existing.id);
      }
      return existing.id as string;
    }

    // Insert new speaker with dialect
    const { data, error } = await supabase
      .from(SPEAKERS_TABLE)
      .insert({
        name: name.trim(),
        birth_year: birthYear.trim(),
        dialect: dialect || null, // <-- Add dialect to insert
      })
      .select("id")
      .single();

    if (error || !data)
      throw new Error(error?.message ?? "Failed to create speaker.");
    return data.id as string;
  }

  // Local fallback
  const response = await fetch("/api/speakers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, birthYear, dialect }), // <-- Pass to API
  });

  if (!response.ok) throw new Error("Failed to create speaker.");
  const { id } = await response.json();
  return id as string;
}

/**
 * Fetches speaker details (name, birth year) for a given speaker id.
 * Returns null if the speaker no longer exists.
 */
export async function getSpeakerDetails(
  speakerId: string,
): Promise<SpeakerMatch | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from(SPEAKERS_TABLE)
      .select("id, name, birth_year")
      .eq("id", speakerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: data.id as string,
      name: data.name as string,
      birthYear: data.birth_year as string,
    };
  }

  const response = await fetch(
    `/api/speakers?id=${encodeURIComponent(speakerId)}`,
  );
  if (!response.ok) throw new Error("Failed to fetch speaker details.");
  const { exists, speaker } = await response.json();
  if (!exists || !speaker) return null;
  return speaker as SpeakerMatch;
}

/**
 * Confirms a stored speaker_id still refers to a real row. A returning
 * visitor's localStorage can point at a speaker that no longer exists
 * (e.g. the database was reset, or the row was deleted via the admin
 * panel) — in that case the "already recorded" lookup would otherwise
 * come back empty (not an error) and silently show every prompt as
 * unfinished. Checking existence up front lets the caller fall back to
 * onboarding instead.
 */
export async function speakerExists(speakerId: string): Promise<boolean> {
  const details = await getSpeakerDetails(speakerId);
  return Boolean(details);
}

/**
 * Looks up speakers by a partial, case-insensitive name match, so the
 * intake form can offer a "pick yourself from a list" shortcut instead of
 * making a returning visitor retype their birth year. Returns at most a
 * handful of matches; an empty/short query returns none.
 */
export async function searchSpeakersByName(
  name: string,
): Promise<SpeakerMatch[]> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return [];

  if (supabase) {
    const { data, error } = await supabase
      .from(SPEAKERS_TABLE)
      .select("id, name, birth_year")
      .ilike("name", `%${trimmed}%`)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      birthYear: row.birth_year as string,
    }));
  }

  const response = await fetch(
    `/api/speakers?name=${encodeURIComponent(trimmed)}`,
  );
  if (!response.ok) return [];
  const { speakers } = await response.json();
  return speakers as SpeakerMatch[];
}

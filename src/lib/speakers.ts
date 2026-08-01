import { SPEAKERS_TABLE, supabase } from "@/lib/supabase";

interface FindOrCreateSpeakerArgs {
  name: string;
  favoriteFood: string;
}

/**
 * Frictionless soft-auth: a speaker is identified by "name" + "favorite
 * Iranian food" instead of a password. Looks up an existing speaker with
 * a matching (case/whitespace-insensitive) pair before creating a new
 * one, so the same person is recognized as a returning visitor on any
 * device. Uses Supabase when configured; otherwise falls back to the
 * local /api/speakers route (SQLite). Returns the speaker's id.
 */
export async function findOrCreateSpeaker({
  name,
  favoriteFood,
}: FindOrCreateSpeakerArgs): Promise<string> {
  if (supabase) {
    const { data: existing, error: lookupError } = await supabase
      .from(SPEAKERS_TABLE)
      .select("id")
      .ilike("name", name.trim())
      .ilike("favorite_food", favoriteFood.trim())
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }
    if (existing) {
      return existing.id as string;
    }

    const { data, error } = await supabase
      .from(SPEAKERS_TABLE)
      .insert({ name: name.trim(), favorite_food: favoriteFood.trim() })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create speaker.");
    }
    return data.id as string;
  }

  const response = await fetch("/api/speakers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, favoriteFood }),
  });
  if (!response.ok) {
    throw new Error("Failed to create speaker.");
  }
  const { id } = await response.json();
  return id as string;
}

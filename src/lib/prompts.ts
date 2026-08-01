import { PROMPTS_TABLE, supabase } from "@/lib/supabase";
import { getLocalDb } from "@/lib/local-db";
import type { Prompt } from "@/lib/types";

export interface LanguagePrompts {
  /** Canonical casing as stored in the database (e.g. "persian" -> "Persian"). */
  language: string;
  prompts: Prompt[];
}

/**
 * Server-only: fetches the ordered prompt sequence for a language,
 * matching case-insensitively so `/Persian`, `/persian`, and `/PERSIAN`
 * all resolve to the same prompts. Uses Supabase when configured;
 * otherwise reads directly from the local SQLite fallback. Only ever
 * called from Server Components / route handlers — never import this
 * from a "use client" file.
 */
export async function getPromptsForLanguage(language: string): Promise<LanguagePrompts> {
  const trimmed = language.trim();

  if (supabase) {
    const { data, error } = await supabase
      .from(PROMPTS_TABLE)
      .select("id, language, word_or_phrase, sequence_order")
      .ilike("language", trimmed)
      .order("sequence_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    const prompts = (data ?? []) as Prompt[];
    return { language: prompts[0]?.language ?? titleCase(trimmed), prompts };
  }

  const db = getLocalDb();
  const prompts = db
    .prepare(
      `SELECT id, language, word_or_phrase, sequence_order
       FROM prompts
       WHERE lower(language) = lower(?)
       ORDER BY sequence_order ASC`
    )
    .all(trimmed) as Prompt[];

  return { language: prompts[0]?.language ?? titleCase(trimmed), prompts };
}

/** Fallback display casing for languages with no seeded prompts yet. */
function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

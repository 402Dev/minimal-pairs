import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getLocalDb } from "@/lib/local-db";
import { AUDIO_BUCKET, PROMPTS_TABLE, RECORDINGS_TABLE, SPEAKERS_TABLE } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

interface LocalRecordingRow {
  id: string;
  audio_path: string;
  created_at: string;
  speaker_id: string;
  prompt_id: string;
  speaker_name: string;
  speaker_food: string;
  language: string;
  word_or_phrase: string;
}

/**
 * All recordings joined with their speaker and prompt, plus a playable
 * audio URL — Supabase Storage public URL for the cloud backend, or the
 * already-static /uploads path for the local fallback.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();

  if (supabaseAdmin) {
    const admin = supabaseAdmin;
    const { data, error } = await admin
      .from(RECORDINGS_TABLE)
      .select(
        `id, audio_path, created_at,
         speaker:${SPEAKERS_TABLE}(id, name, favorite_food),
         prompt:${PROMPTS_TABLE}(id, language, word_or_phrase)`
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recordings = (data ?? []).map((row) => {
      const speaker = Array.isArray(row.speaker) ? row.speaker[0] : row.speaker;
      const prompt = Array.isArray(row.prompt) ? row.prompt[0] : row.prompt;
      return {
        id: row.id,
        createdAt: row.created_at,
        audioUrl: admin.storage.from(AUDIO_BUCKET).getPublicUrl(row.audio_path).data.publicUrl,
        speaker: speaker ? { id: speaker.id, name: speaker.name, favoriteFood: speaker.favorite_food } : null,
        prompt: prompt ? { id: prompt.id, language: prompt.language, wordOrPhrase: prompt.word_or_phrase } : null,
      };
    });

    return NextResponse.json({ recordings });
  }

  const db = getLocalDb();
  const rows = db
    .prepare(
      `SELECT r.id, r.audio_path, r.created_at, r.speaker_id, r.prompt_id,
              s.name as speaker_name, s.favorite_food as speaker_food,
              p.language as language, p.word_or_phrase as word_or_phrase
       FROM recordings r
       JOIN speakers s ON s.id = r.speaker_id
       JOIN prompts p ON p.id = r.prompt_id
       ORDER BY r.created_at DESC`
    )
    .all() as LocalRecordingRow[];

  const recordings = rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    audioUrl: row.audio_path,
    speaker: { id: row.speaker_id, name: row.speaker_name, favoriteFood: row.speaker_food },
    prompt: { id: row.prompt_id, language: row.language, wordOrPhrase: row.word_or_phrase },
  }));

  return NextResponse.json({ recordings });
}

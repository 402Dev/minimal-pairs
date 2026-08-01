import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getLocalDb } from "@/lib/local-db";
import { RECORDINGS_TABLE, SPEAKERS_TABLE } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/** All speakers with a count of how many recordings each has submitted. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();

  if (supabaseAdmin) {
    const [{ data: speakers, error: speakersError }, { data: recordings, error: recordingsError }] =
      await Promise.all([
        supabaseAdmin.from(SPEAKERS_TABLE).select("id, name, favorite_food, created_at"),
        supabaseAdmin.from(RECORDINGS_TABLE).select("speaker_id"),
      ]);

    if (speakersError) return NextResponse.json({ error: speakersError.message }, { status: 500 });
    if (recordingsError) return NextResponse.json({ error: recordingsError.message }, { status: 500 });

    const counts = new Map<string, number>();
    for (const row of recordings ?? []) {
      counts.set(row.speaker_id, (counts.get(row.speaker_id) ?? 0) + 1);
    }

    const result = (speakers ?? [])
      .map((speaker) => ({
        id: speaker.id,
        name: speaker.name,
        favoriteFood: speaker.favorite_food,
        createdAt: speaker.created_at,
        recordingCount: counts.get(speaker.id) ?? 0,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ speakers: result });
  }

  const db = getLocalDb();
  const speakers = db
    .prepare(
      `SELECT s.id, s.name, s.favorite_food, s.created_at,
              (SELECT COUNT(*) FROM recordings r WHERE r.speaker_id = s.id) as recording_count
       FROM speakers s
       ORDER BY s.created_at DESC`
    )
    .all() as {
    id: string;
    name: string;
    favorite_food: string;
    created_at: string;
    recording_count: number;
  }[];

  return NextResponse.json({
    speakers: speakers.map((s) => ({
      id: s.id,
      name: s.name,
      favoriteFood: s.favorite_food,
      createdAt: s.created_at,
      recordingCount: s.recording_count,
    })),
  });
}

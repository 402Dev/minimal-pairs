import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLocalDb } from "@/lib/local-db";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Local SQLite fallback: returns the prompt ids a speaker has already
 * recorded, so the client can skip them (mirrors the Supabase client-side
 * select in lib/recordings-status.ts).
 */
export async function GET(request: NextRequest) {
  const speakerId = request.nextUrl.searchParams.get("speakerId");
  if (!speakerId) {
    return NextResponse.json(
      { error: "Missing speakerId." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const db = getLocalDb();
  const rows = db
    .prepare(`SELECT prompt_id FROM recordings WHERE speaker_id = ?`)
    .all(speakerId) as { prompt_id: string }[];

  return NextResponse.json(
    { promptIds: rows.map((row) => row.prompt_id) },
    { headers: CORS_HEADERS }
  );
}

/**
 * Local SQLite fallback for when Supabase isn't configured. Inserts a
 * recording row linking a speaker and a prompt, mirroring the Supabase
 * `recordings` table schema.
 */
export async function POST(request: NextRequest) {
  try {
    const { speakerId, promptId, audioPath } = await request.json();

    if (!speakerId || !promptId || !audioPath) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const db = getLocalDb();

    // A stale speaker_id (e.g. left over in a browser's localStorage
    // after the local dev database was reset, or after an admin deleted
    // the speaker) would otherwise surface as an opaque foreign-key
    // constraint failure. Check up front and return a specific code so
    // the client can recognize it and gracefully restart onboarding.
    const speakerExists = db.prepare(`SELECT 1 FROM speakers WHERE id = ?`).get(speakerId);
    if (!speakerExists) {
      return NextResponse.json(
        { error: "Speaker not found.", code: "SPEAKER_NOT_FOUND" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const promptExists = db.prepare(`SELECT 1 FROM prompts WHERE id = ?`).get(promptId);
    if (!promptExists) {
      return NextResponse.json(
        { error: "Prompt not found.", code: "PROMPT_NOT_FOUND" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO recordings (id, speaker_id, prompt_id, audio_path)
       VALUES (?, ?, ?, ?)`
    ).run(id, speakerId, promptId, audioPath);

    return NextResponse.json({ id }, { headers: CORS_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        {
          error: "This prompt has already been recorded by this speaker.",
          code: "ALREADY_RECORDED",
        },
        { status: 409, headers: CORS_HEADERS }
      );
    }
    console.error("Local recording insert failed:", error);
    return NextResponse.json(
      { error: "Failed to save recording." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

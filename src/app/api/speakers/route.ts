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
 * Local SQLite fallback: search speakers by a (partial) name match, so the
 * intake form can offer "pick yourself from a list" instead of retyping.
 * Capped to a handful of results — this is a convenience shortcut, not a
 * full directory. Also supports an `id` lookup so the client can confirm a
 * stored speaker_id still exists (e.g. after a database reset), instead of
 * silently treating "no recordings found" as "no recordings yet".
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (id) {
    const db = getLocalDb();
    const row = db
      .prepare(`SELECT id, name, birth_year FROM speakers WHERE id = ?`)
      .get(id) as { id: string; name: string; birth_year: string } | undefined;
    return NextResponse.json(
      {
        exists: Boolean(row),
        speaker: row
          ? { id: row.id, name: row.name, birthYear: row.birth_year }
          : null,
      },
      { headers: CORS_HEADERS },
    );
  }

  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (name.length < 2) {
    return NextResponse.json({ speakers: [] }, { headers: CORS_HEADERS });
  }

  const db = getLocalDb();
  const rows = db
    .prepare(
      `SELECT id, name, birth_year FROM speakers
       WHERE lower(name) LIKE lower(?)
       ORDER BY created_at DESC
       LIMIT 8`,
    )
    .all(`%${name}%`) as { id: string; name: string; birth_year: string }[];

  return NextResponse.json(
    {
      speakers: rows.map((r) => ({
        id: r.id,
        name: r.name,
        birthYear: r.birth_year,
      })),
    },
    { headers: CORS_HEADERS },
  );
}

/**
 * Local SQLite fallback for when Supabase isn't configured. Finds an
 * existing speaker by name + birth year (case/whitespace-insensitive),
 * or registers a new one, mirroring the Supabase `speakers` table schema.
 */
export async function POST(request: NextRequest) {
  try {
    const { name, birthYear, dialect } = await request.json();

    if (!name || !birthYear) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const db = getLocalDb();
    const existing = db
      .prepare(
        `SELECT id FROM speakers WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(birth_year)) = lower(trim(?))`,
      )
      .get(name, birthYear) as { id: string } | undefined;

    if (existing) {
      // Update local DB dialect for returning speaker
      if (dialect) {
        db.prepare(`UPDATE speakers SET dialect = ? WHERE id = ?`).run(
          dialect,
          existing.id,
        );
      }
      return NextResponse.json({ id: existing.id }, { headers: CORS_HEADERS });
    }

    const id = randomUUID();
    // Update the INSERT statement to include dialect
    db.prepare(
      `INSERT INTO speakers (id, name, birth_year, dialect) VALUES (?, ?, ?, ?)`,
    ).run(id, name, birthYear, dialect || null);

    return NextResponse.json({ id }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Local speaker lookup/insert failed:", error);
    return NextResponse.json(
      { error: "Failed to create speaker." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLocalDb } from "@/lib/local-db";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Local SQLite fallback for when Supabase isn't configured. Finds an
 * existing speaker by name + favorite food (case/whitespace-insensitive),
 * or registers a new one, mirroring the Supabase `speakers` table schema.
 */
export async function POST(request: NextRequest) {
  try {
    const { name, favoriteFood } = await request.json();

    if (!name || !favoriteFood) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const db = getLocalDb();
    const existing = db
      .prepare(
        `SELECT id FROM speakers WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(favorite_food)) = lower(trim(?))`
      )
      .get(name, favoriteFood) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json({ id: existing.id }, { headers: CORS_HEADERS });
    }

    const id = randomUUID();
    db.prepare(`INSERT INTO speakers (id, name, favorite_food) VALUES (?, ?, ?)`).run(
      id,
      name,
      favoriteFood
    );

    return NextResponse.json({ id }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Local speaker lookup/insert failed:", error);
    return NextResponse.json(
      { error: "Failed to create speaker." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

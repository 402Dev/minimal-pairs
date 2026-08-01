import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getLocalDb } from "@/lib/local-db";
import { PROMPTS_TABLE } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Prompt } from "@/lib/types";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/** All prompts across all languages, ordered for easy scanning/editing. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from(PROMPTS_TABLE)
      .select("id, language, word_or_phrase, sequence_order")
      .order("language", { ascending: true })
      .order("sequence_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prompts: data ?? [] });
  }

  const db = getLocalDb();
  const prompts = db
    .prepare(
      `SELECT id, language, word_or_phrase, sequence_order
       FROM prompts
       ORDER BY language ASC, sequence_order ASC`
    )
    .all() as Prompt[];
  return NextResponse.json({ prompts });
}

/**
 * Adds a new prompt to a language. If `sequence_order` is omitted, it's
 * assigned automatically as the next number after the language's current
 * highest, so the developer can just supply the word and language.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  const wordOrPhrase = typeof body?.word_or_phrase === "string" ? body.word_or_phrase.trim() : "";
  let sequenceOrder = Number.isFinite(body?.sequence_order) ? Number(body.sequence_order) : null;

  if (!language || !wordOrPhrase) {
    return NextResponse.json({ error: "language and word_or_phrase are required." }, { status: 400 });
  }

  if (supabaseAdmin) {
    if (sequenceOrder === null) {
      const { data: maxRow } = await supabaseAdmin
        .from(PROMPTS_TABLE)
        .select("sequence_order")
        .ilike("language", language)
        .order("sequence_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sequenceOrder = (maxRow?.sequence_order ?? 0) + 1;
    }

    const { data, error } = await supabaseAdmin
      .from(PROMPTS_TABLE)
      .insert({ language, word_or_phrase: wordOrPhrase, sequence_order: sequenceOrder })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prompt: data }, { status: 201 });
  }

  const db = getLocalDb();
  if (sequenceOrder === null) {
    const { maxOrder } = db
      .prepare(`SELECT MAX(sequence_order) as maxOrder FROM prompts WHERE lower(language) = lower(?)`)
      .get(language) as { maxOrder: number | null };
    sequenceOrder = (maxOrder ?? 0) + 1;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO prompts (id, language, word_or_phrase, sequence_order) VALUES (?, ?, ?, ?)`
  ).run(id, language, wordOrPhrase, sequenceOrder);

  return NextResponse.json(
    { prompt: { id, language, word_or_phrase: wordOrPhrase, sequence_order: sequenceOrder } },
    { status: 201 }
  );
}

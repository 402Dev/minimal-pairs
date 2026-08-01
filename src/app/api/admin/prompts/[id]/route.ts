import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getLocalDb } from "@/lib/local-db";
import { PROMPTS_TABLE } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Edits a prompt's word/phrase, language, or sequence position. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const updates: Record<string, string | number> = {};
  if (typeof body?.language === "string" && body.language.trim()) updates.language = body.language.trim();
  if (typeof body?.word_or_phrase === "string" && body.word_or_phrase.trim())
    updates.word_or_phrase = body.word_or_phrase.trim();
  if (Number.isFinite(body?.sequence_order)) updates.sequence_order = Number(body.sequence_order);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from(PROMPTS_TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prompt: data });
  }

  const db = getLocalDb();
  const fields = Object.keys(updates);
  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  db.prepare(`UPDATE prompts SET ${setClause} WHERE id = ?`).run(
    ...fields.map((field) => updates[field]),
    id
  );
  const prompt = db.prepare(`SELECT * FROM prompts WHERE id = ?`).get(id);
  return NextResponse.json({ prompt });
}

/**
 * Deletes a prompt. Refuses (409) if any recordings still reference it —
 * delete those recordings first rather than silently orphaning them.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const { id } = await params;

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from(PROMPTS_TABLE).delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "This prompt has recordings attached. Delete those first." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const db = getLocalDb();
  try {
    db.prepare(`DELETE FROM prompts WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      return NextResponse.json(
        { error: "This prompt has recordings attached. Delete those first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to delete prompt." }, { status: 500 });
  }
}

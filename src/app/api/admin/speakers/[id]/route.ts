import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getLocalDb } from "@/lib/local-db";
import { SPEAKERS_TABLE } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Deletes a speaker. Refuses (409) if they have recordings attached —
 * delete those recordings first rather than silently orphaning them.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const { id } = await params;

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from(SPEAKERS_TABLE).delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "This speaker has recordings attached. Delete those first." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const db = getLocalDb();
  try {
    db.prepare(`DELETE FROM speakers WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      return NextResponse.json(
        { error: "This speaker has recordings attached. Delete those first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to delete speaker." }, { status: 500 });
  }
}

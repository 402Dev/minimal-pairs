import { unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { getLocalDb } from "@/lib/local-db";
import { AUDIO_BUCKET, RECORDINGS_TABLE } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Deletes a recording's row and its underlying audio file. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const { id } = await params;

  if (supabaseAdmin) {
    const { data: recording, error: fetchError } = await supabaseAdmin
      .from(RECORDINGS_TABLE)
      .select("audio_path")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin.from(RECORDINGS_TABLE).delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (recording?.audio_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .remove([recording.audio_path]);
      if (storageError) {
        console.error("Failed to remove audio file from storage:", storageError.message);
      }
    }

    return NextResponse.json({ ok: true });
  }

  const db = getLocalDb();
  const recording = db.prepare(`SELECT audio_path FROM recordings WHERE id = ?`).get(id) as
    | { audio_path: string }
    | undefined;

  db.prepare(`DELETE FROM recordings WHERE id = ?`).run(id);

  if (recording?.audio_path?.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", recording.audio_path);
    await unlink(filePath).catch((error) => {
      console.error("Failed to remove local audio file:", error);
    });
  }

  return NextResponse.json({ ok: true });
}

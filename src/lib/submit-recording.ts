import { AUDIO_BUCKET, RECORDINGS_TABLE, SPEAKERS_TABLE, supabase } from "@/lib/supabase";

interface SubmitRecordingArgs {
  audioBlob: Blob;
  mimeType: string;
  speakerId: string;
  promptId: string;
}

/**
 * Thrown when the given speakerId no longer exists in the database (e.g.
 * an admin deleted the speaker, or a local dev database was reset while
 * the browser still had an old speaker_id in localStorage). Callers
 * should catch this specifically and restart onboarding rather than
 * showing a generic error forever.
 */
export class InvalidSpeakerError extends Error {
  constructor() {
    super("Speaker not found.");
    this.name = "InvalidSpeakerError";
  }
}

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Uploads the audio blob and inserts the recording row, linking the
 * speaker and prompt. Uses Supabase when configured; otherwise falls
 * back to the local /api/upload + /api/recordings routes (disk storage
 * + SQLite) for local development.
 */
export async function submitRecording({
  audioBlob,
  mimeType,
  speakerId,
  promptId,
}: SubmitRecordingArgs): Promise<void> {
  if (supabase) {
    const filename = `${crypto.randomUUID()}.${extensionFromMime(mimeType)}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(filename, audioBlob, { contentType: mimeType });

    if (uploadError || !uploadData) {
      throw new Error(uploadError?.message ?? "Upload failed.");
    }

    const { error: insertError } = await supabase.from(RECORDINGS_TABLE).insert({
      speaker_id: speakerId,
      prompt_id: promptId,
      audio_path: uploadData.path,
    });

    if (insertError) {
      // Postgres foreign_key_violation — figure out whether it's the
      // speaker (stale localStorage) rather than surfacing a raw DB
      // error to the user.
      if (insertError.code === "23503") {
        const { data: speaker } = await supabase
          .from(SPEAKERS_TABLE)
          .select("id")
          .eq("id", speakerId)
          .maybeSingle();
        if (!speaker) {
          throw new InvalidSpeakerError();
        }
      }
      throw new Error(insertError.message);
    }
    return;
  }

  // Local fallback: disk storage + SQLite.
  const formData = new FormData();
  formData.append("audio", audioBlob, `recording.${extensionFromMime(mimeType)}`);

  const uploadResponse = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!uploadResponse.ok) {
    throw new Error("Upload failed.");
  }
  const { path: audioPath } = await uploadResponse.json();

  const insertResponse = await fetch("/api/recordings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speakerId, promptId, audioPath }),
  });
  if (!insertResponse.ok) {
    const body = await insertResponse.json().catch(() => ({}));
    if (body.code === "SPEAKER_NOT_FOUND") {
      throw new InvalidSpeakerError();
    }
    throw new Error(body.error ?? "Failed to save recording.");
  }
}

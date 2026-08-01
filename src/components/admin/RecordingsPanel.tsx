"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

interface AdminRecording {
  id: string;
  createdAt: string;
  audioUrl: string;
  speaker: { id: string; name: string; birthYear: string } | null;
  prompt: { id: string; language: string; wordOrPhrase: string } | null;
}

/** Every recording with an inline audio player and delete control. */
export default function RecordingsPanel() {
  const [recordings, setRecordings] = useState<AdminRecording[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/recordings")
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) {
          setError(body.error ?? "Failed to load recordings.");
          return;
        }
        setRecordings(body.recordings);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load recordings.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleDelete(id: string) {
    setError(null);
    const response = await fetch(`/api/admin/recordings/${id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Failed to delete recording.");
      return;
    }
    reload();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!recordings ? (
        <p className="text-sm text-[#8C827A]">Loading…</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-[#8C827A]">No recordings yet.</p>
      ) : (
        <ul className="divide-y divide-[#E8E2D9] dark:divide-[#2A2624] border-y border-[#E8E2D9] dark:border-[#2A2624]">
          {recordings.map((recording) => (
            <li key={recording.id} className="flex flex-wrap items-center gap-4 py-3 text-sm">
              <div className="min-w-[8rem]">
                <div className="font-medium text-[#2C2825] dark:text-[#EDE8E1]">
                  {recording.prompt?.wordOrPhrase ?? "—"}
                </div>
                <div className="text-xs text-[#8C827A]">{recording.prompt?.language ?? "—"}</div>
              </div>
              <div className="min-w-[8rem] text-xs text-[#8C827A]">
                {recording.speaker?.name ?? "—"}
                <span className="text-[#8C827A]/40"> · </span>
                {recording.speaker?.birthYear ?? "—"}
              </div>
              <audio controls src={recording.audioUrl} className="h-8 flex-1 min-w-[12rem]" />
              <span className="text-xs text-[#8C827A]">
                {new Date(recording.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(recording.id)}
                aria-label="Delete recording"
                className="text-[#8C827A]/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

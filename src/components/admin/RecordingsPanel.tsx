"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

interface AdminRecording {
  id: string;
  createdAt: string;
  audioUrl: string;
  speaker: { id: string; name: string; favoriteFood: string } | null;
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
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!recordings ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : recordings.length === 0 ? (
        <p className="text-sm text-neutral-400">No recordings yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
          {recordings.map((recording) => (
            <li key={recording.id} className="flex flex-wrap items-center gap-4 py-3 text-sm">
              <div className="min-w-[8rem]">
                <div className="font-medium">{recording.prompt?.wordOrPhrase ?? "—"}</div>
                <div className="text-xs text-neutral-400">{recording.prompt?.language ?? "—"}</div>
              </div>
              <div className="min-w-[8rem] text-xs text-neutral-500">
                {recording.speaker?.name ?? "—"}
                <span className="text-neutral-300"> · </span>
                {recording.speaker?.favoriteFood ?? "—"}
              </div>
              <audio controls src={recording.audioUrl} className="h-8 flex-1 min-w-[12rem]" />
              <span className="text-xs text-neutral-400">
                {new Date(recording.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(recording.id)}
                aria-label="Delete recording"
                className="text-neutral-300 hover:text-red-600"
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

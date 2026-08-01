"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

interface AdminSpeaker {
  id: string;
  name: string;
  birthYear: string;
  createdAt: string;
  recordingCount: number;
}

/** Every speaker with their recording count and a delete control. */
export default function SpeakersPanel() {
  const [speakers, setSpeakers] = useState<AdminSpeaker[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/speakers")
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) {
          setError(body.error ?? "Failed to load speakers.");
          return;
        }
        setSpeakers(body.speakers);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load speakers.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleDelete(id: string) {
    setError(null);
    const response = await fetch(`/api/admin/speakers/${id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Failed to delete speaker.");
      return;
    }
    reload();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!speakers ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : speakers.length === 0 ? (
        <p className="text-sm text-neutral-400">No speakers yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
          {speakers.map((speaker) => (
            <li key={speaker.id} className="flex items-center gap-4 py-3 text-sm">
              <div className="min-w-[8rem] font-medium">{speaker.name}</div>
              <div className="min-w-[8rem] text-xs text-neutral-500">{speaker.birthYear}</div>
              <div className="text-xs text-neutral-400">{speaker.recordingCount} recordings</div>
              <span className="flex-1 text-right text-xs text-neutral-400">
                {new Date(speaker.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(speaker.id)}
                aria-label="Delete speaker"
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

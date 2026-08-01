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
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!speakers ? (
        <p className="text-sm text-[#8C827A]">Loading…</p>
      ) : speakers.length === 0 ? (
        <p className="text-sm text-[#8C827A]">No speakers yet.</p>
      ) : (
        <ul className="divide-y divide-[#E8E2D9] dark:divide-[#2A2624] border-y border-[#E8E2D9] dark:border-[#2A2624]">
          {speakers.map((speaker) => (
            <li key={speaker.id} className="flex items-center gap-4 py-3 text-sm">
              <div className="min-w-[8rem] font-medium text-[#2C2825] dark:text-[#EDE8E1]">
                {speaker.name}
              </div>
              <div className="min-w-[8rem] text-xs text-[#8C827A]">{speaker.birthYear}</div>
              <div className="text-xs text-[#8C827A]">{speaker.recordingCount} recordings</div>
              <span className="flex-1 text-right text-xs text-[#8C827A]">
                {new Date(speaker.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(speaker.id)}
                aria-label="Delete speaker"
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

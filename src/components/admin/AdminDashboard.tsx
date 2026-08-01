"use client";

import { useState } from "react";
import PromptsPanel from "@/components/admin/PromptsPanel";
import RecordingsPanel from "@/components/admin/RecordingsPanel";
import SpeakersPanel from "@/components/admin/SpeakersPanel";

type Tab = "prompts" | "recordings" | "speakers";

const TABS: { id: Tab; label: string }[] = [
  { id: "prompts", label: "Prompts" },
  { id: "recordings", label: "Recordings" },
  { id: "speakers", label: "Speakers" },
];

/** Full CRUD control center for the developer: prompts, recordings, speakers. */
export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("prompts");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <h1 className="text-sm font-semibold tracking-wide">Admin</h1>
        <nav className="flex gap-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm ${
                tab === t.id ? "font-semibold text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="text-sm text-neutral-400 hover:text-neutral-600">
          Log out
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {tab === "prompts" && <PromptsPanel />}
        {tab === "recordings" && <RecordingsPanel />}
        {tab === "speakers" && <SpeakersPanel />}
      </div>
    </main>
  );
}

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
    <main className="min-h-dvh bg-[#FDFBF7] dark:bg-[#181615] text-[#2C2825] dark:text-[#EDE8E1] transition-colors duration-300">
      <header className="flex items-center justify-between border-b border-[#D8D2C9] dark:border-[#383330] px-6 py-4">
        <h1 className="text-sm font-semibold tracking-wide text-[#2C2825] dark:text-[#EDE8E1]">Admin</h1>
        <nav className="flex gap-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm transition-colors duration-200 ${
                tab === t.id
                  ? "font-semibold text-[#2C2825] dark:text-[#EDE8E1]"
                  : "text-[#8C827A] hover:text-[#2C2825] dark:hover:text-[#EDE8E1]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          onClick={logout}
          className="text-sm text-[#8C827A] hover:text-[#2C2825] dark:hover:text-[#EDE8E1] transition-colors duration-200"
        >
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

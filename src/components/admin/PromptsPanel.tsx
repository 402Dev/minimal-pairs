"use client";

import { FormEvent, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Prompt } from "@/lib/types";

/** Prompts grouped by language, in sequence order. */
export default function PromptsPanel() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("");
  const [word, setWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/prompts")
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) {
          setError(body.error ?? "Failed to load prompts.");
          return;
        }
        setPrompts(body.prompts);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load prompts.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!language.trim() || !word.trim()) return;
    setAdding(true);
    setError(null);

    const response = await fetch("/api/admin/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: language.trim(), word_or_phrase: word.trim() }),
    });
    const body = await response.json();
    setAdding(false);

    if (!response.ok) {
      setError(body.error ?? "Failed to add prompt.");
      return;
    }

    setWord("");
    reload();
  }

  async function handleDelete(id: string) {
    setError(null);
    const response = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Failed to delete prompt.");
      return;
    }
    reload();
  }

  async function handleWordEdit(id: string, currentWord: string) {
    const nextWord = window.prompt("Edit word / phrase", currentWord);
    if (nextWord === null || !nextWord.trim() || nextWord === currentWord) return;

    setError(null);
    const response = await fetch(`/api/admin/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_or_phrase: nextWord.trim() }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Failed to update prompt.");
      return;
    }
    reload();
  }

  const grouped = new Map<string, Prompt[]>();
  for (const prompt of prompts ?? []) {
    const list = grouped.get(prompt.language) ?? [];
    list.push(prompt);
    grouped.set(prompt.language, list);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-[#8C827A]">Language</label>
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Persian"
            className="border-b border-[#D8D2C9] dark:border-[#383330] bg-transparent py-1 text-[#2C2825] dark:text-[#EDE8E1] placeholder-[#8C827A]/50 outline-none transition-colors duration-200 focus:border-[#2C2825] dark:focus:border-[#EDE8E1]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#8C827A]">Word / phrase</label>
          <input
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="خر"
            className="border-b border-[#D8D2C9] dark:border-[#383330] bg-transparent py-1 text-[#2C2825] dark:text-[#EDE8E1] placeholder-[#8C827A]/50 outline-none transition-colors duration-200 focus:border-[#2C2825] dark:focus:border-[#EDE8E1]"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !language.trim() || !word.trim()}
          className="rounded-full bg-[#2C2825] dark:bg-[#EDE8E1] px-4 py-1.5 text-sm text-[#FDFBF7] dark:text-[#181615] transition-all duration-200 disabled:opacity-30"
        >
          Add prompt
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!prompts ? (
        <p className="text-sm text-[#8C827A]">Loading…</p>
      ) : grouped.size === 0 ? (
        <p className="text-sm text-[#8C827A]">No prompts yet.</p>
      ) : (
        Array.from(grouped.entries()).map(([lang, list]) => (
          <div key={lang}>
            <h2 className="mb-2 text-sm font-semibold text-[#2C2825] dark:text-[#EDE8E1]">{lang}</h2>
            <ul className="divide-y divide-[#E8E2D9] dark:divide-[#2A2624] border-y border-[#E8E2D9] dark:border-[#2A2624]">
              {list.map((prompt) => (
                <li key={prompt.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-[#8C827A] tabular-nums">{prompt.sequence_order}</span>
                  <button
                    onClick={() => handleWordEdit(prompt.id, prompt.word_or_phrase)}
                    className="flex-1 text-left text-[#2C2825] dark:text-[#EDE8E1] hover:underline"
                  >
                    {prompt.word_or_phrase}
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    aria-label="Delete prompt"
                    className="text-[#8C827A]/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

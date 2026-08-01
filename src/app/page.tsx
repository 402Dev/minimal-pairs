"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Minimal entry point: type a language and press Enter to go to its
 * recording page at /[language]. The recorder itself lives there.
 */
export default function Home() {
  const [language, setLanguage] = useState("");
  const router = useRouter();

  const go = () => {
    const trimmed = language.trim();
    if (!trimmed) return;
    router.push(`/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-xs">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">
            Language
          </span>
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full border-0 border-b-2 border-neutral-200 bg-transparent py-2 text-2xl font-medium text-neutral-900 placeholder-neutral-300 outline-none transition-colors focus:border-neutral-900"
          />
        </label>
      </div>
    </div>
  );
}

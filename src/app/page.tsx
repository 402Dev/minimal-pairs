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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FDFBF7] dark:bg-[#181615] px-6 text-[#2C2825] dark:text-[#EDE8E1] transition-colors duration-300">
      <div className="w-full max-w-xs">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-[#8C827A]">
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
            className="w-full border-0 border-b-2 border-[#D8D2C9] dark:border-[#383330] bg-transparent py-2 text-2xl font-medium text-[#2C2825] dark:text-[#EDE8E1] placeholder-[#8C827A]/50 outline-none transition-colors duration-300 ease-out focus:border-[#2C2825] dark:focus:border-[#EDE8E1]"
          />
        </label>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  findOrCreateSpeaker,
  searchSpeakersByName,
  type SpeakerMatch,
} from "@/lib/speakers";
import { setStoredSpeakerId } from "@/lib/session";
import { getTranslation } from "@/lib/i18n";

interface SpeakerIntakeFormProps {
  language: string;
  onComplete: (speakerId: string) => void;
}

/**
 * Frictionless soft-auth: name + the last two digits of your birth year
 * (Persian calendar), typed once, is used as a natural unique key to
 * recognize a returning speaker (see findOrCreateSpeaker). No passwords,
 * no accounts. All copy is shown in the visitor's own (native) language.
 *
 * As the visitor types their name, matching existing speakers are shown
 * below the field — tapping one signs them in immediately, so a returning
 * visitor never has to retype anything.
 */
export default function SpeakerIntakeForm({
  language,
  onComplete,
}: SpeakerIntakeFormProps) {
  const t = getTranslation(language);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [matches, setMatches] = useState<SpeakerMatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart =
    name.trim().length > 0 && /^\d{2}$/.test(birthYear.trim()) && !submitting;
  // Only show matches while the name field still qualifies for a lookup;
  // avoids clearing `matches` synchronously inside the effect below.
  const visibleMatches = name.trim().length >= 2 ? matches : [];

  // Debounced returning-visitor lookup by name, so the list of matches
  // stays cheap and doesn't race ahead of typing.
  useEffect(() => {
    const query = name.trim();
    if (query.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      searchSpeakersByName(query)
        .then((results) => {
          if (!cancelled) setMatches(results);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name]);

  const handlePickMatch = (speakerId: string) => {
    setStoredSpeakerId(speakerId);
    onComplete(speakerId);
  };

  const handleStart = async () => {
    if (!canStart) return;
    setSubmitting(true);
    setError(null);

    try {
      const speakerId = await findOrCreateSpeaker({
        name: name.trim(),
        birthYear: birthYear.trim(),
      });
      setStoredSpeakerId(speakerId);
      onComplete(speakerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FDFBF7] dark:bg-[#181615] px-6 text-[#2C2825] dark:text-[#EDE8E1] transition-colors duration-300">
      <div className="w-full max-w-xs">
        <div className="space-y-10">
          <div className="space-y-1 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-[#8C827A]">
              {t.endonym}
            </span>
          </div>

          <div className="space-y-6">
            <label className="block">
              <span className="mb-1 block text-sm tracking-wider font-medium uppercase tracking-widest text-[#8C827A]">
                {t.yourName}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                disabled={submitting}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full border-0 border-b-2 border-[#D8D2C9] dark:border-[#383330] bg-transparent py-2 text-2xl font-medium text-[#2C2825] dark:text-[#EDE8E1] placeholder-[#8C827A]/70 outline-none transition-colors duration-300 ease-out focus:border-[#2C2825] dark:focus:border-[#EDE8E1] disabled:opacity-40"
              />
            </label>

            {visibleMatches.length > 0 && !submitting && (
              <div className="space-y-2">
                <span className="block text-xs font-medium uppercase tracking-widest text-[#8C827A]">
                  {t.isThisYou}
                </span>
                <ul className="space-y-1">
                  {visibleMatches.map((match) => (
                    <li key={match.id}>
                      <button
                        type="button"
                        onClick={() => handlePickMatch(match.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-[#D8D2C9] dark:border-[#383330] px-4 py-3 text-left text-xl text-[#2C2825] dark:text-[#EDE8E1] transition-all duration-300 ease-out hover:bg-[#F4EFE6] dark:hover:bg-[#252220] active:scale-[0.98]">
                        <span>{match.name}</span>
                        <span className="text-[#8C827A]">
                          {match.birthYear}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm tracking-wider font-medium uppercase tracking-widest text-[#8C827A]">
                {t.birthYearQuestion}
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={birthYear}
                onChange={(e) =>
                  setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                disabled={submitting}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full border-0 border-b-2 border-[#D8D2C9] dark:border-[#383330] bg-transparent py-2 text-2xl font-medium tracking-widest text-[#2C2825] dark:text-[#EDE8E1] placeholder-[#8C827A]/70 outline-none transition-colors duration-300 ease-out focus:border-[#2C2825] dark:focus:border-[#EDE8E1] disabled:opacity-40"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="w-full rounded-full bg-[#2C2825] dark:bg-[#EDE8E1] py-4 text-xl font-medium text-[#FDFBF7] dark:text-[#181615] transition-all duration-300 ease-out active:scale-95 disabled:bg-[#E8E2D9] dark:disabled:bg-[#2A2624] disabled:text-[#8C827A]/60 shadow-sm">
            {submitting ? t.starting : t.start}
          </button>
        </div>
      </div>

      {error && (
        <p className="fixed bottom-8 left-1/2 -translate-x-1/2 text-sm text-[#8C827A]">
          {error}
        </p>
      )}
    </div>
  );
}

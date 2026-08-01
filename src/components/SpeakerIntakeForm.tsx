"use client";

import { useState } from "react";
import { findOrCreateSpeaker } from "@/lib/speakers";
import { setStoredSpeakerId } from "@/lib/session";
import { getTranslation } from "@/lib/i18n";

interface SpeakerIntakeFormProps {
  language: string;
  onComplete: (speakerId: string) => void;
}

/**
 * Frictionless soft-auth: name + favorite Iranian food, typed once, is
 * used as a natural unique key to recognize a returning speaker (see
 * findOrCreateSpeaker). No passwords, no accounts. All copy is shown in
 * the visitor's own (native) language.
 */
export default function SpeakerIntakeForm({ language, onComplete }: SpeakerIntakeFormProps) {
  const t = getTranslation(language);
  const [name, setName] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = name.trim().length > 0 && favoriteFood.trim().length > 0 && !submitting;

  const handleStart = async () => {
    if (!canStart) return;
    setSubmitting(true);
    setError(null);

    try {
      const speakerId = await findOrCreateSpeaker({
        name: name.trim(),
        favoriteFood: favoriteFood.trim(),
      });
      setStoredSpeakerId(speakerId);
      onComplete(speakerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-xs">
        <div className="space-y-10">
          <div className="space-y-1 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">
              {t.endonym}
            </span>
          </div>

          <div className="space-y-6">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">
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
                className="w-full border-0 border-b-2 border-neutral-200 bg-transparent py-2 text-2xl font-medium text-neutral-900 placeholder-neutral-300 outline-none transition-colors focus:border-neutral-900 disabled:opacity-40"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">
                {t.favoriteFoodQuestion}
              </span>
              <input
                type="text"
                value={favoriteFood}
                onChange={(e) => setFavoriteFood(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                disabled={submitting}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full border-0 border-b-2 border-neutral-200 bg-transparent py-2 text-2xl font-medium text-neutral-900 placeholder-neutral-300 outline-none transition-colors focus:border-neutral-900 disabled:opacity-40"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="w-full rounded-full bg-neutral-900 py-4 text-lg font-medium text-white transition-all active:scale-95 disabled:bg-neutral-100 disabled:text-neutral-300"
          >
            {submitting ? t.starting : t.start}
          </button>
        </div>
      </div>

      {error && (
        <p className="fixed bottom-8 left-1/2 -translate-x-1/2 text-sm text-neutral-500">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import SpeakerIntakeForm from "@/components/SpeakerIntakeForm";
import RecorderForm from "@/components/RecorderForm";
import { clearStoredSpeakerId, getStoredSpeakerId } from "@/lib/session";
import { getCompletedPromptIds } from "@/lib/recordings-status";
import { getSpeakerDetails } from "@/lib/speakers";
import { seededShuffle } from "@/lib/shuffle";
import type { Prompt } from "@/lib/types";

interface LanguageSessionProps {
  language: string;
  prompts: Prompt[];
}

function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return null;
}

export default function LanguageSession({
  language,
  prompts,
}: LanguageSessionProps) {
  const [storedSpeakerId, setStoredSpeakerIdState] = useState<string | null>(
    null,
  );
  const [isChecking, setIsChecking] = useState(true);
  const [newSpeakerId, setNewSpeakerId] = useState<string | null>(null);

  const speakerId = newSpeakerId ?? storedSpeakerId;
  const [remainingPrompts, setRemainingPrompts] = useState<Prompt[] | null>(
    null,
  );
  const [speakerName, setSpeakerName] = useState<string | null>(null);
  const [initialCompletedCount, setInitialCompletedCount] = useState<number>(0);

  // Read language-specific storage on mount
  useEffect(() => {
    setStoredSpeakerIdState(getStoredSpeakerId(language));
    setIsChecking(false);
  }, [language]);

  const shuffledPrompts = useMemo(
    () =>
      speakerId ? seededShuffle(prompts, `${language}:${speakerId}`) : prompts,
    [prompts, language, speakerId],
  );

  function handleInvalidSpeaker() {
    clearStoredSpeakerId(language); // <-- Pass language
    setNewSpeakerId(null);
    setRemainingPrompts(null);
    setSpeakerName(null);
    setInitialCompletedCount(0);
  }

  useEffect(() => {
    if (!speakerId) return;
    let cancelled = false;

    (async () => {
      try {
        const [details, completedIds] = await Promise.all([
          getSpeakerDetails(speakerId),
          getCompletedPromptIds(speakerId),
        ]);
        if (cancelled) return;

        if (!details) {
          handleInvalidSpeaker();
          return;
        }

        // Fix #1: Calculate completed count ONLY for prompts in this language
        const currentLangPromptIds = new Set(prompts.map((p) => p.id));
        let completedForThisLang = 0;
        completedIds.forEach((id) => {
          if (currentLangPromptIds.has(id)) completedForThisLang++;
        });

        setSpeakerName(details.name);
        setInitialCompletedCount(completedForThisLang);
        setRemainingPrompts(
          shuffledPrompts.filter((prompt) => !completedIds.has(prompt.id)),
        );
      } catch (err) {
        console.error("Failed to load recording history:", err);
        if (!cancelled) setRemainingPrompts(shuffledPrompts);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [speakerId, shuffledPrompts, prompts, language]);

  if (isChecking) {
    return (
      <div className="min-h-dvh bg-[#FDFBF7] dark:bg-[#181615] transition-colors" />
    );
  }

  if (!speakerId) {
    return (
      <SpeakerIntakeForm language={language} onComplete={setNewSpeakerId} />
    );
  }

  if (!remainingPrompts) {
    return (
      <div className="min-h-dvh bg-[#FDFBF7] dark:bg-[#181615] transition-colors" />
    );
  }

  return (
    <RecorderForm
      language={language}
      prompts={remainingPrompts}
      speakerId={speakerId}
      speakerName={speakerName}
      initialCompletedCount={initialCompletedCount}
      onInvalidSpeaker={handleInvalidSpeaker}
      onChangeUser={handleInvalidSpeaker}
    />
  );
}

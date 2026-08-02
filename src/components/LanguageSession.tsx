"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  const storedSpeakerId = useSyncExternalStore(
    subscribe,
    getStoredSpeakerId,
    getServerSnapshot,
  );
  const [newSpeakerId, setNewSpeakerId] = useState<string | null>(null);
  const speakerId = newSpeakerId ?? storedSpeakerId;

  const [remainingPrompts, setRemainingPrompts] = useState<Prompt[] | null>(
    null,
  );
  const [speakerName, setSpeakerName] = useState<string | null>(null);
  const [initialCompletedCount, setInitialCompletedCount] = useState<number>(0);

  // Shuffle once per speaker (seeded, so it's stable across reloads) rather
  // than serving every visitor the same fixed sequence_order — otherwise
  // minimal-pair "siblings" added back-to-back in the admin panel (e.g.
  // خر/خار) always land right next to each other.
  const shuffledPrompts = useMemo(
    () =>
      speakerId ? seededShuffle(prompts, `${language}:${speakerId}`) : prompts,
    [prompts, language, speakerId],
  );

  function handleInvalidSpeaker() {
    clearStoredSpeakerId();
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
        // Run both lookups concurrently instead of one-after-the-other —
        // halves the round-trip latency before the recorder can render.
        const [details, completedIds] = await Promise.all([
          getSpeakerDetails(speakerId),
          getCompletedPromptIds(speakerId),
        ]);
        if (cancelled) return;

        if (!details) {
          handleInvalidSpeaker();
          return;
        }
        setSpeakerName(details.name);
        setInitialCompletedCount(completedIds.size);
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
  }, [speakerId, shuffledPrompts]);

  if (!speakerId) {
    return (
      <SpeakerIntakeForm language={language} onComplete={setNewSpeakerId} />
    );
  }

  if (!remainingPrompts) {
    return <div className="min-h-dvh bg-white" />;
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

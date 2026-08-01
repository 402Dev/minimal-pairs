"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import SpeakerIntakeForm from "@/components/SpeakerIntakeForm";
import RecorderForm from "@/components/RecorderForm";
import { clearStoredSpeakerId, getStoredSpeakerId } from "@/lib/session";
import { getCompletedPromptIds } from "@/lib/recordings-status";
import { getSpeakerDetails } from "@/lib/speakers";
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

export default function LanguageSession({ language, prompts }: LanguageSessionProps) {
  const storedSpeakerId = useSyncExternalStore(subscribe, getStoredSpeakerId, getServerSnapshot);
  const [newSpeakerId, setNewSpeakerId] = useState<string | null>(null);
  const speakerId = newSpeakerId ?? storedSpeakerId;

  const [remainingPrompts, setRemainingPrompts] = useState<Prompt[] | null>(null);
  const [speakerName, setSpeakerName] = useState<string | null>(null);
  const [initialCompletedCount, setInitialCompletedCount] = useState<number>(0);

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
        const details = await getSpeakerDetails(speakerId);
        if (cancelled) return;
        if (!details) {
          handleInvalidSpeaker();
          return;
        }
        setSpeakerName(details.name);

        const completedIds = await getCompletedPromptIds(speakerId);
        if (cancelled) return;
        setInitialCompletedCount(completedIds.size);
        setRemainingPrompts(prompts.filter((prompt) => !completedIds.has(prompt.id)));
      } catch (err) {
        console.error("Failed to load recording history:", err);
        if (!cancelled) setRemainingPrompts(prompts);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [speakerId, prompts]);

  if (!speakerId) {
    return <SpeakerIntakeForm language={language} onComplete={setNewSpeakerId} />;
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
    />
  );
}

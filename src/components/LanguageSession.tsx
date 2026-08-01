"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import SpeakerIntakeForm from "@/components/SpeakerIntakeForm";
import RecorderForm from "@/components/RecorderForm";
import { clearStoredSpeakerId, getStoredSpeakerId } from "@/lib/session";
import { getCompletedPromptIds } from "@/lib/recordings-status";
import type { Prompt } from "@/lib/types";

interface LanguageSessionProps {
  language: string;
  prompts: Prompt[];
}

// localStorage never changes from outside this tab in ways we need to
// react to, so the subscription is a no-op; useSyncExternalStore still
// gives us a mismatch-safe way to read a browser-only value (null on
// the server, the real value once hydrated on the client).
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return null;
}

/**
 * Orchestrates the soft-auth gate: localStorage can only be read on the
 * client, so this client component checks for an existing speaker_id and
 * renders the intake form or the recorder accordingly. Once a speaker is
 * known, it also filters out any prompts they've already recorded, so a
 * returning visitor is never shown (or able to submit) the same prompt
 * twice.
 */
export default function LanguageSession({ language, prompts }: LanguageSessionProps) {
  const storedSpeakerId = useSyncExternalStore(subscribe, getStoredSpeakerId, getServerSnapshot);
  const [newSpeakerId, setNewSpeakerId] = useState<string | null>(null);
  const speakerId = newSpeakerId ?? storedSpeakerId;

  // null while the already-recorded lookup is in flight.
  const [remainingPrompts, setRemainingPrompts] = useState<Prompt[] | null>(null);

  useEffect(() => {
    if (!speakerId) return;
    let cancelled = false;

    getCompletedPromptIds(speakerId)
      .then((completedIds) => {
        if (cancelled) return;
        setRemainingPrompts(prompts.filter((prompt) => !completedIds.has(prompt.id)));
      })
      .catch((err) => {
        console.error("Failed to load recording history:", err);
        // Fail open: let the speaker keep recording rather than blocking
        // them entirely on a transient network error.
        if (!cancelled) setRemainingPrompts(prompts);
      });

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

  // If the server ever reports this speaker no longer exists (deleted via
  // the admin panel, or a stale id left over from a reset dev database),
  // clear it and drop back to onboarding instead of erroring forever.
  function handleInvalidSpeaker() {
    clearStoredSpeakerId();
    setNewSpeakerId(null);
    setRemainingPrompts(null);
  }

  return (
    <RecorderForm
      language={language}
      prompts={remainingPrompts}
      speakerId={speakerId}
      onInvalidSpeaker={handleInvalidSpeaker}
    />
  );
}

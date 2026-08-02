const SPEAKER_ID_KEY = "mp_speaker_id";

/**
 * Frictionless soft-auth: a speaker is identified purely by a UUID kept
 * in localStorage, set once after the intake form is completed. No
 * passwords, no accounts.
 */
// Append the language to the key so each language requires its own onboarding
export function getStoredSpeakerId(language: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`mp_speaker_id_${language.toLowerCase()}`);
}

export function setStoredSpeakerId(language: string, speakerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `mp_speaker_id_${language.toLowerCase()}`,
    speakerId,
  );
}

/**
 * Clears a stale/invalid speaker id (e.g. the speaker was deleted from
 * the admin panel, or a local dev database was reset) so the app can
 * gracefully fall back to onboarding again instead of erroring forever.
 */
export function clearStoredSpeakerId(language: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`mp_speaker_id_${language.toLowerCase()}`);
}

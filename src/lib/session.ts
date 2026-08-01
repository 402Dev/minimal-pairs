const SPEAKER_ID_KEY = "mp_speaker_id";

/**
 * Frictionless soft-auth: a speaker is identified purely by a UUID kept
 * in localStorage, set once after the intake form is completed. No
 * passwords, no accounts.
 */
export function getStoredSpeakerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SPEAKER_ID_KEY);
}

export function setStoredSpeakerId(speakerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPEAKER_ID_KEY, speakerId);
}

/**
 * Clears a stale/invalid speaker id (e.g. the speaker was deleted from
 * the admin panel, or a local dev database was reset) so the app can
 * gracefully fall back to onboarding again instead of erroring forever.
 */
export function clearStoredSpeakerId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SPEAKER_ID_KEY);
}

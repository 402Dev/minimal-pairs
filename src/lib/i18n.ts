/**
 * UI copy translated per visitor language. The app is used by native
 * speakers of many languages, so every label, button, and status message
 * is shown in the language being recorded — never English by default.
 */
export interface Translation {
  /** How the language refers to itself, shown in the header badge. */
  endonym: string;
  yourName: string;
  favoriteFoodQuestion: string;
  start: string;
  starting: string;
  allDone: string;
  noPromptsAvailable: (endonym: string) => string;
  tapToRecord: string;
  recordingTapToStop: string;
  saving: string;
  saved: string;
  startRecording: string;
  stopRecording: string;
  playRecording: string;
  pausePlayback: string;
  redoRecording: string;
  saveRecording: string;
  playBackRedoOrSave: string;
  somethingWrong: string;
}

const english: Translation = {
  endonym: "English",
  yourName: "Your name",
  favoriteFoodQuestion: "What's your favorite Iranian food?",
  start: "Start",
  starting: "Starting…",
  allDone: "All done. Thank you.",
  noPromptsAvailable: (endonym) => `No words available for ${endonym}.`,
  tapToRecord: "Tap to record",
  recordingTapToStop: "Recording — tap to stop",
  saving: "Saving…",
  saved: "Saved",
  startRecording: "Start recording",
  stopRecording: "Stop recording",
  playRecording: "Play recording",
  pausePlayback: "Pause playback",
  redoRecording: "Redo recording",
  saveRecording: "Save recording",
  playBackRedoOrSave: "Play back, redo, or save",
  somethingWrong: "Something went wrong.",
};

const persian: Translation = {
  endonym: "فارسی",
  yourName: "نام شما",
  favoriteFoodQuestion: "غذای ایرانی مورد علاقه‌ات چیست؟",
  start: "شروع",
  starting: "در حال شروع…",
  allDone: "تمام شد. سپاسگزاریم.",
  noPromptsAvailable: (endonym) => `هیچ واژه‌ای برای ${endonym} موجود نیست.`,
  tapToRecord: "برای ضبط ضربه بزن",
  recordingTapToStop: "در حال ضبط — برای توقف ضربه بزن",
  saving: "در حال ذخیره…",
  saved: "ذخیره شد",
  startRecording: "شروع ضبط",
  stopRecording: "توقف ضبط",
  playRecording: "پخش ضبط",
  pausePlayback: "توقف پخش",
  redoRecording: "ضبط دوباره",
  saveRecording: "ذخیره ضبط",
  playBackRedoOrSave: "پخش، ضبط دوباره یا ذخیره",
  somethingWrong: "مشکلی پیش آمد.",
};

const german: Translation = {
  endonym: "Deutsch",
  yourName: "Dein Name",
  favoriteFoodQuestion: "Was ist dein iranisches Lieblingsgericht?",
  start: "Start",
  starting: "Wird gestartet…",
  allDone: "Fertig. Danke.",
  noPromptsAvailable: (endonym) => `Keine Wörter für ${endonym} verfügbar.`,
  tapToRecord: "Zum Aufnehmen tippen",
  recordingTapToStop: "Aufnahme läuft — zum Stoppen tippen",
  saving: "Wird gespeichert…",
  saved: "Gespeichert",
  startRecording: "Aufnahme starten",
  stopRecording: "Aufnahme stoppen",
  playRecording: "Aufnahme abspielen",
  pausePlayback: "Wiedergabe pausieren",
  redoRecording: "Erneut aufnehmen",
  saveRecording: "Aufnahme speichern",
  playBackRedoOrSave: "Abspielen, erneut aufnehmen oder speichern",
  somethingWrong: "Etwas ist schiefgelaufen.",
};

const spanish: Translation = {
  endonym: "Español",
  yourName: "Tu nombre",
  favoriteFoodQuestion: "¿Cuál es tu comida iraní favorita?",
  start: "Empezar",
  starting: "Iniciando…",
  allDone: "Listo. Gracias.",
  noPromptsAvailable: (endonym) => `No hay palabras disponibles para ${endonym}.`,
  tapToRecord: "Toca para grabar",
  recordingTapToStop: "Grabando — toca para detener",
  saving: "Guardando…",
  saved: "Guardado",
  startRecording: "Iniciar grabación",
  stopRecording: "Detener grabación",
  playRecording: "Reproducir grabación",
  pausePlayback: "Pausar reproducción",
  redoRecording: "Repetir grabación",
  saveRecording: "Guardar grabación",
  playBackRedoOrSave: "Reproducir, repetir o guardar",
  somethingWrong: "Algo salió mal.",
};

const dutch: Translation = {
  endonym: "Nederlands",
  yourName: "Jouw naam",
  favoriteFoodQuestion: "Wat is jouw favoriete Iraanse gerecht?",
  start: "Start",
  starting: "Bezig met starten…",
  allDone: "Klaar. Bedankt.",
  noPromptsAvailable: (endonym) => `Geen woorden beschikbaar voor ${endonym}.`,
  tapToRecord: "Tik om op te nemen",
  recordingTapToStop: "Opname bezig — tik om te stoppen",
  saving: "Bezig met opslaan…",
  saved: "Opgeslagen",
  startRecording: "Opname starten",
  stopRecording: "Opname stoppen",
  playRecording: "Opname afspelen",
  pausePlayback: "Afspelen pauzeren",
  redoRecording: "Opnieuw opnemen",
  saveRecording: "Opname opslaan",
  playBackRedoOrSave: "Afspelen, opnieuw opnemen of opslaan",
  somethingWrong: "Er ging iets mis.",
};

/** Keyed by lowercase canonical language name. */
const TRANSLATIONS: Record<string, Translation> = {
  english: english,
  persian: persian,
  farsi: persian,
  german: german,
  spanish: spanish,
  dutch: dutch,
};

/** Case-insensitive lookup, falling back to English UI copy for unknown
 * languages — but always displaying the language's own name (not
 * "English") as the badge, since English is only a copy fallback. */
export function getTranslation(language: string): Translation {
  const found = TRANSLATIONS[language.trim().toLowerCase()];
  if (found) return found;
  const trimmed = language.trim();
  return trimmed ? { ...english, endonym: trimmed } : english;
}

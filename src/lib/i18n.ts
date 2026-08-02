/**
 * UI copy translated per visitor language. The app is used by native
 * speakers of many languages, so every label, button, and status message
 * is shown in the language being recorded — never English by default.
 */
export interface Translation {
  /** How the language refers to itself, shown in the header badge. */
  endonym: string;
  yourName: string;
  birthYearQuestion: string;
  isThisYou: string;
  start: string;
  starting: string;
  allDone: string;
  noPromptsAvailable: (endonym: string) => string;
  welcomeThankYou: (name: string) => string;
  recordedCount: (count: number) => string;
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
  birthYearQuestion: "Last two digits of your birth year",
  isThisYou: "Is this you?",
  start: "Start",
  starting: "Starting…",
  allDone: "All done. Thank you.",
  noPromptsAvailable: (endonym) => `No words available for ${endonym}.`,
  welcomeThankYou: (name) =>
    `Welcome, ${name}. Thank you for sharing your voice.`,
  recordedCount: (count) =>
    `${count} ${count === 1 ? "recording" : "recordings"} so far`,
  tapToRecord: "Tap to record",
  recordingTapToStop: "Recording — tap to stop",
  saving: "Saving…",
  saved: "Thank you — sample saved.",
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
  birthYearQuestion: "دو رقم آخر سال تولدت (تقویم شمسی)",
  isThisYou: "این خودتی؟",
  start: "شروع",
  starting: "در حال شروع…",
  allDone: "تمام شد. سپاسگزاریم.",
  noPromptsAvailable: (endonym) => `هیچ واژه‌ای برای ${endonym} موجود نیست.`,
  recordedCount: (count) => `تاکنون ${count} ضبط`,
  welcomeThankYou: (name) =>
    `خوش آمدی \u2068${name}\u2069. از اینکه صدایت را به اشتراک می‌گذاری سپاسگزاریم.`,
  tapToRecord: "برای ضبط ضربه بزن",
  recordingTapToStop: "در حال ضبط — برای توقف ضربه بزن",
  saving: "در حال ذخیره…",
  saved: "سپاسگزاریم — نمونه ذخیره شد.",
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
  birthYearQuestion: "Die letzten zwei Ziffern deines Geburtsjahres",
  isThisYou: "Bist du das?",
  start: "Start",
  starting: "Wird gestartet…",
  allDone: "Fertig. Danke.",
  noPromptsAvailable: (endonym) => `Keine Wörter für ${endonym} verfügbar.`,
  welcomeThankYou: (name) =>
    `Willkommen, ${name}. Danke, dass du deine Stimme teilst.`,
  recordedCount: (count) =>
    `Bisher ${count} ${count === 1 ? "Aufnahme" : "Aufnahmen"}`,
  tapToRecord: "Zum Aufnehmen tippen",
  recordingTapToStop: "Aufnahme läuft — zum Stoppen tippen",
  saving: "Wird gespeichert…",
  saved: "Danke — Aufnahme gespeichert.",
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
  birthYearQuestion: "Los últimos dos dígitos de tu año de nacimiento",
  isThisYou: "¿Eres tú?",
  start: "Empezar",
  starting: "Iniciando…",
  allDone: "Listo. Gracias.",
  noPromptsAvailable: (endonym) =>
    `No hay palabras disponibles para ${endonym}.`,
  welcomeThankYou: (name) =>
    `¡Bienvenido/a, ${name}! Gracias por compartir tu voz.`,
  recordedCount: (count) =>
    `${count} ${count === 1 ? "grabación" : "grabaciones"} hasta ahora`,
  tapToRecord: "Toca para grabar",
  recordingTapToStop: "Grabando — toca para detener",
  saving: "Guardando…",
  saved: "Gracias — muestra guardada.",
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
  birthYearQuestion: "Laatste twee cijfers van je geboortejaar",
  isThisYou: "Ben jij dit?",
  start: "Start",
  starting: "Bezig met starten…",
  allDone: "Klaar. Bedankt.",
  noPromptsAvailable: (endonym) => `Geen woorden beschikbaar voor ${endonym}.`,
  welcomeThankYou: (name) =>
    `Welkom, ${name}. Bedankt voor het delen van je stem.`,
  recordedCount: (count) =>
    `${count} ${count === 1 ? "opname" : "opnames"} tot nu toe`,
  tapToRecord: "Tik om op te nemen",
  recordingTapToStop: "Opname bezig — tik om te stoppen",
  saving: "Bezig met opslaan…",
  saved: "Bedankt — opname opgeslagen.",
  startRecording: "Opname starten",
  stopRecording: "Opname stoppen",
  playRecording: "Opname afspelen",
  pausePlayback: "Afspelen pauzeren",
  redoRecording: "Opnieuw opnemen",
  saveRecording: "Opname opslaan",
  playBackRedoOrSave: "Afspelen, opnieuw opnemen of opslaan",
  somethingWrong: "Er ging iets mis.",
};

/** Polish plural forms: 1 nagranie, 2–4 nagrania, 5+ (and 11–14) nagrań. */
function polishRecordingWord(count: number): string {
  if (count === 1) return "nagranie";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14))
    return "nagrania";
  return "nagrań";
}

const polish: Translation = {
  endonym: "Polski",
  yourName: "Twoje imię",
  birthYearQuestion: "Dwie ostatnie cyfry roku urodzenia",
  isThisYou: "Czy to Ty?",
  start: "Start",
  starting: "Rozpoczynanie…",
  allDone: "Gotowe. Dziękujemy.",
  noPromptsAvailable: (endonym) => `Brak dostępnych słów dla ${endonym}.`,
  welcomeThankYou: (name) =>
    `Witaj, ${name}. Dziękujemy za udostępnienie swojego głosu.`,
  recordedCount: (count) => `${count} ${polishRecordingWord(count)} dotychczas`,
  tapToRecord: "Dotknij, aby nagrać",
  recordingTapToStop: "Nagrywanie — dotknij, aby zatrzymać",
  saving: "Zapisywanie…",
  saved: "Dziękujemy — nagranie zapisane.",
  startRecording: "Rozpocznij nagrywanie",
  stopRecording: "Zatrzymaj nagrywanie",
  playRecording: "Odtwórz nagranie",
  pausePlayback: "Wstrzymaj odtwarzanie",
  redoRecording: "Nagraj ponownie",
  saveRecording: "Zapisz nagranie",
  playBackRedoOrSave: "Odtwórz, nagraj ponownie lub zapisz",
  somethingWrong: "Coś poszło nie tak.",
};

/** Keyed by lowercase canonical language name. */
const TRANSLATIONS: Record<string, Translation> = {
  english: english,
  persian: persian,
  farsi: persian,
  german: german,
  spanish: spanish,
  dutch: dutch,
  polish: polish,
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

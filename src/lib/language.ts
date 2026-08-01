/**
 * Decodes the raw `[language]` route segment into a display-friendly
 * language name, e.g. "native-persian" URL-encoding artifacts -> "Persian".
 */
export function decodeLanguage(rawSegment: string): string {
  return decodeURIComponent(rawSegment).trim();
}

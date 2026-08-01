/** A single word/phrase to be recorded, fetched in sequence for a language. */
export interface Prompt {
  id: string;
  language: string;
  word_or_phrase: string;
  sequence_order: number;
}

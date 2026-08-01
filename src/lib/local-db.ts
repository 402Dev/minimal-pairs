import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";

/**
 * Local SQLite fallback used only when Supabase env vars are not set.
 * Mirrors the Supabase Postgres schema (see ../../supabase.sql):
 *   speakers   — id, created_at, name, birth_year
 *   prompts    — id, language, word_or_phrase, sequence_order
 *   recordings — id, speaker_id, prompt_id, audio_path, created_at
 */
const dbPath = path.join(process.cwd(), "dev.db");

let db: Database.Database | null = null;

/** Seed prompts so the local fallback is usable without running mock-data.sql. */
const SEED_PROMPTS: Record<string, string[]> = {
  Persian: ["خر", "خار", "باد", "بات", "روز", "روس", "ساز", "ساس", "کارد", "کارت"],
  Farsi: ["شیر", "شور", "دار", "دور", "پر", "پل", "تیر", "تیز", "کور", "کوه"],
  German: ["Bahn", "Bann", "Miete", "Mitte", "Höhle", "Hölle", "Beet", "Bett", "Rate", "Ratte"],
};

function seedPrompts(database: Database.Database) {
  const { count } = database.prepare("SELECT COUNT(*) as count FROM prompts").get() as {
    count: number;
  };
  if (count > 0) return;

  const insert = database.prepare(
    `INSERT INTO prompts (id, language, word_or_phrase, sequence_order) VALUES (?, ?, ?, ?)`
  );
  const insertAll = database.transaction(() => {
    for (const [language, words] of Object.entries(SEED_PROMPTS)) {
      words.forEach((word, index) => {
        insert.run(randomUUID(), language, word, index + 1);
      });
    }
  });
  insertAll();
}

export function getLocalDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS speakers (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        name TEXT NOT NULL,
        birth_year TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS speakers_name_birth_year_key
        ON speakers (lower(trim(name)), lower(trim(birth_year)));

      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        word_or_phrase TEXT NOT NULL,
        sequence_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        speaker_id TEXT NOT NULL REFERENCES speakers(id),
        prompt_id TEXT NOT NULL REFERENCES prompts(id),
        audio_path TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE UNIQUE INDEX IF NOT EXISTS recordings_speaker_prompt_key
        ON recordings (speaker_id, prompt_id);
    `);
    seedPrompts(db);
  }
  return db;
}
